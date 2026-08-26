import express from 'express';
import {
    createCategory,
    getAllCategories,
    getCategoryById,
    updateCategory,
    deleteCategory
} from '../controllers/category.controller.js';
import { upload } from '../middlewares/multer.middleware.js';
import { verifyJWT } from '../middlewares/auth.middlewares.js';

const router = express.Router();

router.route('/')
    .post(verifyJWT, upload.single('image'), createCategory)
    .get(getAllCategories);

router.route('/:id')
    .get(getCategoryById)
    .patch(verifyJWT, upload.single('image'), updateCategory)
    .delete(verifyJWT, deleteCategory);

export default router;
