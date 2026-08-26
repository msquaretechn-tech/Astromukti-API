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
    addProductBanner,
    updateProductBanner,
    deleteProductBanner,
    addProductFaq,
    updateProductFaq,
    deleteProductFaq,
    reorderProductImages,
    deleteProductImage,
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

// Product Image Management Routes
router.route('/:id/reorder-images')
    .patch(verifyJWT, reorderProductImages);

router.route('/:id/delete-image')
    .delete(verifyJWT, deleteProductImage);

router.route('/:productId/variants/:variantId')
    .patch(upload.any(), updateProductVariant)

router.route('/:productId/related')
    .get(getRelatedProducts)

router.route('/:productId/reviews')
    .get(getProductReviews)
    .post(verifyJWT, createReview);

// Banners Routes
router.route('/:productId/banners')
    .post(verifyJWT, upload.single('bannerImage'), addProductBanner);

router.route('/:productId/banners/:bannerId')
    .patch(verifyJWT, upload.single('bannerImage'), updateProductBanner)
    .delete(verifyJWT, deleteProductBanner);

// FAQs Routes
router.route('/:productId/faqs')
    .post(verifyJWT, addProductFaq);

router.route('/:productId/faqs/:faqId')
    .patch(verifyJWT, updateProductFaq)
    .delete(verifyJWT, deleteProductFaq);

export default router;
