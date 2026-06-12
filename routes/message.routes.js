import { Router } from "express";
import authMiddleware, { adminOnlyMiddleware } from "../middlewares/auth.middlewares.js";
import {
  getAdminConversationController,
  getAdminInboxController,
  getAdminUnreadCountController,
  getStudentConversationController,
  getStudentInboxController,
  getStudentUnreadCountController,
  replyToAdminConversationController,
  replyToStudentConversationController,
  sendAdminMessageController,
} from "../controllers/message.controller.js";

const router = Router();

router.post("/admin/send", authMiddleware, adminOnlyMiddleware, sendAdminMessageController);
router.get("/admin/inbox", authMiddleware, adminOnlyMiddleware, getAdminInboxController);
router.get("/admin/unread-count", authMiddleware, adminOnlyMiddleware, getAdminUnreadCountController);
router.get(
  "/admin/conversation/:conversationId",
  authMiddleware,
  adminOnlyMiddleware,
  getAdminConversationController,
);
router.post(
  "/admin/conversation/:conversationId/reply",
  authMiddleware,
  adminOnlyMiddleware,
  replyToAdminConversationController,
);

router.get("/student/inbox", authMiddleware, getStudentInboxController);
router.get("/student/unread-count", authMiddleware, getStudentUnreadCountController);
router.get("/student/conversation/:conversationId", authMiddleware, getStudentConversationController);
router.post(
  "/student/conversation/:conversationId/reply",
  authMiddleware,
  replyToStudentConversationController,
);

export default router;
