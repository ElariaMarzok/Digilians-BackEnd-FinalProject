import StudentPayment from "../models/StudentPayment.js";
import User from "../models/User.js";
import PermitStudentDirectory from "../models/PermitStudentDirectory.js";

// 1. جلب سجل الطالب الحالي أو إنشاؤه (مع التحديث الحي للرقم العسكري)
export const getMyPayments = async (req, res) => {
  try {
    const userId = req.user?._id ? req.user._id.toString() : req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "مستخدم غير مصرح به." });
    }

    // 🔍 جلب أحدث رقم عسكري من الدليل مباشرة قبل أي خطوة
    const directoryEntry = await PermitStudentDirectory.findOne({ user: userId });
    const latestMilitaryId = directoryEntry?.militaryId || "0000000000";

    let paymentRecord = await StudentPayment.findOne({ user: userId });

    if (!paymentRecord) {
      const studentUser = await User.findById(userId);
      if (!studentUser) {
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
    const userId = req.user?._id ? req.user._id.toString() : req.user?.id;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "يرجى إرفاق ملف الإيصال." });
    }
    if (!monthId) {
      return res.status(400).json({ success: false, message: "معرّف الشهر غير موجود." });
    }

    const fileUrl = `/uploads/receipts/${req.file.filename}`;
    const paymentRecord = await StudentPayment.findOne({ user: userId });
    if (!paymentRecord) {
      return res.status(404).json({ success: false, message: "سجل المدفوعات غير موجود." });
    }

    const month = paymentRecord.months.id(monthId);
    if (!month) {
      return res.status(404).json({ success: false, message: "الشهر المحدد غير موجود." });
    }

    month.status = "under_review";
    month.receiptUrl = fileUrl;
    month.updatedAt = new Date();

    await paymentRecord.save();
    return res.status(200).json({ success: true, message: "تم رفع الإيصال بنجاح وهو تحت المراجعة." });

  } catch (error) {
    console.error("Error uploading receipt:", error);
    return res.status(500).json({ success: false, message: "حدث خطأ أثناء رفع الإيصال." });
  }
};

// 3. [الأدمن] جلب كل السجلات (مع دمج وتحديث الأرقام العسكرية حياً)
export const getAllPaymentsForAdmin = async (req, res) => {
  try {
    // جلب السجلات كـ كائنات مرنة قابلة للتعديل العاجل باستخدام lean()
    const allRecords = await StudentPayment.find().sort({ updatedAt: -1 }).lean();

    // 🔄 Loop على كل سجلات الطلاب لتحديث الـ militaryId من الدليل بشكل متزامن وسريع
    const updatedRecords = await Promise.all(
      allRecords.map(async (record) => {
        const directoryEntry = await PermitStudentDirectory.findOne({ user: record.user });
        return {
          ...record,
          militaryId: directoryEntry?.militaryId || record.militaryId || "0000000000"
        };
      })
    );

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

    const month = paymentRecord.months.id(monthId);
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