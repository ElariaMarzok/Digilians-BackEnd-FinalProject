import { Router } from "express";
import authMiddleware, {
  adminOnlyMiddleware
} from "../middlewares/auth.middlewares.js";
import {
  submitHoliday,
  listPendingHolidays,
  listApprovedHolidays,
  listRejectedHolidays,
  listAllHolidays,
  listMyHolidays,
  approveHoliday,
  rejectHoliday,
  setPendingHoliday,
  getHolidayStatistics,
  getPendingCount,
  clearHolidayRequests
} from "../controllers/holiday.controller.js";

const router = Router();

// User routes
// Submit holiday request
router.post("/request", authMiddleware, submitHoliday);
// Get my holiday requests
router.get("/my-requests", authMiddleware, listMyHolidays);

// Get pending count (for frontend badge - returns 0 if no requests)
router.get("/pending-count", getPendingCount);

// Admin routes
// Get pending holiday requests
router.get(
  "/pending",
  authMiddleware,
  adminOnlyMiddleware,
  listPendingHolidays
);
// Approve holiday request
router.patch(
  "/:id/approve",
  authMiddleware,
  adminOnlyMiddleware,
  approveHoliday
);
// Reject holiday request
router.patch(
  "/:id/reject",
  authMiddleware,
  adminOnlyMiddleware,
  rejectHoliday
);
// Set holiday back to pending
router.patch(
  "/:id/pending",
  authMiddleware,
  adminOnlyMiddleware,
  setPendingHoliday
);
// Get holiday statistics (no auth needed for stats display)
router.get(
  "/stats",
  getHolidayStatistics
);

// Get ALL requests regardless of status
router.get(
  "/all",
  authMiddleware,
  adminOnlyMiddleware,
  listAllHolidays
);

// Get all approved requests (for admin to view approved requests)
router.get(
  "/approved",
  authMiddleware,
  adminOnlyMiddleware,
  listApprovedHolidays
);

// Get all rejected requests (for admin to view rejected requests)
router.get(
  "/rejected",
  authMiddleware,
  adminOnlyMiddleware,
  listRejectedHolidays
);

// Clear all holiday requests by status (for admin to delete)
router.delete(
  "/clear",
  authMiddleware,
  adminOnlyMiddleware,
  clearHolidayRequests
);

export default router;
