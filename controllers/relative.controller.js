import {
  createRelativeForStudent,
  deleteRelativeForStudent,
  getMyRelatives,
  getStudentRelativesForAdmin,
  getStudentsWithRelatives,
  searchStudentsWithRelatives,
  updateRelativeForStudent,
} from "../services/relative.service.js";
import { errorResponse, successResponse } from "../utils/response.js";

export const listMyRelativesController = async (req, res) => {
  try {
    const records = await getMyRelatives(req.user);
    return successResponse(res, 200, "Relatives fetched successfully", { records });
  } catch (err) {
    return errorResponse(res, err.statusCode || 500, err.message || "Server error");
  }
};

export const createRelativeController = async (req, res) => {
  try {
    const record = await createRelativeForStudent(req.user, req.body);
    return successResponse(res, 201, "Relative created successfully", { record });
  } catch (err) {
    return errorResponse(res, err.statusCode || 500, err.message || "Server error");
  }
};

export const updateRelativeController = async (req, res) => {
  try {
    const record = await updateRelativeForStudent(req.user, req.params.id, req.body);
    return successResponse(res, 200, "Relative updated successfully", { record });
  } catch (err) {
    return errorResponse(res, err.statusCode || 500, err.message || "Server error");
  }
};

export const deleteRelativeController = async (req, res) => {
  try {
    const result = await deleteRelativeForStudent(req.user, req.params.id);
    return successResponse(res, 200, "Relative deleted successfully", result);
  } catch (err) {
    return errorResponse(res, err.statusCode || 500, err.message || "Server error");
  }
};

export const searchStudentsRelativesController = async (req, res) => {
  try {
    const students = await searchStudentsWithRelatives(req.query.search || "");
    return successResponse(res, 200, "Students fetched successfully", { students });
  } catch (err) {
    return errorResponse(res, err.statusCode || 500, err.message || "Server error");
  }
};

export const listStudentsWithRelativesController = async (req, res) => {
  try {
    const students = await getStudentsWithRelatives();
    return successResponse(res, 200, "Students fetched successfully", { students });
  } catch (err) {
    return errorResponse(res, err.statusCode || 500, err.message || "Server error");
  }
};

export const getStudentRelativesController = async (req, res) => {
  try {
    const payload = await getStudentRelativesForAdmin(req.params.studentId);
    return successResponse(res, 200, "Student relatives fetched successfully", payload);
  } catch (err) {
    return errorResponse(res, err.statusCode || 500, err.message || "Server error");
  }
};
