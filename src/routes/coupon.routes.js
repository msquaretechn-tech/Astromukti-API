import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import {
    createCoupon,
    getAllCoupons,
    applyCoupon,
    updateCoupon,
    deleteCoupon
} from "../controllers/coupon.controller.js";

const router = Router();

// Apply middleware to all routes if needed, or selectively
// router.use(verifyJWT); 

router.route("/")
    .post(verifyJWT, createCoupon) // Usually admin only, but using verifyJWT for now
    .get(getAllCoupons); // Public or authenticated

router.route("/apply")
    .post(verifyJWT, applyCoupon);

router.route("/:id")
    .patch(verifyJWT, updateCoupon)
    .delete(verifyJWT, deleteCoupon);

export default router;
