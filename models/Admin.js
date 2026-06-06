import mongoose from "mongoose";
import bcrypt from "bcrypt";
import crypto from "crypto";

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },

    militaryId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },

    role: {
      type: String,
      enum: ["admin"],
      default: "admin",
    },

    phoneNumber: {
      type: String,
      trim: true,
    },

    image: {
      type: String,
      default:
        "https://ui-avatars.com/api/?name=User&background=eee&color=888&size=160",
    },

    title: String,

    bio: String,

    preferredLanguage: {
      type: [String],
      enum: ["arabic", "english"],
      default: ["english"],
    },

    isRegistered: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

adminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

adminSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

adminSchema.methods.generatePasswordReset = function () {
  const token = crypto.randomBytes(20).toString("hex");

  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  this.resetPasswordExpires = Date.now() + 3600000; // 1 hour

  return token;
};

const Admin = mongoose.model("Admin", adminSchema, "admins");

export default Admin;
