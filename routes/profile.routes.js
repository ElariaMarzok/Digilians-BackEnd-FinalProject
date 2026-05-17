import { Router } from "express";
import authMiddleware from "../middlewares/auth.middlewares.js";

import {
    getStudentProfile,
    getCommanderProfile,
    searchStudents,
    getStudentSummary,
} from "../controllers/profile.controller.js";

const router = Router();

router.get("/student/me", authMiddleware, getStudentProfile);

router.get("/commander/me", authMiddleware, getCommanderProfile);

router.get("/commander/students", authMiddleware, searchStudents);

router.get(
    "/commander/students/:studentId/summary",
    authMiddleware,
    getStudentSummary
);

export default router;