import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { startCall, markJoined, heartbeat, endCall, getCallStatus, getCallToken } from "../controllers/call.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/start")
    .post(startCall);

router.route("/:channelId/token")
    .get(getCallToken);

router.route("/:channelId/joined")
    .post(markJoined);

router.route("/:channelId/heartbeat")
    .post(heartbeat);

router.route("/:channelId/end")
    .post(endCall);

router.route("/:channelId")
    .get(getCallStatus);

export default router;
