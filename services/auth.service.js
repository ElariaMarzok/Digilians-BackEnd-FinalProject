import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Admin from "../models/Admin.js";
import { ADMIN_ACCOUNT } from "../data/testAccounts.js";
import {
  ensureStudentInDirectory,
  buildStudentAuthProfile,
} from "./studentDirectory.service.js";

const adminEmailLower = ADMIN_ACCOUNT.email.toLowerCase();
const adminPassword = ADMIN_ACCOUNT.password;

const generateToken = (userId, accountType = "user") => {
  return jwt.sign({ id: userId, accountType }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

const validatePassword = (password) => {
  const numberCount = (password.match(/\d/g) || []).length;
  const letterCount = (password.match(/[A-Za-z]/g) || []).length;

  if (numberCount === password.length) {
    return "كلمة المرور لا يمكن أن تكون أرقامًا فقط";
  }

  if (letterCount < 4) {
    return "كلمة المرور يجب أن تحتوي على 4 أحرف على الأقل";
  }

  if (!/^[A-Z]/.test(password)) {
    return "كلمة المرور يجب أن تبدأ بحرف كابيتال";
  }

  if (password.length < 4 || password.length > 15) {
    return "كلمة المرور يجب أن تكون بين 4 و 15 حرفًا";
  }

  if (numberCount === 0) {
    return "كلمة المرور يجب أن تحتوي على رقم واحد على الأقل";
  }

  if (numberCount > 10) {
    return "كلمة المرور يجب أن تحتوي على 10 أرقام على الأكثر";
  }

  return null;
};

const sanitizeUser = (account, role = "student") => ({
  _id: account._id,
  name: account.name,
  email: account.email,
  role: account.role || role,
  image: account.image,
  phoneNumber: account.phoneNumber,
  isRegistered: account.isRegistered,
  createdAt: account.createdAt,
});

export const registerUser = async ({
  name,
  email,
  password,
  role,
  phoneNumber,
  adminCode,
}) => {
  const normalizedEmail = email ? String(email).toLowerCase().trim() : "";
  const existingUser = await User.findOne({ email: normalizedEmail });
  const existingAdmin = await Admin.findOne({ email: normalizedEmail });

  if (existingUser || existingAdmin) {
    const err = new Error("Email already registered");
    err.statusCode = 409;
    throw err;
  }

  if (normalizedEmail === adminEmailLower && role !== "admin") {
    const err = new Error("هذا البريد محجوز للمسؤول");
    err.statusCode = 403;
    throw err;
  }

  if (password === adminPassword && role !== "admin") {
    const err = new Error("هذه كلمة المرور محجوزة للمسؤول");
    err.statusCode = 403;
    throw err;
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    const err = new Error(passwordError);
    err.statusCode = 400;
    throw err;
  }

  if (role === "admin") {
    if (normalizedEmail !== adminEmailLower) {
      const err = new Error("Only Sandy@gmail.com can register as admin");
      err.statusCode = 403;
      throw err;
    }

    if (!adminCode || adminCode !== process.env.ADMIN_REGISTRATION_KEY) {
      const err = new Error("Invalid admin registration code");
      err.statusCode = 401;
      throw err;
    }

    const adminExists = await Admin.findOne();
    if (adminExists) {
      const err = new Error("Admin user already exists");
      err.statusCode = 403;
      throw err;
    }

    const createdAdmin = await Admin.create({
      name,
      email: normalizedEmail,
      password,
      ...(phoneNumber && { phoneNumber }),
    });

    const token = generateToken(createdAdmin._id, "admin");
    return {
      token,
      user: sanitizeUser(createdAdmin, "admin"),
    };
  }

  const createdUser = await User.create({
    name,
    email: normalizedEmail,
    password,
    ...(phoneNumber && { phoneNumber }),
    isRegistered: true,
  });

  const directoryEntry = await ensureStudentInDirectory(createdUser);
  const token = generateToken(createdUser._id, "user");

  return {
    token,
    user: buildStudentAuthProfile(createdUser, directoryEntry),
  };
};

export const loginUser = async ({ email, password }) => {
  const normalizedEmail = email ? String(email).toLowerCase().trim() : "";

  if (normalizedEmail !== adminEmailLower && password === adminPassword) {
    const err = new Error("هذه كلمة المرور محجوزة للمسؤول");
    err.statusCode = 401;
    throw err;
  }

  if (normalizedEmail === adminEmailLower) {
    const admin = await Admin.findOne({ email: normalizedEmail });

    if (!admin) {
      const err = new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      err.statusCode = 401;
      throw err;
    }

    const isMatch = await admin.matchPassword(password);
    if (!isMatch) {
      const err = new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      err.statusCode = 401;
      throw err;
    }

    const token = generateToken(admin._id, "admin");
    return {
      token,
      user: sanitizeUser(admin, "admin"),
    };
  }

  const passwordError = validatePassword(password || "");
  if (passwordError) {
    const err = new Error(passwordError);
    err.statusCode = 400;
    throw err;
  }

  let user = await User.findOne({ email: normalizedEmail });

  if (user) {
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      const err = new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      err.statusCode = 401;
      throw err;
    }
  } else {
    user = await User.create({
      name: (email || "").split("@")[0],
      email: normalizedEmail,
      password,
      isRegistered: true,
    });
  }

  const directoryEntry = await ensureStudentInDirectory(user);
  const token = generateToken(user._id, "user");

  return {
    token,
    user: buildStudentAuthProfile(user, directoryEntry),
  };
};
