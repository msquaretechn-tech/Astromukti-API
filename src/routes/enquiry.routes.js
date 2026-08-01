import { Router } from "express";
import { sendEnquiry, fetchEnquiry } from "../controllers/enquiry.controller.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

router.route("/")
    .get(verifyJWT, fetchEnquiry)
    .post(verifyJWT, sendEnquiry);


export default router;
