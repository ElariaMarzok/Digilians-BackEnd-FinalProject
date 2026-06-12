import {
  getAdminConversation,
  getAdminInbox,
  getAdminUnreadCount,
  getStudentConversation,
  getStudentInbox,
  getStudentUnreadCount,
  replyToConversationAsAdmin,
  replyToConversationAsStudent,
  sendAdminMessageToStudent,
} from "../services/message.service.js";
import { errorResponse, successResponse } from "../utils/response.js";

const handleMessageError = (res, error) =>
  errorResponse(res, error.statusCode || 500, error.message || "Server error");

export const sendAdminMessageController = async (req, res) => {
  try {
    const conversation = await sendAdminMessageToStudent(req.user, req.body || {});
    return successResponse(res, 201, "Message sent successfully", { conversation });
  } catch (error) {
    return handleMessageError(res, error);
  }
};

export const getAdminInboxController = async (req, res) => {
  try {
    const conversations = await getAdminInbox(req.user);
    return successResponse(res, 200, "Admin inbox loaded", { conversations });
  } catch (error) {
    return handleMessageError(res, error);
  }
};

export const getAdminUnreadCountController = async (req, res) => {
  try {
    const unreadCount = await getAdminUnreadCount(req.user);
    return successResponse(res, 200, "Admin unread count loaded", { unreadCount });
  } catch (error) {
    return handleMessageError(res, error);
  }
};

export const getAdminConversationController = async (req, res) => {
  try {
    const conversation = await getAdminConversation(
      req.user,
      req.params.conversationId,
    );
    return successResponse(res, 200, "Conversation loaded", { conversation });
  } catch (error) {
    return handleMessageError(res, error);
  }
};

export const replyToAdminConversationController = async (req, res) => {
  try {
    const conversation = await replyToConversationAsAdmin(
      req.user,
      req.params.conversationId,
      req.body || {},
    );
    return successResponse(res, 201, "Reply sent successfully", { conversation });
  } catch (error) {
    return handleMessageError(res, error);
  }
};

export const getStudentInboxController = async (req, res) => {
  try {
    const conversations = await getStudentInbox(req.user);
    return successResponse(res, 200, "Student inbox loaded", { conversations });
  } catch (error) {
    return handleMessageError(res, error);
  }
};

export const getStudentUnreadCountController = async (req, res) => {
  try {
    const unreadCount = await getStudentUnreadCount(req.user);
    return successResponse(res, 200, "Student unread count loaded", { unreadCount });
  } catch (error) {
    return handleMessageError(res, error);
  }
};

export const getStudentConversationController = async (req, res) => {
  try {
    const conversation = await getStudentConversation(
      req.user,
      req.params.conversationId,
    );
    return successResponse(res, 200, "Conversation loaded", { conversation });
  } catch (error) {
    return handleMessageError(res, error);
  }
};

export const replyToStudentConversationController = async (req, res) => {
  try {
    const conversation = await replyToConversationAsStudent(
      req.user,
      req.params.conversationId,
      req.body || {},
    );
    return successResponse(res, 201, "Reply sent successfully", { conversation });
  } catch (error) {
    return handleMessageError(res, error);
  }
};
