// Digilians-BackEnd-FinalProject/routes/medical.routes.js
import { Router } from "express";
import authMiddleware, { adminOnlyMiddleware } from "../middlewares/auth.middlewares.js";
import {
  addMedicalRecord,
  getMyMedicalRecords,
  getAllMedicalRecords,
  getMedicalStatsController, // سنثبت هذا الاسم وتتأكدي من تصديره بنفس الشكل في الكنترولر
  updateMedicalStatus, 
  patchMedicalRecord,
  removeMedicalRecord,
} from "../controllers/medical.controller.js";

console.log(" Loaded medical.routes.js successfully");

const router = Router();

// ==========================================
// 1. المسارات الثابتة والمشتركة (Static Routes)
// ==========================================
router.get("/ping", (req, res) => res.json({ success: true, message: "medical router alive" }));
router.get("/me", authMiddleware, getMyMedicalRecords);

// ==========================================
// 2. مسارات المسؤول الثابتة (Admin Static Routes)
// دائمًا نضعها فوق الـ /:id حتى لا يتم اعتبار كلمة stats أو status كـ معرف ID
// ==========================================
router.get("/stats", authMiddleware, adminOnlyMiddleware, getMedicalStatsController);
router.patch("/status", authMiddleware, adminOnlyMiddleware, updateMedicalStatus);
router.get("/", authMiddleware, adminOnlyMiddleware, getAllMedicalRecords);
router.post("/", authMiddleware, addMedicalRecord);


// ==========================================
// 3. مسارات المعرفات الديناميكية (Dynamic Routes)
// دائمًا في الأسفل لحماية المسارات الثابتة
// ==========================================
router.patch("/:id", authMiddleware, patchMedicalRecord);
router.delete("/:id", authMiddleware, removeMedicalRecord);

export default router;