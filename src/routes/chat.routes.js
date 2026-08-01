import { Router } from "express";
import {
    createOrGetAOneOnOneChat,
    getAllChats,
    searchAvailableUsers
} from "../controllers/chat.controller.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();


router.route('/')
    .get(verifyJWT, getAllChats)

router.route('/users')
    .get(verifyJWT, searchAvailableUsers)

router.route('/c/:receiverId')
    .post(verifyJWT, createOrGetAOneOnOneChat)


export default router;