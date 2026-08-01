import express from 'express';
import { addToCart, getCart, updateItem, removeItem, clearCart } from '../controllers/cart.controller.js';
import { verifyJWT } from '../middlewares/auth.middlewares.js';

const router = express.Router();

router.post('/add', verifyJWT, addToCart);
router.get('/', verifyJWT, getCart);
router.put('/item', verifyJWT, updateItem);
router.delete('/item/:productId', verifyJWT, removeItem);
router.delete('/', verifyJWT, clearCart);

export default router;
