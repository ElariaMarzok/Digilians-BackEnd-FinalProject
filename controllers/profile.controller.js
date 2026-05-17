import {
    getOrCreateStudentProfile,
    getOrCreateCommanderProfile,
    searchStudentsForCommander,
    getStudentProfileSummaryForCommander,
} from "../services/profile.service.js";

import { successResponse, errorResponse } from "../utils/response.js";

const allowedCommanderRoles = ["commander", "admin", "super_admin"];

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
        if (!allowedCommanderRoles.includes(req.user.role)) {
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

export const searchStudents = async (req, res) => {
    try {
        if (!allowedCommanderRoles.includes(req.user.role)) {
            return errorResponse(
                res,
                403,
                "Only commanders can search students"
            );
        }

        const students = await searchStudentsForCommander({
            search: req.query.search || "",
        });

        return successResponse(
            res,
            200,
            "Students fetched successfully",
            {
                count: students.length,
                students,
            }
        );
    } catch (err) {
        return errorResponse(
            res,
            err.statusCode || 500,
            err.message || "Server error"
        );
    }
};

export const getStudentSummary = async (req, res) => {
    try {
        if (!allowedCommanderRoles.includes(req.user.role)) {
            return errorResponse(
                res,
                403,
                "Only commanders can view student summaries"
            );
        }

        const profile = await getStudentProfileSummaryForCommander(
            req.params.studentId
        );

        return successResponse(
            res,
            200,
            "Student profile summary fetched successfully",
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