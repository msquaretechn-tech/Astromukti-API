import { User } from "../models/user.model.js";
import { Vendor } from "../models/vendor.model.js";
import { TransactionModel } from "../models/trans.model.js";
import { logToFile } from "../utils/logger.js";

// The single source of truth for billing a completed call session, ported
// from the sibling AstroHanumanta codebase's CallBilling.js. Unlike there,
// this app's User model has no free-promo-balance concept at all - the
// wallet is the only source of funds, so that branch of the math is dropped
// entirely rather than ported as dead code (see AstroMukti-FINDINGS.md M6
// for the pre-existing dead freePromoAmount references this deliberately
// does not carry forward).
// "completed" (explicit /end) and "abandoned" (the reaper's timeout path)
// both mean the call actually connected and has a final duration recorded -
// "missed" never connected at all, and "ringing"/"ongoing" haven't ended.
const BILLABLE_STATUSES = ["completed", "abandoned"];

export async function billCallSession(session, { source = "unknown", dryRun = false } = {}) {
    if (!BILLABLE_STATUSES.includes(session.status)) {
        return { billed: false, alreadyBilled: false, transaction: null, reason: "session_not_billable" };
    }

    // Idempotency first, before any computation - whichever caller gets
    // here first (endCall, the legacy createTransaction call the customer
    // app still makes, or the reaper) wins; everyone else gets the same
    // existing record back rather than a second charge.
    const existing = await TransactionModel.findOne({ callSessionId: session._id });
    if (existing) {
        logToFile(`ALREADY BILLED | session=${session._id} source=${source} existingTx=${existing._id}`, "trans");
        return { billed: false, alreadyBilled: true, transaction: existing, reason: null };
    }

    const [user, vendor] = await Promise.all([
        User.findById(session.userId).select("walletAmount freeMinutesRemaining"),
        Vendor.findById(session.vendorId).select("walletAmount commissionAmount callRate videoCallRate"),
    ]);

    if (!user || !vendor) {
        logToFile(`CANNOT BILL | session=${session._id} source=${source} reason=user_or_vendor_not_found`, "trans");
        return { billed: false, alreadyBilled: false, transaction: null, reason: "user_or_vendor_not_found" };
    }

    const rate = session.type === "video" ? vendor.videoCallRate : vendor.callRate;
    const minTime = Math.max(1, Math.ceil(session.durationSeconds / 60));

    // New-user promo: free minutes are applied before any rate math runs, so
    // the astrologer's 40/60 split below never pays out on the free portion
    // (the platform absorbs it, not the astrologer) - decision confirmed
    // with the client. `duration` on the Transaction stays the real total
    // call length; only the money math is reduced.
    const freeApplied = Math.min(minTime, Number(user.freeMinutesRemaining) || 0);
    const billableMinutes = minTime - freeApplied;
    const minAmount = rate * billableMinutes;

    const walletAmount = Number(user.walletAmount);

    let finalDeduction = minAmount;
    if (finalDeduction > walletAmount) {
        finalDeduction = walletAmount;
    }
    finalDeduction = Math.ceil(finalDeduction);

    logToFile(
        `BILLING COMPUTED | session=${session._id} source=${source} rate=${rate} minTime=${minTime} freeApplied=${freeApplied} billableMinutes=${billableMinutes} minAmount=${minAmount} finalDeduction=${finalDeduction} dryRun=${dryRun}`,
        "trans"
    );

    if (dryRun) {
        return { billed: false, alreadyBilled: false, transaction: null, reason: null, amount: finalDeduction, minTime, rate, dryRun: true };
    }

    // Create the Transaction row before touching any wallet. The unique
    // index on callSessionId makes this row our atomic claim on billing
    // this session - only the caller that successfully creates it proceeds
    // to move money, so a race between two callers (e.g. endCall firing at
    // nearly the same moment as the customer app's own createTransaction
    // call) can never double-debit a wallet, only double-attempt the same
    // insert.
    let transaction;
    try {
        transaction = await TransactionModel.create({
            userId: session.userId,
            vendorId: session.vendorId,
            status: "success",
            amount: finalDeduction,
            type: session.type,
            duration: minTime,
            callSessionId: session._id,
        });
    } catch (err) {
        if (err.code === 11000) {
            const raced = await TransactionModel.findOne({ callSessionId: session._id });
            logToFile(`RACE LOST | session=${session._id} source=${source} existingTx=${raced?._id}`, "trans");
            return { billed: false, alreadyBilled: true, transaction: raced, reason: "race_lost" };
        }
        throw err;
    }

    await User.findByIdAndUpdate(session.userId, {
        walletAmount: Math.max(0, walletAmount - finalDeduction).toFixed(2),
        freeMinutesRemaining: (Number(user.freeMinutesRemaining) || 0) - freeApplied,
    });
    await Vendor.findByIdAndUpdate(session.vendorId, {
        walletAmount: vendor.walletAmount + finalDeduction * 0.4,
        commissionAmount: vendor.commissionAmount + finalDeduction * 0.6,
    });

    logToFile(`BILLED | session=${session._id} source=${source} tx=${transaction._id} amount=${finalDeduction}`, "trans");
    return { billed: true, alreadyBilled: false, transaction, reason: null, amount: finalDeduction, minTime, rate };
}
