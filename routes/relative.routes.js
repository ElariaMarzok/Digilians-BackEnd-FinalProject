import { Router } from "express";
import authMiddleware, { adminOnlyMiddleware } from "../middlewares/auth.middlewares.js";
import {
  createRelativeController,
  deleteRelativeController,
  getStudentRelativesController,
  listMyRelativesController,
  listStudentsWithRelativesController,
  searchStudentsRelativesController,
  updateRelativeController,
} from "../controllers/relative.controller.js";

const router = Router();

router.get("/me", authMiddleware, listMyRelativesController);
router.post("/", authMiddleware, createRelativeController);
router.patch("/:id", authMiddleware, updateRelativeController);
router.delete("/:id", authMiddleware, deleteRelativeController);

router.get("/admin", authMiddleware, adminOnlyMiddleware, listStudentsWithRelativesController);
router.get("/admin/search", authMiddleware, adminOnlyMiddleware, searchStudentsRelativesController);
router.get("/admin/student/:studentId", authMiddleware, adminOnlyMiddleware, getStudentRelativesController);

export default router;
