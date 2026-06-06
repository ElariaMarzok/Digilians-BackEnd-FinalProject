import { Router } from "express";
import authMiddleware from "../middlewares/auth.middlewares.js";
import {
  getOrCreateStudentProfile,
  getOrCreateCommanderProfile,
  searchStudentsForCommander,
  getStudentProfileSummaryForCommander,
} from "../services/profile.service.js";
import { successResponse, errorResponse } from "../utils/response.js";

const router = Router();

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const profile =
      user.role === "student"
        ? await getOrCreateStudentProfile(user)
        : await getOrCreateCommanderProfile(user);

    return successResponse(res, 200, "Profile loaded", { profile });
  } catch (err) {
    return errorResponse(
      res,
      err.statusCode || 500,
      err.message || "Server error",
    );
  }
});

router.get("/students", authMiddleware, async (req, res) => {
  try {
    const results = await searchStudentsForCommander({
      search: req.query.search || "",
    });
    return successResponse(res, 200, "Students found", { students: results });
  } catch (err) {
    return errorResponse(
      res,
      err.statusCode || 500,
      err.message || "Server error",
    );
  }
});

router.get("/summary/student/:id", authMiddleware, async (req, res) => {
  try {
    const profileSummary = await getStudentProfileSummaryForCommander(
      req.params.id,
    );
    return successResponse(res, 200, "Student profile summary", {
      profileSummary,
    });
  } catch (err) {
    return errorResponse(
      res,
      err.statusCode || 500,
      err.message || "Server error",
    );
  }
});

export default router;
