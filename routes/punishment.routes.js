import { Router } from "express";
import authMiddleware from "../middlewares/auth.middlewares.js";
import {
  getAllPunishmentsController,
  createPunishmentController,
  updatePunishmentController,
  deletePunishmentController,
  getStudentPunishmentsController,
} from "../controllers/punishment.controller.js";

const router = Router();

// Student route - must be BEFORE dynamic routes
router.get("/student", authMiddleware, getStudentPunishmentsController);

// Admin routes
router.get("/", authMiddleware, getAllPunishmentsController);
router.post("/", authMiddleware, createPunishmentController);
router.put("/:id", authMiddleware, updatePunishmentController);
router.delete("/:id", authMiddleware, deletePunishmentController);

export default router;
