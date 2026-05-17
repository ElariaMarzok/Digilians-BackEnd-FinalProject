import { Router } from "express";
import authMiddleware from "../middlewares/auth.middlewares.js";

import {
    getStudentProfile,
    getCommanderProfile,
} from "../controllers/profile.controller.js";

const router = Router();

router.get("/student/me", authMiddleware, getStudentProfile);

router.get("/commander/me", authMiddleware, getCommanderProfile);

export default router;