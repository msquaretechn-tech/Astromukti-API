import { Router } from 'express';
import {
    addVideo,
    deleteVideo,
    getVideoById,
    getVideos,
    updateVideo
} from '../controllers/video.controller.js';
import { verifyJWT } from '../middlewares/auth.middlewares.js';


const router = Router();

router.route("/")
    .post(verifyJWT, addVideo)
    .get(verifyJWT, getVideos);

router.route('/:id')
    .get(verifyJWT, getVideoById)
    .patch(verifyJWT, updateVideo)
    .delete(verifyJWT, deleteVideo);

export default router;