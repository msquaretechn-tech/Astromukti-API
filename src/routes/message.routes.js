import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { mongoIdPathVariableValidator } from "../validators/common/mongodb.validators.js";
// import { validate } from "../validators/validate.js";
import { upload } from "../middlewares/multer.middleware.js"
import { getAllMessages, sendMessage, } from "../controllers/message.controller.js";
import { validate } from "../validators/validate.js";
import { sendMessageValidator } from "../validators/message.validators.js";

const router = Router();


router.use(verifyJWT);

router
    .route("/:chatId")
    .get(mongoIdPathVariableValidator("chatId"),  getAllMessages)
    .post(
        upload.fields([{ name: "attachments", maxCount: 5 }]),
        mongoIdPathVariableValidator("chatId"),
        sendMessageValidator(),
        validate,
        sendMessage
    );


export default router;