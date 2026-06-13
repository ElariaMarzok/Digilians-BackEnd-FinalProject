import {
  getStudentProfile,
  updateStudentProfile,
  getAdminProfile,
  searchStudentsForAdmin,
  getStudentProfileSummaryForAdmin,
  getCurrentProfileByRole,
} from "../services/profile.service.js";
import { successResponse, errorResponse } from "../utils/response.js";

const handleProfileError = (res, error) =>
  errorResponse(
    res,
    error.statusCode || 500,
    error.message || "Server error",
  );

export const getCurrentProfileController = async (req, res) => {
  try {
    const profile = await getCurrentProfileByRole(req.user);
    return successResponse(res, 200, "Profile loaded", { profile });
  } catch (error) {
    return handleProfileError(res, error);
  }
};

export const getStudentProfileController = async (req, res) => {
  try {
    const profile = await getStudentProfile(req.user);
    return successResponse(res, 200, "Student profile loaded", { profile });
  } catch (error) {
    return handleProfileError(res, error);
  }
};

export const updateStudentProfileController = async (req, res) => {
  try {
    const profile = await updateStudentProfile(req.user, req.body || {});
    return successResponse(res, 200, "Student profile updated", { profile });
  } catch (error) {
    return handleProfileError(res, error);
  }
};

export const getAdminProfileController = async (req, res) => {
  try {
    const profile = await getAdminProfile(req.user);
    return successResponse(res, 200, "Admin profile loaded", { profile });
  } catch (error) {
    return handleProfileError(res, error);
  }
};

export const searchAdminStudentsController = async (req, res) => {
  try {
    const students = await searchStudentsForAdmin({
      search: req.query.search || "",
    });

    return successResponse(res, 200, "Students found", { students });
  } catch (error) {
    return handleProfileError(res, error);
  }
};

export const getAdminStudentSummaryController = async (req, res) => {
  try {
    const profileSummary = await getStudentProfileSummaryForAdmin(
      req.params.studentId || req.params.id,
    );

    return successResponse(res, 200, "Student profile summary", {
      profileSummary,
    });
  } catch (error) {
    return handleProfileError(res, error);
  }
};
