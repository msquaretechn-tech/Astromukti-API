import crypto from "crypto";
import { CallSession } from "../models/callSession.model.js";
import { Vendor } from "../models/vendor.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { mintRtcToken } from "../services/AgoraTokenGenerator.js";
import { logToFile } from "../utils/logger.js";
import { billCallSession } from "../services/CallBilling.js";

const randomAgoraUid = () => crypto.randomInt(1, 2 ** 31 - 1);

const isParticipant = (session, authId) => {
    const id = authId.toString();
    return session.userId.toString() === id || session.vendorId.toString() === id;
};

// Shared tail end for both a normal /end call and a server-initiated cutoff
// (insufficient balance mid-call) - computes duration, closes the session
// out, frees the vendor's activeCallSessionId lock, and bills it through the
// same single billing function everything else uses.
const finalizeSession = async (session, { endedBy, reason }) => {
    const endedAt = new Date();
    const lastAlive = session.lastHeartbeatAt || session.startedAt;
    const durationSeconds = Math.max(0, Math.round((lastAlive.getTime() - session.startedAt.getTime()) / 1000));

    session.status = "completed";
    session.endedAt = endedAt;
    session.endedBy = endedBy;
    session.disconnectReason = reason;
    session.durationSeconds = durationSeconds;
    await session.save();

    // Restore availability here too, not just activeCallSessionId - the app
    // itself does this on a clean end (see leave()/_endCallSession() on both
    // clients), but if the app crashed or was force-killed before it could
    // run that cleanup, this was the only place the vendor could ever come
    // back available again. Previously nothing did this server-side, so an
    // abnormal disconnect left the vendor permanently unbookable.
    await Vendor.findOneAndUpdate(
        { _id: session.vendorId, activeCallSessionId: session._id },
        { activeCallSessionId: null, isAudioCallAvailable: true, isVideoCallAvailable: true, isChatAvailable: true, isNowAvailable: true }
    );

    logToFile(`END | session=${session._id} channel=${session.channelId} status=completed duration=${durationSeconds}s by=${endedBy}`, "call");

    try {
        const billing = await billCallSession(session, { source: endedBy });
        logToFile(`BILLING | session=${session._id} channel=${session.channelId} result=${JSON.stringify(billing)}`, "call");
    } catch (err) {
        logToFile(`BILLING ERROR | session=${session._id} channel=${session.channelId} error=${err.message}`, "call");
        console.error("Billing failed for completed call session", session._id, err);
    }
};

// POST /api/call/start - customer initiates a call
export const startCall = asyncHandler(async (req, res) => {
    // req.auth is the raw User/Vendor document loaded by verifyJWT - neither
    // schema actually has a userType field (it only ever exists inside JWT
    // payloads/signing methods), so the model name is the reliable way to
    // tell which kind of principal this is.
    if (req.auth.constructor.modelName !== "User") {
        throw new ApiError(403, "Only customers can start a call");
    }

    const { vendorId, type } = req.body;
    if (!vendorId || !["audio", "video"].includes(type)) {
        throw new ApiError(400, "vendorId and a valid type (audio/video) are required");
    }

    const vendor = await Vendor.findById(vendorId).select(
        "activeCallSessionId isOnline isAudioCallAvailable isVideoCallAvailable callRate videoCallRate"
    );
    if (!vendor) {
        throw new ApiError(404, "Vendor not found");
    }
    if (vendor.activeCallSessionId) {
        throw new ApiError(409, "Vendor is already on another call");
    }
    const availableForType = type === "audio" ? vendor.isAudioCallAvailable : vendor.isVideoCallAvailable;
    if (!vendor.isOnline || !availableForType) {
        throw new ApiError(409, "Vendor is not available for this call type right now");
    }

    const rateSnapshot = type === "audio" ? vendor.callRate : vendor.videoCallRate;

    // Server-side balance gate - previously the only check was client-side
    // (the app's own wallet display deciding whether to let you tap "call"),
    // which the server never re-verified. A customer with nothing in their
    // wallet could still start and hold a full call, which CallBilling.js
    // would then correctly bill for whatever was available - in this case
    // nothing, so the astrologer's time was given away for free. Reject
    // before any session/token exists at all.
    const availableBalance = Number(req.auth.walletAmount);
    const hasFreeMinutes = Number(req.auth.freeMinutesRemaining) > 0;
    if (!hasFreeMinutes && availableBalance < rateSnapshot) {
        throw new ApiError(402, "Insufficient balance to start this call");
    }

    const channelId = crypto.randomUUID();
    const userUid = randomAgoraUid();
    const vendorUid = randomAgoraUid();

    const session = await CallSession.create({
        channelId,
        userId: req.auth._id,
        vendorId,
        type,
        agoraUid: { user: userUid, vendor: vendorUid },
        rateSnapshot,
    });

    await Vendor.findByIdAndUpdate(vendorId, { activeCallSessionId: session._id });

    const expireSeconds = 3600;
    const rtcToken = mintRtcToken({ channelName: channelId, uid: userUid, role: "publisher", tokenType: "uid", expireSeconds });

    logToFile(`START | session=${session._id} channel=${channelId} user=${req.auth._id} vendor=${vendorId} type=${type}`, "call");

    return res.status(201).json(new ApiResponse(201, {
        callSessionId: session._id,
        channelId,
        rtcToken,
        agoraUid: userUid,
        expiresAt: Date.now() + expireSeconds * 1000,
    }, "Call started"));
});

// POST /api/call/:channelId/joined - either party confirms the remote side joined
export const markJoined = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    const session = await CallSession.findOne({ channelId });
    if (!session) {
        throw new ApiError(404, "Call session not found");
    }
    if (!isParticipant(session, req.auth._id)) {
        throw new ApiError(403, "You are not a part of this call");
    }
    if (session.status === "ringing") {
        session.status = "ongoing";
        session.startedAt = new Date();
        session.lastHeartbeatAt = new Date();
        await session.save();
    } else if (session.status !== "ongoing") {
        throw new ApiError(409, `Call is no longer joinable (status: ${session.status})`);
    }

    logToFile(`JOINED | session=${session._id} channel=${channelId} by=${req.auth._id}`, "call");

    return res.status(200).json(new ApiResponse(200, session, "Call marked as ongoing"));
});

// POST /api/call/:channelId/heartbeat - periodic "still connected" signal
export const heartbeat = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    const session = await CallSession.findOne({ channelId }).select(
        "channelId userId vendorId type status startedAt lastHeartbeatAt rateSnapshot heartbeatCount"
    );
    if (!session) {
        throw new ApiError(404, "Call session not found");
    }
    if (!isParticipant(session, req.auth._id)) {
        throw new ApiError(403, "You are not a part of this call");
    }
    if (session.status !== "ongoing") {
        throw new ApiError(409, "Call is not ongoing");
    }

    session.lastHeartbeatAt = new Date();
    session.heartbeatCount = (session.heartbeatCount || 0) + 1;

    // Real-time drain check - the start-gate above only guarantees enough
    // balance to cover the first minute. A call can still run on past a
    // wallet emptying mid-call, since the final bill is only computed once
    // at /end. Check on every heartbeat (~15s) instead, using the same
    // minute-rounding as the real billing math, and force-end the moment
    // the accrued cost exceeds what the customer actually has - so a call
    // can drain to exactly what's affordable but never run further for free.
    const user = await User.findById(session.userId).select("walletAmount freeMinutesRemaining");
    if (user) {
        const elapsedMinutes = Math.max(1, Math.ceil((session.lastHeartbeatAt.getTime() - session.startedAt.getTime()) / 60000));
        // Free minutes (the new-user promo, shared across chat/call/video)
        // are applied before any rate math - they never generate a cost, so
        // they're subtracted from the elapsed count up front.
        const freeApplied = Math.min(elapsedMinutes, Number(user.freeMinutesRemaining) || 0);
        const billableMinutes = elapsedMinutes - freeApplied;
        const costSoFar = session.rateSnapshot * billableMinutes;
        const available = Number(user.walletAmount);
        if (costSoFar > available) {
            await finalizeSession(session, { endedBy: "insufficient_balance", reason: "Wallet exhausted mid-call" });
            return res.status(200).json(new ApiResponse(200, { callEnded: true, reason: "insufficient_balance" }, "Call ended - insufficient balance"));
        }
    }

    await session.save();

    return res.status(200).json(new ApiResponse(200, { callEnded: false }, "Heartbeat recorded"));
});

// POST /api/call/:channelId/end - either party ends the call
export const endCall = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    const { disconnectedBy, reason } = req.body;

    const session = await CallSession.findOne({ channelId });
    if (!session) {
        throw new ApiError(404, "Call session not found");
    }
    if (!isParticipant(session, req.auth._id)) {
        throw new ApiError(403, "You are not a part of this call");
    }

    if (session.status === "completed" || session.status === "missed" || session.status === "abandoned") {
        // Already resolved (e.g. by the other party, or a retry) - idempotent no-op.
        return res.status(200).json(new ApiResponse(200, session, "Call already ended"));
    }

    const endedBy = ["user", "vendor", "connection_lost", "agora_error"].includes(disconnectedBy) ? disconnectedBy : "user";

    if (!session.startedAt) {
        // Never actually connected - nothing to bill.
        session.status = "missed";
        session.endedAt = new Date();
        session.endedBy = endedBy;
        session.disconnectReason = reason;
        await session.save();
        await Vendor.findOneAndUpdate(
            { _id: session.vendorId, activeCallSessionId: session._id },
            { activeCallSessionId: null, isAudioCallAvailable: true, isVideoCallAvailable: true, isChatAvailable: true, isNowAvailable: true }
        );
        logToFile(`END | session=${session._id} channel=${channelId} status=missed by=${endedBy}`, "call");
        return res.status(200).json(new ApiResponse(200, session, "Call ended"));
    }

    // Bill immediately, right here, rather than waiting on the customer
    // app's own separate createTransaction call - that call still happens
    // and is harmless (it'll just find this transaction already made), but
    // it's no longer the only thing billing depends on.
    await finalizeSession(session, { endedBy, reason });

    return res.status(200).json(new ApiResponse(200, session, "Call ended"));
});

// GET /api/call/:channelId/token - mint a fresh RTC token for the caller's
// own side of this session. The customer already gets one back from /start;
// this exists primarily for the vendor, who never calls /start and has no
// other way to obtain a token for their own agoraUid before joining.
export const getCallToken = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    const session = await CallSession.findOne({ channelId }).select("userId vendorId agoraUid status");
    if (!session) {
        throw new ApiError(404, "Call session not found");
    }
    if (!isParticipant(session, req.auth._id)) {
        throw new ApiError(403, "You are not a part of this call");
    }
    if (["completed", "missed", "abandoned", "failed"].includes(session.status)) {
        throw new ApiError(409, "This call has already ended");
    }

    const isVendor = session.vendorId.toString() === req.auth._id.toString();
    const uid = isVendor ? session.agoraUid.vendor : session.agoraUid.user;

    const expireSeconds = 3600;
    const rtcToken = mintRtcToken({ channelName: channelId, uid, role: "publisher", tokenType: "uid", expireSeconds });

    return res.status(200).json(new ApiResponse(200, {
        rtcToken,
        agoraUid: uid,
        expiresAt: Date.now() + expireSeconds * 1000,
    }, "Token issued"));
});

// GET /api/call/:channelId - status check, for reconnect UX
export const getCallStatus = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    const session = await CallSession.findOne({ channelId });
    if (!session) {
        throw new ApiError(404, "Call session not found");
    }
    if (!isParticipant(session, req.auth._id)) {
        throw new ApiError(403, "You are not a part of this call");
    }

    return res.status(200).json(new ApiResponse(200, session, "Call session status"));
});
