import { Router } from 'express';
import { addBlog, deleteBlog, updateBlog, getBlogs, addNews, getNews, updateNews, deleteNews } from "../controllers/blog.controller.js";
import { upload } from '../middlewares/multer.middleware.js';
import { verifyJWT } from '../middlewares/auth.middlewares.js';

const router = Router();

router.route("/")
    .get(verifyJWT, getBlogs)
    .post(verifyJWT, upload.single('image'), addBlog)

router.route("/news")
    .get(verifyJWT, getNews)
    .post(verifyJWT, upload.single('image'), addNews)

router.route("/:id")
    .patch(verifyJWT, upload.single('image'), updateBlog)
    .delete(verifyJWT, deleteBlog)

router.route("/news/:id")
    .patch(verifyJWT, upload.single('image'), updateNews)
    .delete(verifyJWT, deleteNews)


export default router;