import mongoose from "mongoose";
import Admin from "../models/Admin.js";
import Conversation from "../models/Conversation.js";
import ConversationMessage from "../models/ConversationMessage.js";
import PermitStudentDirectory from "../models/PermitStudentDirectory.js";
import User from "../models/User.js";
import { resolveDirectoryForAccount } from "./studentDirectory.service.js";

const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const isAdminRole = (role = "") => {
  const normalizedRole = String(role).toLowerCase();
  return (
    normalizedRole === "admin" ||
    normalizedRole === "commander" ||
    normalizedRole === "super_admin" ||
    normalizedRole === "superadmin"
  );
};

const isStudentRole = (role = "") => String(role).toLowerCase() === "student";

const toObjectId = (value) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw createHttpError("Invalid conversation id", 400);
  }

  return new mongoose.Types.ObjectId(value);
};

const normalizeText = (value) => String(value || "").trim();
const normalizeEmail = (value) => normalizeText(value).toLowerCase();

const formatDateTime = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString();
};

const findStudentUser = async (directoryEntry) => {
  if (!directoryEntry) {
    return null;
  }

  if (directoryEntry.user) {
    const linkedUser = await User.findById(directoryEntry.user).select("-password");
    if (linkedUser) {
      return linkedUser;
    }
  }

  if (directoryEntry.email) {
    return User.findOne({ email: directoryEntry.email }).select("-password");
  }

  return null;
};

const ensureAdminAccount = async (account) => {
  if (!isAdminRole(account?.role)) {
    throw createHttpError("Admin access only", 403);
  }

  const adminDocument = await Admin.findById(account._id).select("-password");

  if (!adminDocument) {
    throw createHttpError("Admin account not found", 404);
  }

  return adminDocument;
};

const ensureStudentAccount = async (account) => {
  if (!isStudentRole(account?.role)) {
    throw createHttpError("Student access only", 403);
  }

  const directoryEntry = await resolveDirectoryForAccount({
    email: account.email,
    userId: account._id,
  });

  if (!directoryEntry) {
    throw createHttpError("Student directory record not found", 404);
  }

  const studentUser = await User.findById(account._id).select("-password");

  return {
    directoryEntry,
    studentUser,
  };
};

const resolveStudentByEmail = async (studentEmail) => {
  const normalizedEmail = normalizeEmail(studentEmail);

  if (!normalizedEmail) {
    throw createHttpError("Student email is required", 400);
  }

  let directoryEntry = await PermitStudentDirectory.findOne({ email: normalizedEmail });
  let studentUser = null;

  if (!directoryEntry) {
    studentUser = await User.findOne({ email: normalizedEmail }).select("-password");

    if (studentUser) {
      directoryEntry = await resolveDirectoryForAccount({
        email: normalizedEmail,
        userId: studentUser._id,
      });
    }
  }

  if (!directoryEntry) {
    throw createHttpError("Student email does not belong to a registered student", 404);
  }

  if (!studentUser) {
    studentUser = await findStudentUser(directoryEntry);
  }

  return {
    directoryEntry,
    studentUser,
  };
};

const buildConversationQueryForAdmin = (conversationId, adminId) => ({
  _id: toObjectId(conversationId),
  admin: adminId,
});

const buildConversationQueryForStudent = (conversationId, studentId) => ({
  _id: toObjectId(conversationId),
  student: studentId,
});

const populateConversation = (query) =>
  Conversation.findOne(query)
    .populate("admin", "name email role")
    .populate("student", "name email militaryId user")
    .populate("studentUser", "name email")
    .lean();

const populateConversationMessages = (conversationId) =>
  ConversationMessage.find({ conversation: conversationId })
    .sort({ createdAt: 1 })
    .lean();

const serializeConversationSummary = (conversation, viewerType) => ({
  id: conversation._id,
  subject: conversation.subject,
  lastMessage: conversation.lastMessage,
  lastMessageAt: formatDateTime(conversation.lastMessageAt || conversation.updatedAt),
  unreadCount: viewerType === "admin" ? conversation.unreadForAdmin || 0 : conversation.unreadForStudent || 0,
  status: conversation.status,
  admin: conversation.admin
    ? {
        id: conversation.admin._id,
        name: conversation.admin.name,
        email: conversation.admin.email,
      }
    : null,
  student: conversation.student
    ? {
        id: conversation.student._id,
        name: conversation.student.name,
        email: conversation.student.email,
        militaryId: conversation.student.militaryId,
      }
    : null,
});

const serializeMessage = (message) => ({
  id: message._id,
  senderType: message.senderType,
  body: message.body,
  readByAdmin: Boolean(message.readByAdmin),
  readByStudent: Boolean(message.readByStudent),
  createdAt: formatDateTime(message.createdAt),
});

const serializeConversationDetails = (conversation, messages, viewerType) => ({
  conversation: serializeConversationSummary(conversation, viewerType),
  messages: messages.map(serializeMessage),
});

const validateMessageInput = ({ subjectRequired = false, subject, body }) => {
  const normalizedBody = normalizeText(body);
  const normalizedSubject = normalizeText(subject);

  if (subjectRequired && !normalizedSubject) {
    throw createHttpError("Message subject is required", 400);
  }

  if (!normalizedBody) {
    throw createHttpError("Message body is required", 400);
  }

  return {
    subject: normalizedSubject,
    body: normalizedBody,
  };
};

export const sendAdminMessageToStudent = async (account, payload = {}) => {
  const adminDocument = await ensureAdminAccount(account);
  const { subject, body } = validateMessageInput({
    subjectRequired: true,
    subject: payload.subject,
    body: payload.body,
  });
  const { directoryEntry, studentUser } = await resolveStudentByEmail(payload.studentEmail);

  const conversation = await Conversation.create({
    admin: adminDocument._id,
    student: directoryEntry._id,
    studentUser: studentUser?._id || directoryEntry.user || null,
    subject,
    lastMessage: body,
    lastMessageAt: new Date(),
    unreadForAdmin: 0,
    unreadForStudent: 1,
    status: "active",
  });

  await ConversationMessage.create({
    conversation: conversation._id,
    senderType: "admin",
    senderAdmin: adminDocument._id,
    body,
    readByAdmin: true,
    readByStudent: false,
  });

  const populatedConversation = await populateConversation({ _id: conversation._id });
  const messages = await populateConversationMessages(conversation._id);

  return serializeConversationDetails(populatedConversation, messages, "admin");
};

export const getAdminInbox = async (account) => {
  const adminDocument = await ensureAdminAccount(account);

  const conversations = await Conversation.find({ admin: adminDocument._id })
    .populate("admin", "name email role")
    .populate("student", "name email militaryId user")
    .populate("studentUser", "name email")
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .lean();

  return conversations.map((conversation) =>
    serializeConversationSummary(conversation, "admin"),
  );
};

export const getAdminUnreadCount = async (account) => {
  const adminDocument = await ensureAdminAccount(account);

  const rows = await Conversation.aggregate([
    { $match: { admin: adminDocument._id } },
    { $group: { _id: null, total: { $sum: "$unreadForAdmin" } } },
  ]);

  return rows[0]?.total || 0;
};

export const getAdminConversation = async (account, conversationId) => {
  const adminDocument = await ensureAdminAccount(account);
  const query = buildConversationQueryForAdmin(conversationId, adminDocument._id);

  const existingConversation = await populateConversation(query);

  if (!existingConversation) {
    throw createHttpError("Conversation not found", 404);
  }

  await ConversationMessage.updateMany(
    {
      conversation: existingConversation._id,
      senderType: "student",
      readByAdmin: false,
    },
    { $set: { readByAdmin: true } },
  );

  if (existingConversation.unreadForAdmin > 0) {
    await Conversation.updateOne(
      { _id: existingConversation._id },
      { $set: { unreadForAdmin: 0 } },
    );
  }

  const refreshedConversation = await populateConversation(query);
  const messages = await populateConversationMessages(existingConversation._id);

  return serializeConversationDetails(refreshedConversation, messages, "admin");
};

export const replyToConversationAsAdmin = async (account, conversationId, payload = {}) => {
  const adminDocument = await ensureAdminAccount(account);
  const { body } = validateMessageInput({ body: payload.body });
  const query = buildConversationQueryForAdmin(conversationId, adminDocument._id);

  const conversation = await populateConversation(query);

  if (!conversation) {
    throw createHttpError("Conversation not found", 404);
  }

  const message = await ConversationMessage.create({
    conversation: conversation._id,
    senderType: "admin",
    senderAdmin: adminDocument._id,
    body,
    readByAdmin: true,
    readByStudent: false,
  });

  await Conversation.updateOne(
    { _id: conversation._id },
    {
      $set: {
        lastMessage: body,
        lastMessageAt: message.createdAt,
        status: "active",
      },
      $inc: { unreadForStudent: 1 },
    },
  );

  const refreshedConversation = await populateConversation(query);
  const messages = await populateConversationMessages(conversation._id);

  return serializeConversationDetails(refreshedConversation, messages, "admin");
};

export const getStudentInbox = async (account) => {
  const { directoryEntry } = await ensureStudentAccount(account);

  const conversations = await Conversation.find({ student: directoryEntry._id })
    .populate("admin", "name email role")
    .populate("student", "name email militaryId user")
    .populate("studentUser", "name email")
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .lean();

  return conversations.map((conversation) =>
    serializeConversationSummary(conversation, "student"),
  );
};

export const getStudentUnreadCount = async (account) => {
  const { directoryEntry } = await ensureStudentAccount(account);

  const rows = await Conversation.aggregate([
    { $match: { student: directoryEntry._id } },
    { $group: { _id: null, total: { $sum: "$unreadForStudent" } } },
  ]);

  return rows[0]?.total || 0;
};

export const getStudentConversation = async (account, conversationId) => {
  const { directoryEntry } = await ensureStudentAccount(account);
  const query = buildConversationQueryForStudent(conversationId, directoryEntry._id);

  const existingConversation = await populateConversation(query);

  if (!existingConversation) {
    throw createHttpError("Conversation not found", 404);
  }

  await ConversationMessage.updateMany(
    {
      conversation: existingConversation._id,
      senderType: "admin",
      readByStudent: false,
    },
    { $set: { readByStudent: true } },
  );

  if (existingConversation.unreadForStudent > 0) {
    await Conversation.updateOne(
      { _id: existingConversation._id },
      { $set: { unreadForStudent: 0 } },
    );
  }

  const refreshedConversation = await populateConversation(query);
  const messages = await populateConversationMessages(existingConversation._id);

  return serializeConversationDetails(refreshedConversation, messages, "student");
};

export const replyToConversationAsStudent = async (account, conversationId, payload = {}) => {
  const { directoryEntry, studentUser } = await ensureStudentAccount(account);
  const { body } = validateMessageInput({ body: payload.body });
  const query = buildConversationQueryForStudent(conversationId, directoryEntry._id);

  const conversation = await populateConversation(query);

  if (!conversation) {
    throw createHttpError("Conversation not found", 404);
  }

  const message = await ConversationMessage.create({
    conversation: conversation._id,
    senderType: "student",
    senderUser: studentUser?._id || directoryEntry.user || null,
    body,
    readByAdmin: false,
    readByStudent: true,
  });

  await Conversation.updateOne(
    { _id: conversation._id },
    {
      $set: {
        lastMessage: body,
        lastMessageAt: message.createdAt,
        status: "active",
      },
      $inc: { unreadForAdmin: 1 },
    },
  );

  const refreshedConversation = await populateConversation(query);
  const messages = await populateConversationMessages(conversation._id);

  return serializeConversationDetails(refreshedConversation, messages, "student");
};
