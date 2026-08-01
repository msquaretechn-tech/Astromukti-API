import express from 'express';
import {
    createOrder,
    getOrderHistory,
    getOrderById,
    updateOrderStatus,
    getAllOrdersAdmin
} from '../controllers/order.controller.js';
import { verifyJWT } from '../middlewares/auth.middlewares.js';

const router = express.Router();

router.use(verifyJWT); // Apply verifyJWT to all routes

router.get('/admin', getAllOrdersAdmin);

router.route('/')
    .post(createOrder)
    .get(getOrderHistory);

router.route('/:id')
    .get(getOrderById)
    .patch(updateOrderStatus);

export default router;
