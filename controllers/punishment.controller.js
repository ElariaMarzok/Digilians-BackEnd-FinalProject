import * as punishmentService from "../services/punishment.service.js";
import { successResponse, errorResponse } from "../utils/response.js";

const adminRoles = ["admin", "commander", "super_admin"];
const FORBIDDEN_MESSAGE = "\u063a\u064a\u0631 \u0645\u0635\u0631\u062d \u0644\u0643 \u0628\u0627\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062d\u0629";

export const getAllPunishmentsController = async (req, res) => {
  try {
    if (!adminRoles.includes(req.user.role)) {
      return errorResponse(res, 403, FORBIDDEN_MESSAGE);
    }

    const punishments = await punishmentService.getAllPunishments();
    return successResponse(res, 200, "Punishments loaded", { punishments });
  } catch (err) {
    return errorResponse(res, err.statusCode || 500, err.message || "Server error");
  }
};

export const createPunishmentController = async (req, res) => {
  try {
    if (!adminRoles.includes(req.user.role)) {
      return errorResponse(res, 403, FORBIDDEN_MESSAGE);
    }

    const punishment = await punishmentService.createPunishment(req.body);
    return successResponse(res, 201, "Punishment created", { punishment });
  } catch (err) {
    return errorResponse(res, err.statusCode || 500, err.message || "Server error");
  }
};

export const updatePunishmentController = async (req, res) => {
  try {
    if (!adminRoles.includes(req.user.role)) {
      return errorResponse(res, 403, FORBIDDEN_MESSAGE);
    }

    const punishment = await punishmentService.updatePunishment(req.params.id, req.body);
    return successResponse(res, 200, "Punishment updated", { punishment });
  } catch (err) {
    return errorResponse(res, err.statusCode || 500, err.message || "Server error");
  }
};

export const deletePunishmentController = async (req, res) => {
  try {
    if (!adminRoles.includes(req.user.role)) {
      return errorResponse(res, 403, FORBIDDEN_MESSAGE);
    }

    await punishmentService.deletePunishment(req.params.id);
    return successResponse(res, 200, "Punishment deleted");
  } catch (err) {
    return errorResponse(res, err.statusCode || 500, err.message || "Server error");
  }
};

export const getStudentPunishmentsController = async (req, res) => {
  try {
    const { militaryNum, studentName = "" } = req.query;

    if (!militaryNum) {
      return errorResponse(res, 400, "militaryNum is required");
    }

    const punishments = await punishmentService.getStudentPunishments(militaryNum);
    const normalizedName = studentName.trim().toLowerCase();
    const filtered = normalizedName
      ? punishments.filter((item) => item.studentName?.toLowerCase().includes(normalizedName))
      : punishments;

    const deductedPoints = filtered.reduce((sum, item) => sum + (item.degree || 0), 0);
    const stats = {
      totalPunishments: filtered.length,
      deductedPoints,
      remainingPoints: Math.max(0, 100 - deductedPoints),
    };

    return successResponse(res, 200, "Student punishments loaded", {
      punishments: filtered,
      stats,
    });
  } catch (err) {
    return errorResponse(res, err.statusCode || 500, err.message || "Server error");
  }
};

export const getAdminWarningSummaryController = async (req, res) => {
  try {
    if (!adminRoles.includes(req.user.role)) {
      return errorResponse(res, 403, FORBIDDEN_MESSAGE);
    }

    const data = await punishmentService.getAdminWarningSummary();
    return successResponse(res, 200, "Admin warning summary loaded", { data });
  } catch (err) {
    return errorResponse(res, err.statusCode || 500, err.message || "Server error");
  }
};
