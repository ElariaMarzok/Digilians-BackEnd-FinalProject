import {
    getOrCreateStudentProfile,
    getOrCreateCommanderProfile,
} from "../services/profile.service.js";

import { successResponse, errorResponse } from "../utils/response.js";

export const getStudentProfile = async (req, res) => {
    try {
        if (req.user.role !== "student") {
            return errorResponse(
                res,
                403,
                "Only students can access this profile"
            );
        }

        const profile = await getOrCreateStudentProfile(req.user);

        return successResponse(
            res,
            200,
            "Student profile fetched successfully",
            profile
        );
    } catch (err) {
        return errorResponse(
            res,
            err.statusCode || 500,
            err.message || "Server error"
        );
    }
};

export const getCommanderProfile = async (req, res) => {
    try {
        const allowedRoles = ["commander", "admin", "super_admin"];

        if (!allowedRoles.includes(req.user.role)) {
            return errorResponse(
                res,
                403,
                "Only commanders can access this profile"
            );
        }

        const profile = await getOrCreateCommanderProfile(req.user);

        return successResponse(
            res,
            200,
            "Commander profile fetched successfully",
            profile
        );
    } catch (err) {
        return errorResponse(
            res,
            err.statusCode || 500,
            err.message || "Server error"
        );
    }
};