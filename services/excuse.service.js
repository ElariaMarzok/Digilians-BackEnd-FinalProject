import Excuse from "../models/Excuse.js";
import PermitStudentDirectory from "../models/PermitStudentDirectory.js";

export const createExcuse = async (userId, { title, message, attachments = [] }) => {
  // try to resolve student's directory entry to copy militaryId and name/email
  const dir = await PermitStudentDirectory.findOne({ user: userId });

  const payload = {
    user: userId,
    title,
    message,
    studentName: dir?.name,
    studentEmail: dir?.email,
    militaryId: dir?.militaryId,
    attachments,
  };

  const excuse = await Excuse.create(payload);
  return excuse;
};

export const getMyExcuses = async (userId) => {
  return Excuse.find({ user: userId }).sort({ createdAt: -1 }).populate("user responder");
};

export const getAllExcuses = async ({ search = "" } = {}) => {
  const q = search.trim();
  if (!q) {
    return Excuse.find().sort({ createdAt: -1 }).populate("user responder");
  }

  const re = new RegExp(q, "i");
  return Excuse.find({ $or: [{ title: re }, { message: re }, { militaryId: re }] })
    .sort({ createdAt: -1 })
    .populate("user responder");
};

export const getExcuseById = async (id) => {
  return Excuse.findById(id).populate("user responder");
};

export const respondToExcuse = async (id, adminId, responseText, status = "مُجاب") => {
  const excuse = await Excuse.findById(id);
  if (!excuse) return null;

  excuse.response = responseText;
  excuse.responder = adminId;
  excuse.respondedAt = new Date();
  excuse.status = status;

  await excuse.save();

  return excuse.populate("user responder");
};
