import { Router } from "express";
import {
    createOrGetAOneOnOneChat,
    endChat,
    getAllChats,
    searchAvailableUsers
} from "../controllers/chat.controller.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { mongoIdPathVariableValidator } from "../validators/common/mongodb.validators.js";
import { validate } from "../validators/validate.js";

const router = Router();


router.route('/')
    .get(verifyJWT, getAllChats)

router.route('/users')
    .get(verifyJWT, searchAvailableUsers)

router.route('/c/:receiverId')
    .post(verifyJWT, createOrGetAOneOnOneChat)

router.route('/end/:chatId')
    .post(verifyJWT, mongoIdPathVariableValidator("chatId"), validate, endChat)


export default router;