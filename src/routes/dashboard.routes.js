import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js"
import { getDahsboardData } from "../controllers/dashboard.controller.js";

const router = Router();


router.route('/')
    .get(verifyJWT, getDahsboardData)


export default router;