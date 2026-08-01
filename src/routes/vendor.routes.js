import { Router } from 'express';
import {
    addVendor,
    getVendor,
    updateVendor,
    deleteVendor,
    createLoginHistory,
    getAllLoginHistories,
    getLoginHistoryById,
    updateLoginHistoryById,
    deleteLoginHistoryById,
    createVendorRating,
    getAllVendorRatings,
    updateVendorRatingById,
    deleteVendorRatingById,
    followVendor,
    unFollowVendor,
    getVendorFollowers,
    addUserInWaitingList,
    removeUserFromWaitingList,
    getUserInWaitingList,
    isUserInWaitingList,
    getVendorAvailability,
    updateVendorAvailability,
    getMyActivity,
    blockUser,
    unBlockUser,
    getBlockedUsers,
    createVendorEnquiry,
    getVendorEnquiryById,
    updateVendorEnquiryById,
    deleteVendorEnquiryById,
    getVendorEnquiry,
    getAstrologerStats,
    checkPublicVendorMobile
} from '../controllers/vendor.controller.js';
import { upload } from '../middlewares/multer.middleware.js';
import { verifyJWT } from '../middlewares/auth.middlewares.js';


const router = Router();


router.route('/check-mobile')
    .post(checkPublicVendorMobile)


// Create a new vendor enquiry
router.route('/vendor-enquiries')
    .get(verifyJWT, getVendorEnquiry)// GET request to retrieve all
    .post(verifyJWT, createVendorEnquiry); // POST request to create

// Get, Update, and Delete a vendor enquiry by ID
router.route('/vendor-enquiries/:id')
    .get(verifyJWT, getVendorEnquiryById)     // GET request to retrieve by ID
    .put(verifyJWT, updateVendorEnquiryById)  // PUT request to update by ID
    .delete(verifyJWT, deleteVendorEnquiryById); // DELETE request to delete by ID

// Login History 
router.route('/login-histories')
    .post(verifyJWT, createLoginHistory)
    .get(verifyJWT, getAllLoginHistories);


router.route('/login-histories/:id')
    .get(verifyJWT, getLoginHistoryById)
    .patch(verifyJWT, updateLoginHistoryById)
    .delete(verifyJWT, deleteLoginHistoryById);

router.route('/my-activity/:vendorId')
    .get(verifyJWT, getMyActivity)

router.route('/ratings')
    .post(verifyJWT, createVendorRating)
    .get(getAllVendorRatings);

router.route('/ratings/:id')
    .patch(verifyJWT, updateVendorRatingById)
    .delete(verifyJWT, deleteVendorRatingById);

router.route('/follow/:vendorId')
    .post(verifyJWT, followVendor)


router.route('/unfollow/:vendorId')
    .post(verifyJWT, unFollowVendor)

router.route('/block/:vendorId')
    .get(verifyJWT, getBlockedUsers)
    .post(verifyJWT, blockUser)

router.route('/unblock/:vendorId')
    .post(verifyJWT, unBlockUser)

router.route('/followers/:vendorId')
    .get(verifyJWT, getVendorFollowers)

router.route('/stats/:vendorId')
    .get(verifyJWT, getAstrologerStats)

router.route('/waiting/')
    .get(verifyJWT, getUserInWaitingList)

router.route('/waiting/:vendorId')
    .get(verifyJWT, getUserInWaitingList)
    .post(verifyJWT, addUserInWaitingList)
    .delete(verifyJWT, removeUserFromWaitingList)

router.route('/check-waitlist/:vendorId')
    .post(verifyJWT, isUserInWaitingList);

router.route('/check-availability/:vendorId')
    .get(verifyJWT, getVendorAvailability);
    
router.route('/update-availability/:vendorId')
    .post(verifyJWT, updateVendorAvailability);


// Vendor 
router.route("/")
    .get(getVendor)
    .post(
        upload.fields([
            { name: 'avatar', maxCount: 1 },
            { name: 'otherImages', maxCount: 5 },
            { name: 'aadharFront', maxCount: 1 },
            { name: 'aadharBack', maxCount: 1 },
            { name: 'panImage', maxCount: 1 }
        ]), addVendor);

router.route("/:vendorId")
    .get(getVendor)
    .patch(upload.fields([
        { name: 'avatar', maxCount: 1 },
        { name: 'otherImages', maxCount: 5 },
        { name: 'aadharFront', maxCount: 1 },
        { name: 'aadharBack', maxCount: 1 },
        { name: 'panImage', maxCount: 1 }
    ]), updateVendor)
    .delete(verifyJWT, deleteVendor);


export default router;