import mongoose from "mongoose";

const medicalRecordSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    studentName: {
      type: String,
      required: true,
      trim: true,
    },
    studentEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    militaryId: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: String,
      required: true,
      trim: true,
    },
    symptoms: {
      type: String,
      required: true,
      trim: true,
    },
    medications: {
      type: String,
      required: true,
      trim: true,
    },
    emergencyContact: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      default: "قيد المراجعة",
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

const MedicalRecord = mongoose.model(
  "MedicalRecord",
  medicalRecordSchema,
  "medical_records",
);

export default MedicalRecord;
