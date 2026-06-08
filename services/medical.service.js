import MedicalRecord from "../models/MedicalRecord.js";
import User from "../models/User.js";

const normalizeEmergencyContact = (contact) => {
  const digits = String(contact || "").replace(/\D/g, "");
  return digits.startsWith("20") && digits.length === 13 ? digits.slice(2) : digits;
};

const isValidEmergencyContact = (contact) => {
  const normalized = normalizeEmergencyContact(contact);
  return /^(010|011|012)\d{8}$/.test(normalized);
};

const isValidMedicalDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== "string") {
    return false;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return false;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date <= today;
};

const generateRandomFiveDigitMilitaryId = async () => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const randomId = Math.floor(10000 + Math.random() * 90000).toString();
    const exists = await MedicalRecord.findOne({ militaryId: randomId });
    if (!exists) {
      return randomId;
    }
  }

  return Math.floor(10000 + Math.random() * 90000).toString();
};

export const createMedicalRecord = async ({
  userId,
  studentName,
  studentEmail,
  date,
  symptoms,
  medications,
  emergencyContact,
}) => {
  if (!isValidMedicalDate(date)) {
    const err = new Error("التاريخ غير صالح أو تاريخ مستقبلي");
    err.statusCode = 400;
    throw err;
  }

  if (!isValidEmergencyContact(emergencyContact)) {
    const err = new Error("رقم الطوارئ يجب أن يبدأ بـ 010 أو 011 أو 012 ويتكون من 11 رقماً");
    err.statusCode = 400;
    throw err;
  }

  const normalizedEmail = studentEmail ? studentEmail.toLowerCase().trim() : "";
  const normalizedContact = normalizeEmergencyContact(emergencyContact);
  let existingRecord = null;

  if (userId) {
    existingRecord = await MedicalRecord.findOne({ user: userId });
  }

  if (!existingRecord && normalizedEmail) {
    existingRecord = await MedicalRecord.findOne({ studentEmail: normalizedEmail });
  }

  const militaryId = existingRecord
    ? existingRecord.militaryId
    : await generateRandomFiveDigitMilitaryId();

  if (normalizedEmail && existingRecord) {
    await MedicalRecord.updateMany(
      { studentEmail: normalizedEmail, militaryId: { $ne: militaryId } },
      { militaryId },
    );
  }

  const record = await MedicalRecord.create({
    user: userId,
    studentName,
    studentEmail: normalizedEmail,
    militaryId,
    date,
    symptoms,
    medications,
    emergencyContact: normalizedContact,
    status: "قيد المراجعة",
  });

  return record.toObject();
};

export const getMedicalStats = async () => {
  const totalStudentsCount = await User.countDocuments();
  const uniquePatients = await MedicalRecord.distinct("studentEmail", {
    studentEmail: { $exists: true, $ne: "" },
  });

  return {
    totalStudentsCount,
    uniquePatientsCount: uniquePatients.length,
  };
};

export const getUserMedicalRecords = async (userId) => {
  const records = await MedicalRecord.find({ user: userId }).sort({
    createdAt: -1,
  });
  return records.map((record) => record.toObject());
};

export const getAllMedicalRecords = async () => {
  const records = await MedicalRecord.find({}).sort({ createdAt: -1 });
  return records.map((record) => record.toObject());
};

export const updateMedicalRecord = async ({ recordId, userId, role, updates }) => {
  const record = await MedicalRecord.findById(recordId);

  if (!record) {
    const err = new Error("السجل الطبي غير موجود");
    err.statusCode = 404;
    throw err;
  }

  if (role !== "admin" && record.user.toString() !== userId.toString()) {
    const err = new Error("غير مصرح بتعديل هذا السجل");
    err.statusCode = 403;
    throw err;
  }

  if (updates.date && !isValidMedicalDate(updates.date)) {
    const err = new Error("التاريخ غير صالح أو تاريخ مستقبلي");
    err.statusCode = 400;
    throw err;
  }

  if (updates.emergencyContact && !isValidEmergencyContact(updates.emergencyContact)) {
    const err = new Error("رقم الطوارئ يجب أن يبدأ بـ 010 أو 011 أو 012 ويتكون من 11 رقماً");
    err.statusCode = 400;
    throw err;
  }

  if (updates.emergencyContact) {
    updates.emergencyContact = normalizeEmergencyContact(updates.emergencyContact);
  }

  Object.assign(record, updates);
  await record.save();
  return record.toObject();
};

export const updateMedicalRecordsStatus = async ({ studentEmail, status }) => {
  const allowedStatuses = ["قيد المراجعة", "حرج", "تم قبول"];
  if (!allowedStatuses.includes(status)) {
    const err = new Error("حالة غير صالحة");
    err.statusCode = 400;
    throw err;
  }

  // يمكن أن يكون studentEmail إما بريد إلكتروني أو _id
  let query;
  
  if (studentEmail.match(/^[a-f\d]{24}$/i)) {
    // إذا كان معرف MongoDB
    query = { _id: studentEmail };
  } else if (studentEmail.includes('@')) {
    // إذا كان بريد إلكتروني
    const normalizedEmail = studentEmail.toLowerCase().trim();
    query = { studentEmail: normalizedEmail };
  } else {
    // محاولة البحث بأي شيء
    query = { 
      $or: [
        { _id: studentEmail },
        { studentEmail: studentEmail.toLowerCase().trim() },
        { militaryId: studentEmail }
      ]
    };
  }

  const updateResult = await MedicalRecord.updateMany(query, { status });

  if (!updateResult.matchedCount) {
    const err = new Error("لم يتم العثور على سجلات لهذا الطالب");
    err.statusCode = 404;
    throw err;
  }

  const records = await MedicalRecord.find(query).sort({ createdAt: -1 });
  return records.map((record) => record.toObject());
};

export const deleteMedicalRecord = async ({ recordId, userId, role }) => {
  const record = await MedicalRecord.findById(recordId);

  if (!record) {
    const err = new Error("السجل الطبي غير موجود");
    err.statusCode = 404;
    throw err;
  }

  if (role !== "admin" && record.user.toString() !== userId.toString()) {
    const err = new Error("غير مصرح بحذف هذا السجل");
    err.statusCode = 403;
    throw err;
  }

  await record.deleteOne();
  return { deleted: true };
};
