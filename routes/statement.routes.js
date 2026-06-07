import { Router } from "express";
import authMiddleware, {
  adminOnlyMiddleware,
} from "../middlewares/auth.middlewares.js";
import {
  addAttendance,
  listAttendance,
  getStats,
  getMyStatement,
  saveAttendanceNote,
  deleteAttendance,
  searchStudents,
} from "../controllers/statement.controller.js";

const router = Router();

router.get("/me", authMiddleware, getMyStatement);

router.get(
  "/attendance",
  authMiddleware,
  adminOnlyMiddleware,
  listAttendance,
);
router.post(
  "/attendance",
  authMiddleware,
  adminOnlyMiddleware,
  addAttendance,
);
router.patch(
  "/attendance/:id/note",
  authMiddleware,
  adminOnlyMiddleware,
  saveAttendanceNote,
);
router.delete(
  "/attendance/:id",
  authMiddleware,
  adminOnlyMiddleware,
  deleteAttendance,
);
router.get("/stats", authMiddleware, adminOnlyMiddleware, getStats);
router.get("/search", authMiddleware, adminOnlyMiddleware, searchStudents);

export default router;
