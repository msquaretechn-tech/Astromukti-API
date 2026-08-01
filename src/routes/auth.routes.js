import { Router } from "express";
import {
    adminLogin,
    generateOtp,
    verifyOtp,
    uloginWithEmailPassword,
    verifyForgatePassword,
    vloginWithEmailPassword
} from "../controllers/auth.controller.js";


const router = Router();


router.route("/generate-otp")
    .post(generateOtp)

router.route("/verify-otp")
    .post(verifyOtp)

router.route("/verify-forget-password")
    .post(verifyForgatePassword)


router.route("/ulogin-email-password")
    .post(uloginWithEmailPassword)

router.route("/vlogin-email-password")
    .post(vloginWithEmailPassword)

router.route("/admin-login")
    .post(adminLogin)



export default router;
