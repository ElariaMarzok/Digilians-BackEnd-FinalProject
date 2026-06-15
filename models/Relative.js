import mongoose from "mongoose";

const relativeSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PermitStudentDirectory",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    relativeName: {
      type: String,
      required: true,
      trim: true,
    },
    relation: {
      type: String,
      required: true,
      trim: true,
    },
    nationalId: {
      type: String,
      trim: true,
      default: "",
    },
    birthDate: {
      type: String,
      trim: true,
      default: "",
    },
    job: {
      type: String,
      trim: true,
      default: "",
    },
    socialStatus: {
      type: String,
      trim: true,
      default: "",
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true },
);

const Relative = mongoose.model("Relative", relativeSchema, "relatives");

export default Relative;
