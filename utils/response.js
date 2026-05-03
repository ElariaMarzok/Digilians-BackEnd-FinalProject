/**
 * Centralized error response utility.
 * @param {import('express').Response} res
 * @param {number} statusCode
 * @param {string} message
 * @param {object} [extra]
 */
export const errorResponse = (res, statusCode, message, extra = {}) => {
    return res.status(statusCode).json({ success: false, message, ...extra });
};

/**
 * Centralized success response utility.
 * @param {import('express').Response} res
 * @param {number} statusCode
 * @param {string} message
 * @param {object} [data]
 */
export const successResponse = (res, statusCode, message, data = {}) => {
    return res.status(statusCode).json({ success: true, message, ...data });
};
