import mongoose from "mongoose";

const punishmentSchema = new mongoose.Schema(
  {
    studentName: {
      type: String,
      required: [true, "Student name is required"],
      trim: true,
    },
    militaryNum: {
      type: String,
      required: [true, "Military number is required"],
      trim: true,
      index: true,
    },
    gender: {
      type: String,
      trim: true,
      lowercase: true,
      enum: ["male", "female", "other"],
      default: "male",
    },
    violation: {
      type: String,
      required: [true, "Violation is required"],
      trim: true,
    },
    punishment: {
      type: String,
      required: [true, "Punishment description is required"],
      trim: true,
    },
    degree: {
      type: Number,
      default: 0,
      min: 0,
    },
    comment: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true },
);

const Punishment = mongoose.model("Punishment", punishmentSchema, "punishments");
export default Punishment;
