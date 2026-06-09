import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Admin from "../models/Admin.js";

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log('🔐 authMiddleware: Authorization header:', authHeader ? 'Present' : 'Missing');

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log('❌ No token provided');
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  console.log('🔐 Token:', token.substring(0, 20) + '...');

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "default_secret",
    );
    console.log('✅ Token decoded:', decoded);

    let account = null;

    if (decoded.accountType === "admin") {
      account = await Admin.findById(decoded.id).select("-password");
    } else if (decoded.accountType === "user") {
      account = await User.findById(decoded.id).select("-password");
    } else {
      account = await User.findById(decoded.id).select("-password");
      if (!account) {
        account = await Admin.findById(decoded.id).select("-password");
      }
    }

    if (!account) {
      console.log('❌ Account not found');
      return res.status(401).json({
        message:
          "الحساب غير موجود — سجّل الدخول من جديد (قد تكون البيانات اتعملها reset)",
      });
    }

    req.user = {
      ...account.toObject(),
      role: account.role || "student",
    };
    console.log('✅ User role:', req.user.role);

    next();
  } catch (err) {
    console.log('❌ Token error:', err.message);
    return res.status(401).json({ message: "Token is invalid or expired" });
  }
};

export const adminOnlyMiddleware = (req, res, next) => {
  console.log('🔒 adminOnlyMiddleware: Checking role:', req.user.role);
  if (req.user.role !== "admin") {
    console.log('❌ User is not admin');
    return res.status(403).json({
      success: false,
      message: "غير مصرح لك بالوصول",
    });
  }

  console.log('✅ Admin access granted');
  next();
};

export default authMiddleware;
