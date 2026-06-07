import mongoose from "mongoose";

/**
 * [4] permit_admin_additions — الناس اللي الأدمن بيعملها إضافة في جدول التصريح
 * يُنشأ فقط لو الطالب موجود في permit_student_directory
 * Delete يمسح السجل من هنا ومن الجدول
 */
const permitAdminAdditionSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PermitStudentDirectory",
      required: true,
    },
    arrivedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["present", "late"],
      required: true,
    },
    deduction: {
      type: Number,
      default: 0,
      min: 0,
    },
    permitType: {
      type: String,
      default: "اعتيادي",
      trim: true,
    },
    note: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true },
);

const PermitAdminAddition = mongoose.model(
  "PermitAdminAddition",
  permitAdminAdditionSchema,
  "permit_admin_additions",
);

export default PermitAdminAddition;
