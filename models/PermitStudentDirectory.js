import mongoose from "mongoose";

/**
 * [3] permit_student_directory — الطلاب الموجودين فعلياً في الأكاديمية
 * (اسم + إيميل + رقم عسكري)
 * الأدمن مايقدرش يضيف غير طالب موجود هنا
 */
const permitStudentDirectorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    militaryId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
  },
  { timestamps: true },
);

const PermitStudentDirectory = mongoose.model(
  "PermitStudentDirectory",
  permitStudentDirectorySchema,
  "permit_student_directory",
);

export default PermitStudentDirectory;
