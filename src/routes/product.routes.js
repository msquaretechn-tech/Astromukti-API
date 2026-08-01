import express from 'express';
import {
    createProduct,
    getAllProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    updateProductVariant,
    createReview,
    getProductReviews,
    getRelatedProducts,
} from '../controllers/product.controller.js';
import { upload } from '../middlewares/multer.middleware.js';
import { verifyJWT } from '../middlewares/auth.middlewares.js';

const router = express.Router();

router.route('/')
    .post(verifyJWT, upload.any(), createProduct)
    .get(getAllProducts);

router.route('/:id')
    .get(getProductById)
    .patch(verifyJWT, upload.any(), updateProduct)
    .delete(verifyJWT, deleteProduct);

router.route('/:productId/variants/:variantId')
    .patch(upload.any(), updateProductVariant)

router.route('/:productId/related')
    .get(getRelatedProducts)

router.route('/:productId/reviews')
    .get(getProductReviews)
    .post(verifyJWT, createReview);

export default router;
