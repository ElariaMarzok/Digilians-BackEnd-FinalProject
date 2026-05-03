import jwt from "jsonwebtoken";
import User from "../models/User.js";


const generateToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });
};


const sanitizeUser = (user) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    image: user.image,
    phoneNumber: user.phoneNumber,
    preferredLanguage: user.preferredLanguage,
    isRegistered: user.isRegistered,
    createdAt: user.createdAt,
});


export const registerUser = async ({ name, email, password, role, phoneNumber }) => {

    const existing = await User.findOne({ email });
    if (existing) {
        const err = new Error("Email already registered");
        err.statusCode = 409;
        throw err;
    }

    const user = await User.create({
        name,
        email,
        password,
        ...(role && { role }),
        ...(phoneNumber && { phoneNumber }),
        isRegistered: true,
    });

    const token = generateToken(user._id);

    return { token, user: sanitizeUser(user) };
};

export const loginUser = async ({ email, password }) => {
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
        const err = new Error("Invalid email or password");
        err.statusCode = 401;
        throw err;
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
        const err = new Error("Invalid email or password");
        err.statusCode = 401;
        throw err;
    }

    const token = generateToken(user._id);

    return { token, user: sanitizeUser(user) };
};
