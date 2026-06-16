import {
  createExcuse,
  getMyExcuses,
  getAllExcuses,
  getExcuseById,
  respondToExcuse,
  clearAllExcuses,
} from "../services/excuse.service.js";
import User from "../models/User.js";
import { successResponse, errorResponse } from "../utils/response.js";

export const createExcuseController = async (req, res) => {
  try {
    const { title, message, email, startDate, endDate } = req.body;
    if (!title || !String(title).trim() || !message || !String(message).trim()) {
      return errorResponse(res, 400, "يرجى إدخال عنوان ونص الالتماس");
    }

    // determine user id: prefer authenticated user, else fallback to email provided
    let userId = req.user?._id;
    if (!userId) {
      if (!email || !String(email).trim()) {
        return errorResponse(res, 401, "يرجى تسجيل الدخول أو إرسال حقل email في الطلب");
      }

      const user = await User.findOne({ email: email.toLowerCase().trim() });
      if (!user) return errorResponse(res, 404, "المستخدم غير موجود");
      userId = user._id;
    }

    const files = req.files || [];
    let attachments = [];
    if (files.length > 0) {
      attachments = files.map((f) => ({
        filename: f.filename,
        originalName: f.originalname,
        mimetype: f.mimetype,
        size: f.size,
        url: `${req.protocol}://${req.get('host')}/uploads/requests/${f.filename}`,
      }));
    } else if (req.body.attachments && Array.isArray(req.body.attachments)) {
      attachments = req.body.attachments.map((a) => ({
        filename: a.filename,
        originalName: a.originalName || a.filename,
        mimetype: a.mimetype,
        size: a.size || 0,
        url: a.base64 || a.url,
      }));
    }

    const excuse = await createExcuse(userId, { title, message, startDate, endDate, attachments });
    return successResponse(res, 201, "تم إرسال الالتماس بنجاح", { excuse });
  } catch (err) {
    return errorResponse(res, err.statusCode || 500, err.message || "Server error");
  }
};

export const getMyExcusesController = async (req, res) => {
  try {
    const excuses = await getMyExcuses(req.user._id);
    return successResponse(res, 200, "تم جلب الالتماسات", { excuses });
  } catch (err) {
    return errorResponse(res, err.statusCode || 500, err.message || "Server error");
  }
};

export const listAllExcusesController = async (req, res) => {
  try {
    const excuses = await getAllExcuses({ search: req.query.search || "" });
    return successResponse(res, 200, "تم جلب الالتماسات", { excuses });
  } catch (err) {
    return errorResponse(res, err.statusCode || 500, err.message || "Server error");
  }
};

export const getExcuseController = async (req, res) => {
  try {
    const excuse = await getExcuseById(req.params.id);
    if (!excuse) return errorResponse(res, 404, "الالتماس غير موجود");
    return successResponse(res, 200, "تم جلب الالتماس", { excuse });
  } catch (err) {
    return errorResponse(res, err.statusCode || 500, err.message || "Server error");
  }
};

export const respondToExcuseController = async (req, res) => {
  try {
    const { response, status } = req.body;
    if (!response || !String(response).trim()) {
      return errorResponse(res, 400, "يرجى إدخال رد");
    }

    const updated = await respondToExcuse(req.params.id, req.user._id, response, status);
    if (!updated) return errorResponse(res, 404, "الالتماس غير موجود");

    return successResponse(res, 200, "تم إرسال الرد", { excuse: updated });
  } catch (err) {
    return errorResponse(res, err.statusCode || 500, err.message || "Server error");
  }
};

export const clearAllExcusesController = async (req, res) => {
  try {
    const result = await clearAllExcuses();
    return successResponse(res, 200, "All excuses deleted successfully", { deletedCount: result.deletedCount || 0 });
  } catch (err) {
    return errorResponse(res, err.statusCode || 500, err.message || "Server error");
  }
};


