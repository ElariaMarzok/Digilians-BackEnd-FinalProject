// Digilians-BackEnd-FinalProject/controllers/medical.controller.js
import MedicalRecord from '../models/MedicalRecord.js';

// // 1. إضافة سجل طبي جديد (الطالب)
// export const addMedicalRecord = async (req, res) => {
//   try {
//     const newRecord = new MedicalRecord({
//       ...req.body,
//       user: req.user.id // ربط السجل بمعرف الطالب المسجل حالياً
//     });
//     const savedRecord = await newRecord.save();
//     return res.status(201).json({ success: true, data: savedRecord });
//   } catch (error) {
//     console.error('Error adding medical record:', error);
//     return res.status(500).json({ message: 'حدث خطأ أثناء إضافة السجل الطبي.' });
//   }
// };

// 1. إضافة سجل طبي جديد (الطالب)
export const addMedicalRecord = async (req, res) => {
  try {
    // 🪵 أسطر لمراقبة البيانات القادمة في الـ Terminal
    console.log("📌 Body received from Front-end:", req.body);
    console.log("📌 User Object from Token:", req.user);

    const newRecord = new MedicalRecord({
      ...req.body,
      // تأمين جلب الـ id سواء كان مخزنًا كـ id أو _id داخل الـ token middleware
      user: req.user?._id || req.user?.id 
    });

    const savedRecord = await newRecord.save();
    return res.status(201).json({ success: true, data: savedRecord });
  } catch (error) {
    // ❌ طباعة الخطأ بالتفصيل في ترمينال الباك إند
    console.error('❌ Mongoose Error Details:', error);

    return res.status(500).json({ 
      message: 'حدث خطأ أثناء إضافة السجل الطبي.',
      error: error.message // 🌟 تمرير نص الخطأ للفرونت إند لنعرف السبب فوراً
    });
  }
};

// 2. جلب السجلات الطبية الخاصة بالطالب الحالي
// export const getMyMedicalRecords = async (req, res) => {
//   try {
//     const records = await MedicalRecord.find({ user: req.user.id }).sort({ createdAt: -1 });
//     return res.status(200).json({ success: true, data: records });
//   } catch (error) {
//     console.error('Error fetching user medical records:', error);
//     return res.status(500).json({ message: 'حدث خطأ أثناء جلب سجلاتك الطبية.' });
//   }
// };
// جلب السجلات الطبية الخاصة بالطالب المسجل حالياً فقط
export const getMyMedicalRecords = async (req, res) => {
  try {
    // البحث في قاعدة البيانات عن السجلات التي تخص الـ user id القادم من التوكن
    const records = await MedicalRecord.find({ user: req.user._id || req.user.id }).sort({ createdAt: -1 });
    
    // 🌟 إرجاع البيانات داخل كائن data ليتوافق تماماً مع الفرونت إند
    return res.status(200).json({ 
      success: true, 
      data: records 
    });
  } catch (error) {
    console.error('Error fetching medical records:', error);
    return res.status(500).json({ message: 'حدث خطأ أثناء جلب السجلات الطبية.' });
  }
};

// 3. جلب كافة السجلات الطبية (الأدمن)
export const getAllMedicalRecords = async (req, res) => {
  try {
    const records = await MedicalRecord.find({}).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: records });
  } catch (error) {
    console.error('Error fetching all medical records:', error);
    return res.status(500).json({ message: 'حدث خطأ أثناء جلب كافة السجلات الطبية.' });
  }
};

// 4. جلب إحصائيات السجلات الطبية (الأدمن)
export const getMedicalStatsController = async (req, res) => {
  try {
    const totalStudentsCount = await MedicalRecord.countDocuments({});
    const uniquePatients = await MedicalRecord.distinct('user');
    const uniquePatientsCount = uniquePatients.length;

    return res.status(200).json({
      totalStudentsCount,
      uniquePatientsCount
    });
  } catch (error) {
    console.error('Error fetching medical stats:', error);
    return res.status(500).json({ message: 'حدث خطأ أثناء جلب الإحصائيات الطبية.' });
  }
};

// 5. التعديل الكلي للسجل الطبي بواسطة الـ ID
export const patchMedicalRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await MedicalRecord.findByIdAndUpdate(id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'السجل غير موجود' });
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error('Error patching medical record:', error);
    return res.status(500).json({ message: 'حدث خطأ أثناء تعديل السجل الطبي.' });
  }
};

// 6. حذف السجل الطبي بواسطة الـ ID
export const removeMedicalRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await MedicalRecord.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'السجل غير موجود' });
    return res.status(200).json({ success: true, message: 'تم حذف السجل بنجاح' });
  } catch (error) {
    console.error('Error removing medical record:', error);
    return res.status(500).json({ message: 'حدث خطأ أثناء حذف السجل الطبي.' });
  }
};

// 7. 🔥 الدالة المحدثة: تحديث حالة السجل من قبل الأدمن (عبر الـ Body)
export const updateMedicalStatus = async (req, res) => {
  try {
    const { id, status } = req.body; 

    if (!id || !status) {
      return res.status(400).json({ message: 'حقول المعرف (id) والحالة (status) مطلوبة.' });
    }

    const updatedRecord = await MedicalRecord.findByIdAndUpdate(
      id,
      { status: status },
      { new: true, runValidators: true }
    );

    if (!updatedRecord) {
      return res.status(404).json({ message: 'السجل الطبي المطلوب غير موجود.' });
    }

    console.log(`✅ Status successfully updated in DB for record ${id} to: ${status}`);
    
    return res.status(200).json({ 
      success: true, 
      message: 'تم تحديث الحالة بنجاح', 
      data: updatedRecord 
    });

  } catch (error) {
    console.error('Error in updateMedicalStatus controller:', error);
    return res.status(500).json({ message: 'حدث خطأ داخلي في السيرفر أثناء التحديث.' });
  }
};