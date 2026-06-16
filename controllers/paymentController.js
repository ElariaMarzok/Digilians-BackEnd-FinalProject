import mongoose from "mongoose";
import StudentPayment from "../models/StudentPayment.js";
import User from "../models/User.js";
import PermitStudentDirectory from "../models/PermitStudentDirectory.js";

// 1. جلب سجل الطالب الحالي أو إنشاؤه (مع التحديث الحي للرقم العسكري)
export const getMyPayments = async (req, res) => {
  try {
    // 🔧 Fix: Use req.user._id directly as ObjectId, not converted to string
    const userId = req.user?._id;
    if (!userId) {
      console.error("❌ No user ID in request");
      return res.status(401).json({ success: false, message: "مستخدم غير مصرح به." });
    }
    
    console.log("🔍 getMyPayments: Looking for payments with userId:", userId);

    // 🔧 Fix: Use ObjectId directly for queries
    const userObjectId = userId instanceof mongoose.Types.ObjectId 
      ? userId 
      : new mongoose.Types.ObjectId(userId);

    // 🔍 جلب أحدث رقم عسكري من الدليل مباشرة قبل أيخطوة
    const directoryEntry = await PermitStudentDirectory.findOne({ user: userObjectId.toString() });
    const latestMilitaryId = directoryEntry?.militaryId || "0000000000";

    // 🔧 Fix: Query with ObjectId, not string
    let paymentRecord = await StudentPayment.findOne({ user: userObjectId });
    console.log("🔍 Found payment record:", paymentRecord ? "yes" : "no");

    if (!paymentRecord) {
      const studentUser = await User.findById(userObjectId);
      if (!studentUser) {
        console.error("❌ User not found:", userObjectId);
        return res.status(404).json({ success: false, message: "الطالب غير موجود." });
      }

      const currentYear = new Date().getFullYear();
      const monthsNames = [
        "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
        "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
      ];

      const initialMonths = monthsNames.map(month => ({
        monthName: `${month} ${currentYear}`,
        amount: 2500,
        status: "late",
        receiptUrl: null
      }));

      paymentRecord = new StudentPayment({
        user: studentUser._id,
        studentName: studentUser.name,
        militaryId: latestMilitaryId, // تعيين الرقم الحقيقي من الدليل
        months: initialMonths
      });

      await paymentRecord.save();
      console.log("✅ Created new payment record for user:", studentUser.name);
    } else {
      // 🔄 [تحديث حي] لو السجل موجود بس الرقم العسكري لسه أصفار أو قديم، بنحدثه فوراً
      if (paymentRecord.militaryId !== latestMilitaryId) {
        paymentRecord.militaryId = latestMilitaryId;
        await paymentRecord.save();
      }
    }

    return res.status(200).json({ success: true, data: paymentRecord });

  } catch (error) {
    console.error("Error fetching student payments:", error);
    return res.status(500).json({ success: false, message: "حدث خطأ أثناء جلب سجل المصاريف." });
  }
};

// 2. رفع إيصال شهر معين
export const uploadPaymentReceipt = async (req, res) => {
  try {
    const { monthId } = req.body;
    
    // 🔧 Fix: Use ObjectId properly
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "مستخدم غير مصرح به." });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "يرجى إرفاق ملف الإيصال." });
    }
    if (!monthId) {
      return res.status(400).json({ success: false, message: "معرّف الشهر غير موجود." });
    }

    // 🔧 Fix: Convert to ObjectId for query
    const userObjectId = userId instanceof mongoose.Types.ObjectId 
      ? userId 
      : new mongoose.Types.ObjectId(userId);

    const fileUrl = `/uploads/receipts/${req.file.filename}`;
    const paymentRecord = await StudentPayment.findOne({ user: userObjectId });
    if (!paymentRecord) {
      console.error("❌ Payment record not found for user:", userObjectId);
      return res.status(404).json({ success: false, message: "سجل المدفوعات غير موجود." });
    }

    console.log("🔍 Looking for monthId:", monthId);

    // 🔧 Fix: Check if monthId is a valid ObjectId or match by string
    let month;
    if (mongoose.Types.ObjectId.isValid(monthId) && monthId.length === 24) {
      month = paymentRecord.months.id(new mongoose.Types.ObjectId(monthId));
    }
    // If not found by ObjectId, try finding by string match
    if (!month) {
      month = paymentRecord.months.find(m => m._id.toString() === monthId);
    }
    // If still not found, try alternative matching approaches
    if (!month) {
      // Try matching by _id equals
      month = paymentRecord.months.find(m => String(m._id) === monthId);
    }
    // Last resort: check if the ID is in the array (for "static-1" type IDs)
    if (!month) {
      for (const m of paymentRecord.months) {
        if (m._id.toString() === monthId || m._id.toString() === monthId.replace('static-', '')) {
          month = m;
          break;
        }
      }
    }
    
    if (!month) {
      console.error("❌ Month not found:", monthId);
      return res.status(404).json({ success: false, message: "الشهر المحدد غير موجود." });
    }

    console.log("✅ Found month:", month.monthName);

    month.status = "under_review";
    month.receiptUrl = fileUrl;
    month.updatedAt = new Date();

    await paymentRecord.save();
    console.log("✅ Receipt uploaded successfully");
    return res.status(200).json({ success: true, message: "تم رفع الإيصال بنجاح وهو تحت المراجعة." });

  } catch (error) {
    console.error("Error uploading receipt:", error);
    return res.status(500).json({ success: false, message: `حدث خطأ أثناء رفع الإيصال: ${error.message}` });
  }
};

// 3. [الأدمن] جلب كل السجلات (مع دمج وتحديث الأرقام العسكرية حياً)
// يُرجع فقط الشهور التي تم رفع إيصال لها (under_review أو paid)
export const getAllPaymentsForAdmin = async (req, res) => {
  try {
    const { showAll } = req.query; // Query param to show all months if needed
    
    // جلب السجلات كـ كائنات مرنة قابلة للتعديل العاجل باستخدام lean()
    const allRecords = await StudentPayment.find().sort({ updatedAt: -1 }).lean();

    // 🔄 Loop على كل سجلات الطلاب لتحديث الـ militaryId من الدليل بشكل متزامن وسريع
    const updatedRecords = await Promise.all(
      allRecords.map(async (record) => {
        const directoryEntry = await PermitStudentDirectory.findOne({ user: record.user });
        
        // 🔧 فلتره: إذا لم يُطلب إظهار كل الشهور، اعرض فقط الشهور التي بها إيصال مرفوع
        let filteredMonths = record.months;
        if (!showAll) {
          // اعرض فقط الشهور التي تم رفع إيصال لها (under_review أو paid)
          filteredMonths = record.months.filter(m => 
            m.status === 'under_review' || m.status === 'paid'
          );
        }
        
        return {
          ...record,
          months: filteredMonths,
          militaryId: directoryEntry?.militaryId || record.militaryId || "0000000000"
        };
      })
    );

    // لو طلب إظهار كل الشهور استخدم ?showAll=true
    return res.status(200).json({ success: true, data: updatedRecords });
  } catch (error) {
    console.error("Error fetching admin payments:", error);
    return res.status(500).json({ success: false, message: "حدث خطأ أثناء جلب السجلات." });
  }
};

// 4. [الأدمن] قبول أو رفض إيصال
export const verifyStudentPayment = async (req, res) => {
  try {
    const { studentId, monthId, action } = req.body;

    if (!studentId || !monthId || !action) {
      return res.status(400).json({ success: false, message: "جميع الحقول مطلوبة." });
    }

    const paymentRecord = await StudentPayment.findById(studentId);
    if (!paymentRecord) {
      return res.status(404).json({ success: false, message: "سجل الطالب غير موجود." });
    }

    // 🔧 Fix: Check if monthId is a valid ObjectId or match by string
    let month;
    if (mongoose.Types.ObjectId.isValid(monthId)) {
      month = paymentRecord.months.id(new mongoose.Types.ObjectId(monthId));
    }
    // If not found by ObjectId, try finding by string match
    if (!month) {
      month = paymentRecord.months.find(m => m._id.toString() === monthId);
    }
    // If still not found, try alternative matching approaches
    if (!month) {
      for (const m of paymentRecord.months) {
        if (m._id.toString() === monthId) {
          month = m;
          break;
        }
      }
    }

    if (!month) {
      return res.status(404).json({ success: false, message: "الشهر غير موجود." });
    }

    if (action === "approve") {
      month.status = "paid";
    } else if (action === "reject") {
      month.status = "late";
      month.receiptUrl = null; // مسح الإيصال المرفوض لفتح الرفع مجدداً
    } else {
      return res.status(400).json({ success: false, message: "إجراء غير معروف." });
    }

    month.updatedAt = new Date();
    // جعل التاريخ الكلي يتحدث ليعمل الـ sorting للأدمن صح فوراً
    paymentRecord.updatedAt = new Date(); 
    
    await paymentRecord.save();
    return res.status(200).json({ success: true, message: "تم تحديث حالة الدفع بنجاح." });

  } catch (error) {
    console.error("Error verifying payment:", error);
    return res.status(500).json({ success: false, message: "حدث خطأ." });
  }
};
