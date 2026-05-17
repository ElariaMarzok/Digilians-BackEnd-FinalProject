import { registerUser, loginUser } from "../services/auth.service.js";
import { successResponse, errorResponse } from "../utils/response.js";

export const register = async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            role,
            phoneNumber,
            militaryId,
        } = req.body;

        // Basic validation
        if (!name || !email || !password) {
            return errorResponse(
                res,
                400,
                "Name, email, and password are required"
            );
        }

        const result = await registerUser({
            name,
            email,
            password,
            role,
            phoneNumber,
            militaryId,
        });

        return successResponse(
            res,
            201,
            "User registered successfully",
            result
        );
    } catch (err) {
        return errorResponse(
            res,
            err.statusCode || 500,
            err.message || "Server error"
        );
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return errorResponse(
                res,
                400,
                "Email and password are required"
            );
        }

        const result = await loginUser({ email, password });

        return successResponse(res, 200, "Login successful", result);
    } catch (err) {
        return errorResponse(
            res,
            err.statusCode || 500,
            err.message || "Server error"
        );
    }
};

export const logout = async (req, res) => {
    try {
        return successResponse(
            res,
            200,
            `Goodbye, ${req.user.name}! You have been logged out.`
        );
    } catch (err) {
        return errorResponse(res, 500, "Server error");
    }
};

export const getMe = async (req, res) => {
    try {
        return successResponse(res, 200, "Current user fetched", {
            user: req.user,
        });
    } catch (err) {
        return errorResponse(res, 500, "Server error");
    }
};