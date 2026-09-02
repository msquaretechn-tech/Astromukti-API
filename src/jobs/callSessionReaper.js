import cron from 'node-cron';
import { CallSession } from '../models/callSession.model.js';
import { Vendor } from '../models/vendor.model.js';
import { logToFile } from '../utils/logger.js';
import { billCallSession } from '../services/CallBilling.js';

let task = null;
let isRunning = false;

// A "ringing" session that never got a single heartbeat within this window
// never actually connected - nothing to bill, just resolve it as missed.
const RINGING_TIMEOUT_SECONDS = Number(process.env.CALL_REAPER_RINGING_TIMEOUT_SECONDS) || 60;
// An "ongoing" session whose last heartbeat is older than this is treated as
// abandoned - the app was killed, crashed, or lost its connection without
// either side calling /end. 90s gives real heartbeat gaps (a dropped network
// blip) room before this fires; tune once both apps are actually heartbeating.
const ONGOING_TIMEOUT_SECONDS = Number(process.env.CALL_REAPER_ONGOING_TIMEOUT_SECONDS) || 90;

// Defaults ON (safe) - the reaper computes and logs what it WOULD bill
// without touching a wallet, until this is explicitly turned off after a
// review period. Only "false" (exact string) disables shadow mode.
const SHADOW_MODE = process.env.CALL_REAPER_SHADOW_MODE !== 'false';

async function reapMissedRinging(now) {
    const cutoff = new Date(now.getTime() - RINGING_TIMEOUT_SECONDS * 1000);
    const stale = await CallSession.find({
        status: 'ringing',
        ringingAt: { $lt: cutoff },
        heartbeatCount: 0,
    }).select('_id channelId vendorId');

    let count = 0;
    for (const session of stale) {
        // Conditional update guards against a race with the client's own
        // /end landing between our find() and this write.
        const updated = await CallSession.findOneAndUpdate(
            { _id: session._id, status: 'ringing' },
            { status: 'missed', endedAt: now, endedBy: 'system_reaper', disconnectReason: 'ringing_timeout' }
        );
        if (!updated) continue;

        await Vendor.findOneAndUpdate(
            { _id: session.vendorId, activeCallSessionId: session._id },
            { activeCallSessionId: null }
        );

        logToFile(`MISSED | session=${session._id} channel=${session.channelId} - never connected, no billing`, 'call-reaper');
        count++;
    }
    return count;
}

async function reapAbandonedOngoing(now) {
    const cutoff = new Date(now.getTime() - ONGOING_TIMEOUT_SECONDS * 1000);
    const stale = await CallSession.find({
        status: 'ongoing',
        lastHeartbeatAt: { $lt: cutoff },
    });

    let count = 0;
    for (const session of stale) {
        const durationSeconds = Math.max(
            0,
            Math.round((session.lastHeartbeatAt.getTime() - session.startedAt.getTime()) / 1000)
        );
        // Sanity net, not a hard block - never expected given the timeout
        // check above, but flag rather than silently trust a negative/zero
        // gap on a session that reached "ongoing".
        const isSuspicious = durationSeconds <= 0;

        const updated = await CallSession.findOneAndUpdate(
            { _id: session._id, status: 'ongoing' },
            {
                status: 'abandoned',
                endedAt: now,
                endedBy: 'system_reaper',
                disconnectReason: 'heartbeat_timeout',
                durationSeconds,
                isSuspicious,
            }
        );
        if (!updated) continue;

        await Vendor.findOneAndUpdate(
            { _id: session.vendorId, activeCallSessionId: session._id },
            { activeCallSessionId: null }
        );

        // findOneAndUpdate above returns the pre-update document (no
        // {new: true}) - reflect what was actually just written so
        // billCallSession sees a billable status and the right duration.
        session.status = 'abandoned';
        session.durationSeconds = durationSeconds;
        const billing = await billCallSession(session, { source: 'reaper', dryRun: SHADOW_MODE });
        logToFile(
            `ABANDONED | session=${session._id} channel=${session.channelId} duration=${durationSeconds}s suspicious=${isSuspicious} billing=${JSON.stringify(billing)}`,
            'call-reaper'
        );
        count++;
    }
    return count;
}

async function runReaper() {
    if (isRunning) {
        console.log('⚠️  callSessionReaper already running, skipping...');
        return;
    }
    isRunning = true;
    const now = new Date();

    try {
        const missedCount = await reapMissedRinging(now);
        const abandonedCount = await reapAbandonedOngoing(now);
        if (missedCount || abandonedCount) {
            logToFile(
                `RUN COMPLETE | missed=${missedCount} abandoned=${abandonedCount} shadowMode=${SHADOW_MODE}`,
                'call-reaper'
            );
        }
    } catch (err) {
        console.error('❌ callSessionReaper error:', err);
    } finally {
        isRunning = false;
    }
}

export function startCallSessionReaper() {
    if (task) return task;
    task = cron.schedule('* * * * *', runReaper);
    console.log(`🟢 callSessionReaper started (shadowMode=${SHADOW_MODE}, ringingTimeout=${RINGING_TIMEOUT_SECONDS}s, ongoingTimeout=${ONGOING_TIMEOUT_SECONDS}s)`);
    return task;
}

export function stopCallSessionReaper() {
    if (task) {
        try {
            task.stop();
        } catch (e) {
            // ignore
        }
        task = null;
    }
}

// Exported for direct/manual invocation (e.g. a one-off verification run) -
// the cron schedule above just calls this on a timer.
export { runReaper };
