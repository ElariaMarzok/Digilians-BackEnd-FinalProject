import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Admin from "../models/Admin.js";

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "default_secret",
    );

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
      return res.status(401).json({
        message:
          "الحساب غير موجود — سجّل الدخول من جديد (قد تكون البيانات اتعملها reset)",
      });
    }

    req.user = {
      ...account.toObject(),
      role: account.role || "student",
    };

    next();
  } catch (err) {
    return res.status(401).json({ message: "Token is invalid or expired" });
  }
};

export const adminOnlyMiddleware = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "غير مصرح لك بالوصول",
    });
  }

  next();
};

export default authMiddleware;
