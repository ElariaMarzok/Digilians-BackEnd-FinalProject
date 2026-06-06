import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Admin from "../models/Admin.js";

const adminEmail = "Sandy@gmail.com";
const adminEmailLower = adminEmail.toLowerCase();
const adminPassword = "Sandy123@";

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

const validatePassword = (password) => {
  // Reject digits-only passwords
  const numberCount = (password.match(/\d/g) || []).length;
  const letterCount = (password.match(/[A-Za-z]/g) || []).length;

  if (numberCount === password.length) {
    return "كلمة المرور لا يمكن أن تكون أرقامًا فقط";
  }

  if (letterCount < 4) {
    return "كلمة المرور يجب أن تحتوي على 4 أحرف على الأقل";
  }

  // Check if starts with capital letter
  if (!/^[A-Z]/.test(password)) {
    return "كلمة المرور يجب أن تبدأ بحرف كابيتال";
  }

  // Check length (4-15 characters)
  if (password.length < 4 || password.length > 15) {
    return "كلمة المرور يجب أن تكون بين 4 و 15 حرفًا";
  }

  if (numberCount === 0) {
    return "كلمة المرور يجب أن تحتوي على رقم واحد على الأقل";
  }
  if (numberCount > 10) {
    return "كلمة المرور يجب أن تحتوي على 10 أرقام على الأكثر";
  }

  return null; // Valid password
};

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  militaryId: user.militaryId,
  role: user.role,
  image: user.image,
  phoneNumber: user.phoneNumber,
  preferredLanguage: user.preferredLanguage,
  isRegistered: user.isRegistered,
  createdAt: user.createdAt,
});

export const registerUser = async ({
  name,
  email,
  password,
  role,
  phoneNumber,
  militaryId,
  adminCode,
}) => {
  const normalizedEmail = email ? String(email).toLowerCase().trim() : "";
  const existingRegularUser = await User.findOne({ email: normalizedEmail });
  const existingAdminUser = await Admin.findOne({ email: normalizedEmail });

  if (existingRegularUser || existingAdminUser) {
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

  // Validate password
  const passwordError = validatePassword(password);
  if (passwordError) {
    const err = new Error(passwordError);
    err.statusCode = 400;
    throw err;
  }

  if (militaryId) {
    const existingMilitaryId = await User.findOne({ militaryId });

    if (existingMilitaryId) {
      const err = new Error("Military ID already registered");
      err.statusCode = 409;
      throw err;
    }
  }

  let userRole = "student";
  let createdUser = null;

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

    const existingAdmin = await Admin.findOne({ role: "admin" });
    if (existingAdmin) {
      const err = new Error("Admin user already exists");
      err.statusCode = 403;
      throw err;
    }

    userRole = "admin";
    createdUser = await Admin.create({
      name,
      email: normalizedEmail,
      password,
      role: userRole,
      ...(phoneNumber && { phoneNumber }),
      isRegistered: true,
    });
  } else {
    createdUser = await User.create({
      name,
      email: normalizedEmail,
      password,
      role: userRole,
      ...(phoneNumber && { phoneNumber }),
      ...(militaryId && { militaryId }),
      isRegistered: true,
    });
  }

  const token = generateToken(createdUser._id);

  return {
    token,
    user: sanitizeUser(createdUser),
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
    // Admin login - STRICT password checking only
    console.log("[auth.service] Admin login attempt for", normalizedEmail);
    const admin = await Admin.findOne({ email: normalizedEmail }).select(
      "+password",
    );
    console.log("[auth.service] Admin lookup result:", !!admin);

    if (!admin) {
      const err = new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      err.statusCode = 401;
      throw err;
    }

    // Verify password matches exactly for admin
    const isMatch = await admin.matchPassword(password);
    console.log("[auth.service] Admin password match:", isMatch);
    if (!isMatch) {
      const err = new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      err.statusCode = 401;
      throw err;
    }

    const token = generateToken(admin._id);
    return {
      token,
      user: sanitizeUser(admin),
    };
  }

  // Regular users - validate password before auto-creating a new account
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
    // Auto-create user on first login with validated password
    user = await User.create({
      name: (email || "").split("@")[0],
      email: normalizedEmail,
      password: password,
      role: "student",
      isRegistered: true,
    });
  }

  const token = generateToken(user._id);
  return {
    token,
    user: sanitizeUser(user),
  };
};
