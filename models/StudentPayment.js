import mongoose from "mongoose";

// 1. كائن الشهر الفرعي داخل المصفوفة
const monthPaymentSchema = new mongoose.Schema({
  monthName: { type: String, required: true }, // مثال: "يناير 2026"
  amount: { type: Number, default: 2500 },
  status: { 
    type: String, 
    enum: ["pending", "under_review", "paid", "late"], 
    default: "pending" 
  },
  receiptUrl: { type: String, default: null },
  updatedAt: { type: Date, default: Date.now }
});

// 2. الموديل الرئيسي للطالب
const studentPaymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true // سجل واحد فقط لكل مستخدم يحتوي على الـ 12 شهر
  },
  studentName: { type: String, required: true },
  militaryId: { type: String, default: "0000000000" },
  months: [monthPaymentSchema] // مصفوفة الشهور الاثني عشر
}, { timestamps: true });

const StudentPayment = mongoose.model("StudentPayment", studentPaymentSchema);
export default StudentPayment;