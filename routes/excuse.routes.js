import { Router } from "express";
import authMiddleware, { adminOnlyMiddleware, optionalAuth } from "../middlewares/auth.middlewares.js";
import upload from "../utils/upload.js";
import {
  createExcuseController,
  getMyExcusesController,
  listAllExcusesController,
  getExcuseController,
  respondToExcuseController,
  clearAllExcusesController,
} from "../controllers/excuse.controller.js";

const router = Router();

router.post("/", optionalAuth, upload.array('attachments', 5), createExcuseController);
router.get("/me", authMiddleware, getMyExcusesController);

// Admin
router.delete("/clear-all", authMiddleware, adminOnlyMiddleware, clearAllExcusesController);
router.get("/", authMiddleware, adminOnlyMiddleware, listAllExcusesController);
router.get("/:id", authMiddleware, adminOnlyMiddleware, getExcuseController);
router.post("/:id/respond", authMiddleware, adminOnlyMiddleware, respondToExcuseController);

console.log('Excuse router stack:', router.stack ? router.stack.map(r => r.route && r.route.path) : []);

export default router;


