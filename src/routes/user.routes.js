import { Router } from 'express';
import {
    deleteUser,
    getUserById,
    getUsers,
    addUser,
    updateUser,
    addUserWalletAmount,
    getUserWalletHistory,
    getUserWalletAmount,
    getAstrogerInWaitingList,
    getFollowings,
    checkUserIsBlockedOrNot,
    addAddress,
    getAllAddresses,
    updateAddress,
    deleteAddress,
    getAllUsersWalletHistories
} from "../controllers/user.controller.js";
import { upload } from '../middlewares/multer.middleware.js';
import { verifyJWT } from '../middlewares/auth.middlewares.js';

const router = Router();



// Wallet 
router.route("/wallet")
    .get(getAllUsersWalletHistories)


router.route("/wallet/:userId")
    .get(verifyJWT, getUserWalletHistory)

// Wallet Amount 
router.route("/wallet-amount/:userId")
    .get(verifyJWT, getUserWalletAmount)
    .post(verifyJWT, addUserWalletAmount)
    

// Check User Is Blocked Or Not 
router.route("/isBlocked/:userId")
    .get(verifyJWT, checkUserIsBlockedOrNot)

// Astrologer Waiting 
router.route("/waiting/:userId")
    .get(verifyJWT, getAstrogerInWaitingList)

// Followings
router.route("/followings/:userId")
    .get(verifyJWT, getFollowings)


// Address Routes
router.route("/address")
    .post(verifyJWT, addAddress)
    .get(verifyJWT, getAllAddresses);

router.route("/address/:id")
    .patch(verifyJWT, updateAddress)
    .delete(verifyJWT, deleteAddress);


// User 
router.route("/")
    .post(upload.single('avatar'), addUser)
    .get(verifyJWT, getUsers)

router.route("/:id")
    .get(verifyJWT, getUserById)
    .patch(verifyJWT, upload.single('avatar'), updateUser)
    .delete(verifyJWT, deleteUser)

export default router;