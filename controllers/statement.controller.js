import {
  addStudentAttendance,
  getAttendanceRecords,
  getStatementStats,
  getUserStatementData,
  updateAttendanceNote,
  updateAttendanceDeduction,
  deleteAttendanceRecord,
  searchAllStudentsWithStatus,
  clearAllAttendanceRecords,
  getApprovedExcuses,
  confirmExcuseAttendance,
  rejectExcuseAttendance,
} from "../services/statement.service.js";
import { addStudentToDirectory, recordStudentAttendance } from "../services/studentManagement.service.js";
import { findDirectoryStudentByIdentifier } from "../services/studentDirectory.service.js";
import { successResponse, errorResponse } from "../utils/response.js";

export const addAttendance = async (req, res) => {
  try {
    const { identifier } = req.body;

    if (!identifier || !String(identifier).trim()) {
      return errorResponse(res, 400, "ÙŠØ±Ø¬Ù‰ Ø¥Ø¯Ø®Ø§Ù„ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø·Ø§Ù„Ø¨");
    }

    const record = await addStudentAttendance(identifier);

    const stats = await getStatementStats();

    return successResponse(res, 201, "ØªÙ… ØªØ³Ø¬ÙŠÙ„ ÙˆØµÙˆÙ„ Ø§Ù„Ø·Ø§Ù„Ø¨ Ø¨Ù†Ø¬Ø§Ø­", {
      record,
      stats,
    });
  } catch (err) {
    return errorResponse(
      res,
      err.statusCode || 500,
      err.message || "Server error",
    );
  }
};

export const listAttendance = async (req, res) => {
  try {
    const records = await getAttendanceRecords({
      searchValue: req.query.search || "",
    });

    return successResponse(res, 200, "ØªÙ… Ø¬Ù„Ø¨ Ø³Ø¬Ù„Ø§Øª Ø§Ù„Ø­Ø¶ÙˆØ±", { records });
  } catch (err) {
    return errorResponse(
      res,
      err.statusCode || 500,
      err.message || "Server error",
    );
  }
};

export const getStats = async (req, res) => {
  try {
    const stats = await getStatementStats();

    return successResponse(res, 200, "ØªÙ… Ø¬Ù„Ø¨ Ø§Ù„Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª", { stats });
  } catch (err) {
    return errorResponse(
      res,
      err.statusCode || 500,
      err.message || "Server error",
    );
  }
};

export const getMyStatement = async (req, res) => {
  try {
    const data = await getUserStatementData(req.user.email, req.user._id);

    return successResponse(res, 200, "ØªÙ… Ø¬Ù„Ø¨ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ØªØµØ±ÙŠØ­", { data });
  } catch (err) {
    return errorResponse(
      res,
      err.statusCode || 500,
      err.message || "Server error",
    );
  }
};

export const saveAttendanceNote = async (req, res) => {
  try {
    const { note } = req.body;
    const record = await updateAttendanceNote(req.params.id, note);

    return successResponse(res, 200, "ØªÙ… Ø­ÙØ¸ Ø§Ù„Ù…Ù„Ø§Ø­Ø¸Ø©", { record });
  } catch (err) {
    return errorResponse(
      res,
      err.statusCode || 500,
      err.message || "Server error",
    );
  }
};

export const searchStudents = async (req, res) => {
  try {
    const results = await searchAllStudentsWithStatus({
      searchValue: req.query.search || "",
    });

    return successResponse(res, 200, "Ù†ØªØ§Ø¦Ø¬ Ø§Ù„Ø¨Ø­Ø«", { results });
  } catch (err) {
    return errorResponse(
      res,
      err.statusCode || 500,
      err.message || "Server error",
    );
  }
};

export const deleteAttendance = async (req, res) => {
  try {
    await deleteAttendanceRecord(req.params.id);
    const stats = await getStatementStats();

    return successResponse(res, 200, "ØªÙ… Ø­Ø°Ù Ø³Ø¬Ù„ Ø§Ù„Ø­Ø¶ÙˆØ± Ø¨Ù†Ø¬Ø§Ø­", { stats });
  } catch (err) {
    return errorResponse(
      res,
      err.statusCode || 500,
      err.message || "Server error",
    );
  }
};

export const clearAllAttendance = async (req, res) => {
  try {
    await clearAllAttendanceRecords();
    const stats = await getStatementStats();

    return successResponse(res, 200, "ØªÙ… Ù…Ø³Ø­ Ø¬Ù…ÙŠØ¹ Ø§Ù���Ø³Ø¬Ù„Ø§Øª Ø¨Ù†Ø¬Ø§Ø­", { stats });
  } catch (err) {
    return errorResponse(
      res,
      err.statusCode || 500,
      err.message || "Server error",
    );
  }
};

// Create new student in directory (not attendance record)
export const createStudent = async (req, res) => {
  try {
    const { name, militaryId, email } = req.body;

    if (!name || !String(name).trim()) {
      return errorResponse(res, 400, "ÙŠØ±Ø¬Ù‰ Ø¥Ø¯Ø®Ø§Ù„ Ø§Ø³Ù… Ø§Ù„Ø·Ø§Ù„Ø¨");
    }

    const student = await addStudentToDirectory({ name, militaryId, email });

    return successResponse(res, 201, "ØªÙ… Ø¥Ø¶Ø§Ù�Ø© Ø§Ù„Ø·Ø§Ù„Ø¨ Ø¨Ù†Ø¬Ø§Ø­", { student });
  } catch (err) {
    return errorResponse(
      res,
      err.statusCode || 500,
      err.message || "Server error",
    );
  }
};

// Search for a student by identifier (email, name, or military ID)
export const searchStudent = async (req, res) => {
  try {
    const { identifier } = req.body;

    if (!identifier || !String(identifier).trim()) {
      return errorResponse(res, 400, "ÙŠØ±Ø¬Ù‰ Ø¥Ø¯Ø®Ø§Ù„ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø·Ø§Ù„Ø¨");
    }

    const student = await findDirectoryStudentByIdentifier(identifier);

    return successResponse(res, 200, "ØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ø§Ù„Ø·Ø§Ù„Ø¨", { student });
  } catch (err) {
    return errorResponse(
      res,
      err.statusCode || 500,
      err.message || "Server error",
    );
  }
};

// Record student attendance
export const recordAttendance = async (req, res) => {
  try {
    const { studentId, permitType, notes } = req.body;

    if (!studentId) {
      return errorResponse(res, 400, "ÙŠØ±Ø¬Ù‰ Ø¥Ø¯Ø®Ø§Ù„ Ù…Ø¹Ù„Ù� Ø§Ù„Ø·Ø§Ù„Ø¨");
    }

    const record = await recordStudentAttendance({ studentId, permitType, note: notes });

    return successResponse(res, 201, "ØªÙ… ØªØ³Ø¬ÙŠÙ„ Ø­Ø¶Ø± Ø§Ù„Ø·Ø§Ù„Ø¨", { record });
  } catch (err) {
    return errorResponse(
      res,
      err.statusCode || 500,
      err.message || "Server error",
    );
  }
};

// Update deduction (grades) for attendance record
export const updateDeduction = async (req, res) => {
  try {
    const { deduction } = req.body;

    if (deduction === undefined || typeof deduction !== 'number') {
      return errorResponse(res, 400, "ÙŠØ±Ø¬Ù‰ Ø¥Ø¯Ø®Ø§Ù„ Ù‚ÙŠÙ…Ø© Ø§Ù„Ø§Ø¯Ø±Ø§Ø¬Ø©");
    }

    const record = await updateAttendanceDeduction(req.params.id, deduction);

    return successResponse(res, 200, "ØªÙ… ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø§Ø¯Ø±Ø§Ø¬Ø© Ø¨Ù†Ø¬Ø§Ø­", { record });
  } catch (err) {
    return errorResponse(
      res,
      err.statusCode || 500,
      err.message || "Server error",
    );
  }
};

// Get all approved excuses
export const getApprovedExcusesController = async (req, res) => {
  try {
    const excuses = await getApprovedExcuses();
    return successResponse(res, 200, "ØªÙ… Ø¬Ù„Ø¨ Ø§Ù„Ø§Ù„ØªÙ…Ø§Ø³Ø§Øª Ø§Ù„Ù…Ù€Ø¬Ø§Ø¨Ø©", { excuses });
  } catch (err) {
    return errorResponse(
      res,
      err.statusCode || 500,
      err.message || "Server error",
    );
  }
};

// Confirm an excuse and create attendance record
export const confirmExcuseController = async (req, res) => {
  try {
    const { excuseId } = req.body;

    if (!excuseId) {
      return errorResponse(res, 400, "ÙŠØ±Ø¬Ù‰ Ø¥Ø¯Ø®Ø§Ù„ Ù…Ø¹Ù„Ù� Ø§Ù„ØªÙ…Ø§Ø³");
    }

    const record = await confirmExcuseAttendance(excuseId);

    return successResponse(res, 201, "ØªÙ… ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ø­Ø¶ÙˆØ±", { record });
  } catch (err) {
    return errorResponse(
      res,
      err.statusCode || 500,
      err.message || "Server error",
    );
  }
};

// Reject an excuse (remove from list without confirming)
export const rejectExcuseController = async (req, res) => {
  try {
    const { excuseId } = req.body;

    if (!excuseId) {
      return errorResponse(res, 400, "ÙŠØ±Ø¬Ù‰ Ø¥Ø¯Ø®Ø§Ù„ Ù…Ø¹Ù„Ù� Ø§Ù„ØªÙ…Ø§Ø³");
    }

    await rejectExcuseAttendance(excuseId);

    return successResponse(res, 200, "ØªÙ… Ø±ÙÙ… Ø§Ù„ØªÙ…Ø§Ø³", { deleted: true });
  } catch (err) {
    return errorResponse(
      res,
      err.statusCode || 500,
      err.message || "Server error",
    );
  }
};
