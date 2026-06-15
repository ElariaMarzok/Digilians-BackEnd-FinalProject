import { Router } from "express";
import authMiddleware, { adminOnlyMiddleware } from "../middlewares/auth.middlewares.js";
import {
  getCurrentProfileController,
  getStudentProfileController,
  updateStudentProfileController,
  getAdminProfileController,
  searchAdminStudentsController,
  getAdminStudentSummaryController,
} from "../controllers/profile.controller.js";

const router = Router();

router.get("/me", authMiddleware, getCurrentProfileController);

router.get("/student", authMiddleware, getStudentProfileController);
router.patch("/student", authMiddleware, updateStudentProfileController);

router.get("/admin", authMiddleware, adminOnlyMiddleware, getAdminProfileController);
router.get(
  "/admin/students/search",
  authMiddleware,
  adminOnlyMiddleware,
  searchAdminStudentsController,
);
router.get(
  "/admin/students/:studentId/summary",
  authMiddleware,
  adminOnlyMiddleware,
  getAdminStudentSummaryController,
);

router.get("/students", authMiddleware, adminOnlyMiddleware, searchAdminStudentsController);
router.get(
  "/summary/student/:studentId",
  authMiddleware,
  adminOnlyMiddleware,
  getAdminStudentSummaryController,
);

export default router;
