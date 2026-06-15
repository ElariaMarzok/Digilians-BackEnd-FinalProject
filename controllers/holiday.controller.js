import {
  submitHolidayRequest,
  getPendingHolidayRequests,
  getApprovedHolidayRequests,
  getRejectedHolidayRequests,
  getAllHolidayRequests,
  getUserHolidayRequests,
  approveHolidayRequest,
  rejectHolidayRequest,
  setPendingHolidayRequest,
  getHolidayStats,
  clearAllHolidayRequests
} from "../services/holiday.service.js";
import { successResponse, errorResponse } from "../utils/response.js";

export const submitHoliday = async (req, res) => {
  try {
    const { reason, startDate, endDate } = req.body;

    if (!reason || !String(reason).trim()) {
      return errorResponse(res, 400, "يرجى إدخال سبب عدم الحضور");
    }

    if (!startDate || !endDate) {
      return errorResponse(res, 400, "يرجى تحديدDates بداية ونهاية الاجازة");
    }

    const record = await submitHolidayRequest(
      req.user._id,
      req.user.email,
      { reason, startDate, endDate }
    );

    return successResponse(res, 201, "تم تقديم طلب الاجازة بنجاح", { record });
  } catch (err) {
    return errorResponse(
      res,
      err.statusCode || 500,
      err.message || "Server error"
    );
  }
};

export const listPendingHolidays = async (req, res) => {
  try {
    const { status } = req.query;
    const records = await getPendingHolidayRequests({
      searchValue: req.query.search || "",
      status: status || "pending"
    });

    const stats = await getHolidayStats();

    // Always return records array (empty or with data)
    return successResponse(res, 200, "تم جلب طلبات الاجازة", { records, stats });
  } catch (err) {
    return errorResponse(
      res,
      err.statusCode || 500,
      err.message || "Server error"
    );
  }
};

export const listMyHolidays = async (req, res) => {
  try {
    const records = await getUserHolidayRequests(req.user._id);

    return successResponse(res, 200, "تم جلب طلبات الاجازة", { records });
  } catch (err) {
    return errorResponse(
      res,
      err.statusCode || 500,
      err.message || "Server error"
    );
  }
};

export const approveHoliday = async (req, res) => {
  try {
    const { response } = req.body;
    const record = await approveHolidayRequest(
      req.params.id,
      req.user._id,
      response
    );

    return successResponse(res, 200, "تم الموافقة على طلب الاجازة", { record });
  } catch (err) {
    return errorResponse(
      res,
      err.statusCode || 500,
      err.message || "Server error"
    );
  }
};

export const rejectHoliday = async (req, res) => {
  try {
    const { response } = req.body;
    const record = await rejectHolidayRequest(
      req.params.id,
      req.user._id,
      response
    );

    return successResponse(res, 200, "تم رفض طلب الاجازة", { record });
  } catch (err) {
    return errorResponse(
      res,
      err.statusCode || 500,
      err.message || "Server error"
    );
  }
};

export const setPendingHoliday = async (req, res) => {
  try {
    const { response } = req.body;
    const record = await setPendingHolidayRequest(
      req.params.id,
      req.user._id,
      response
    );

    return successResponse(res, 200, "تم إعادة الطلب للقيد الانتظار", { record });
  } catch (err) {
    return errorResponse(
      res,
      err.statusCode || 500,
      err.message || "Server error"
    );
  }
};

export const getHolidayStatistics = async (req, res) => {
  try {
    const stats = await getHolidayStats();

    return successResponse(res, 200, "تم جلب الاحصائيات", { stats });
  } catch (err) {
    return errorResponse(
      res,
      err.statusCode || 500,
      err.message || "Server error"
    );
  }
};

// Get pending count for frontend badge (no auth needed - just count)
export const getPendingCount = async (req, res) => {
  try {
    const stats = await getHolidayStats();

    return successResponse(res, 200, "تم جلب العدد", { pendingCount: stats.pending });
  } catch (err) {
    return errorResponse(
      res,
      err.statusCode || 500,
      err.message || "Server error"
    );
  }
};

// Clear all holiday requests by status
export const clearHolidayRequests = async (req, res) => {
  try {
    const { status } = req.query;

    await clearAllHolidayRequests(status);

    return successResponse(res, 200, "تم مسح جميع الطلبات", { success: true });
  } catch (err) {
    return errorResponse(
      res,
      err.statusCode || 500,
      err.message || "Server error"
    );
  }
};

// Get all approved holiday requests (for admin to view approved requests)
export const listApprovedHolidays = async (req, res) => {
  try {
    const records = await getApprovedHolidayRequests({
      searchValue: req.query.search || ""
    });

    return successResponse(res, 200, "تم جلب طلبات الاجازة المعتمدة", { records });
  } catch (err) {
    return errorResponse(
      res,
      err.statusCode || 500,
      err.message || "Server error"
    );
  }
};

// Get all rejected holiday requests (for admin to view rejected requests)
export const listRejectedHolidays = async (req, res) => {
  try {
    const records = await getRejectedHolidayRequests({
      searchValue: req.query.search || ""
    });

    return successResponse(res, 200, "تم جلب طلبات الاجازة المرفوضة", { records });
  } catch (err) {
    return errorResponse(
      res,
      err.statusCode || 500,
      err.message || "Server error"
    );
  }
};

// Get ALL holiday requests regardless of status
export const listAllHolidays = async (req, res) => {
  try {
    const records = await getAllHolidayRequests({
      searchValue: req.query.search || ""
    });

    const stats = await getHolidayStats();

    return successResponse(res, 200, "تم جلب جميع طلبات الاجازة", { records, stats });
  } catch (err) {
    return errorResponse(
      res,
      err.statusCode || 500,
      err.message || "Server error"
    );
  }
};
