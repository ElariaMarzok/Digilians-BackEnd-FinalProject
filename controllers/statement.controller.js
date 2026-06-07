import {
  addStudentAttendance,
  getAttendanceRecords,
  getStatementStats,
  getUserStatementData,
  updateAttendanceNote,
  deleteAttendanceRecord,
  searchAllStudentsWithStatus,
} from "../services/statement.service.js";
import { successResponse, errorResponse } from "../utils/response.js";

export const addAttendance = async (req, res) => {
  try {
    const { identifier } = req.body;

    if (!identifier || !String(identifier).trim()) {
      return errorResponse(res, 400, "يرجى إدخال بيانات الطالب");
    }

    const record = await addStudentAttendance(identifier);

    return successResponse(res, 201, "تم تسجيل وصول الطالب بنجاح", {
      record,
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

    return successResponse(res, 200, "تم جلب سجلات الحضور", { records });
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

    return successResponse(res, 200, "تم جلب الإحصائيات", { stats });
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

    return successResponse(res, 200, "تم جلب بيانات التصريح", { data });
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

    return successResponse(res, 200, "تم حفظ الملاحظة", { record });
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

    return successResponse(res, 200, "نتائج البحث", { results });
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

    return successResponse(res, 200, "تم حذف سجل الحضور بنجاح");
  } catch (err) {
    return errorResponse(
      res,
      err.statusCode || 500,
      err.message || "Server error",
    );
  }
};
