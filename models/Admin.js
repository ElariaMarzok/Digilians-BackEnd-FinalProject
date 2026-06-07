import mongoose from "mongoose";
import bcrypt from "bcrypt";

/**
 * [2] admins — تسجيل دخول الأدمن فقط (Sandy@gmail.com)
 */
const adminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    name: {
      type: String,
      trim: true,
      default: "Sandy Admin",
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
        "https://ui-avatars.com/api/?name=Admin&background=eee&color=888&size=160",
    },
    isRegistered: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
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
  return bcrypt.compare(enteredPassword, this.password);
};

const Admin = mongoose.model("Admin", adminSchema, "admins");

export default Admin;
