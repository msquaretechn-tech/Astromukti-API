import express from "express";
import { createPooja, getAllPoojas, getPoojaById, bookPooja, getUserBookings } from "../controllers/pooja.controller.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = express.Router();

router.get("/", getAllPoojas);

router.post("/", upload.single("image"), createPooja);

// Booking Routes
router.post("/book", verifyJWT, bookPooja);
router.get("/booked", verifyJWT, getUserBookings);


router.get("/:id", getPoojaById);

export default router;
