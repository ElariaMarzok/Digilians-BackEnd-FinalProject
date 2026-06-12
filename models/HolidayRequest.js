import mongoose from "mongoose";

/**
 * digililans_holiday_requests — طلبات الاجازات
 * يتم حفظها في الداتا بيز وتظهر للادمن للموافقة او الرفض
 */
const holidayRequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PermitStudentDirectory",
    required: true,
  },
  // Stored directly for reliability
  studentName: {
    type: String,
    required: true,
  },
  studentMilitaryId: {
    type: String,
    required: true,
  },
  studentEmail: {
    type: String,
    default: "",
  },
  reason: {
    type: String,
    required: true,
    trim: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  adminResponse: {
    type: String,
    default: "",
    trim: true,
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  reviewedAt: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

const HolidayRequest = mongoose.model(
  "HolidayRequest",
  holidayRequestSchema,
  "holiday_requests"
);

export default HolidayRequest;
