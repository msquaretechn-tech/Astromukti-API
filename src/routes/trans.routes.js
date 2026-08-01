import express from 'express';
import {
    createTransaction,
    getAllTransactions,
    getTransactionById,
    updateTransactionById,
    deleteTransactionById,
    getTransactionsEarning,
    sendGift,
    fetchGiftTransactions,
    getMyEarnings,
    addWithdrawRequest,
    updateWithdrawRequest,
    getWithdrawals
} from '../controllers/trans.controller.js';
import { verifyJWT } from '../middlewares/auth.middlewares.js';

const router = express.Router();

router.route('/')
    .post(verifyJWT, createTransaction)
    .get(verifyJWT, getAllTransactions);

router.route('/gift/')
    .get(verifyJWT, fetchGiftTransactions)

router.route('/gift/:userId')
    .post(verifyJWT, sendGift)

router.route('/withdraw/')
    .get(verifyJWT, getWithdrawals)

router.route('/withdraw/:vendorId')
    .get(verifyJWT, getWithdrawals)
    .post(verifyJWT, addWithdrawRequest)
    .patch(verifyJWT, updateWithdrawRequest)

router.route('/:id')
    .get(verifyJWT, getTransactionById)
    .patch(verifyJWT, updateTransactionById)
    .delete(verifyJWT, deleteTransactionById);

router.route('/total-earning/:id')
    .get(verifyJWT, getTransactionsEarning)

/// FOR VENDOR
router.route('/my-earnings/:vendorId')
    .get(verifyJWT, getMyEarnings)

export default router;
