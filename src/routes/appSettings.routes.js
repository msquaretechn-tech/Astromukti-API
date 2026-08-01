import express from 'express';
import { getAppSettings, updateAppSettings } from '../controllers/appSettings.controller.js';
import { verifyJWT } from '../middlewares/auth.middlewares.js';

const router = express.Router();

router.route('/')
    .get(getAppSettings)                    // public — no verifyJWT
    .patch(verifyJWT, updateAppSettings);   // admin only

export default router;
