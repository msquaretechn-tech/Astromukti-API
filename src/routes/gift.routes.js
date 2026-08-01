import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { addGift, deleteGift, fetchGifts } from "../controllers/gift.controller.js";
import { upload, uploadIcon } from "../middlewares/multer.middleware.js";

const router = Router();


router.route('/')
    .get(verifyJWT, fetchGifts)
    .post(verifyJWT, uploadIcon.single('icon'), addGift)

router.route('/:id')
    .delete(verifyJWT, deleteGift)


export default router;