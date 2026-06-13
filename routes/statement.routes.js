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
  clearAllAttendance,
  createStudent,
  searchStudent,
  recordAttendance,
  updateDeduction,
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

// Route for clearing ALL attendance records - must be BEFORE :id routes
router.delete(
  "/attendance/clear-all",
  authMiddleware,
  adminOnlyMiddleware,
  clearAllAttendance,
);

router.delete(
  "/attendance/:id",
  authMiddleware,
  adminOnlyMiddleware,
  deleteAttendance,
);

// Route for updating deduction (grades)
router.patch(
  "/attendance/:id/deduction",
  authMiddleware,
  adminOnlyMiddleware,
  updateDeduction,
);

router.get("/stats", authMiddleware, adminOnlyMiddleware, getStats);
router.get("/search", authMiddleware, adminOnlyMiddleware, searchStudents);

// Route for adding new students to directory
router.post(
  "/attendance/add-student",
  authMiddleware,
  adminOnlyMiddleware,
  createStudent,
);

// Route for searching student by military ID
router.post(
  "/attendance/search-student",
  authMiddleware,
  adminOnlyMiddleware,
  searchStudent,
);

// Route for recording attendance
router.post(
  "/attendance/record",
  authMiddleware,
  adminOnlyMiddleware,
  recordAttendance,
);

export default router;
