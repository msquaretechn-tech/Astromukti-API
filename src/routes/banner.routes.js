import express from 'express';
import {
    createBanner,
    getAllBanners,
    getBannerById,
    updateBannerById,
    deleteBannerById,
    createTestimonial,
    getAllTestimonials,
    getTestimonialById,
    updateTestimonialById,
    deleteTestimonialById,
    createFeedback,
    getAllFeedbacks
} from '../controllers/banner.controller.js';
import { upload } from '../middlewares/multer.middleware.js';
import { verifyJWT } from '../middlewares/auth.middlewares.js';


const router = express.Router();

router.route('/testimonial')
    .post(verifyJWT, createTestimonial)
    .get(verifyJWT, getAllTestimonials);

router.route('/testimonial/:id')
    .get(verifyJWT, getTestimonialById)
    .patch(verifyJWT, updateTestimonialById)
    .delete(verifyJWT, deleteTestimonialById);

router.route('/feedback')
    .post(verifyJWT, createFeedback)
    .get(verifyJWT, getAllFeedbacks);



router.route('/')
    .post(verifyJWT, upload.single('image'), createBanner)
    .get(verifyJWT, getAllBanners);

router.route('/:id')
    .get(verifyJWT, getBannerById)
    .patch(verifyJWT, upload.single('image'), updateBannerById)
    .delete(verifyJWT, deleteBannerById);

export default router;
