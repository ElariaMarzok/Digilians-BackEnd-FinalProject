import Punishment from "../models/Punishment.model.js";

// جيب كل العقوبات (Admin)
export async function getAllPunishments() {
  return await Punishment.find().sort({ createdAt: -1 });
}

// أضف عقوبة جديدة
export async function createPunishment(data) {
  const record = new Punishment(data);
  return await record.save();
}

// عدّل عقوبة
export async function updatePunishment(id, data) {
  const updated = await Punishment.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
  if (!updated) {
    const err = new Error("Punishment not found");
    err.statusCode = 404;
    throw err;
  }
  return updated;
}

// احذف عقوبة
export async function deletePunishment(id) {
  const deleted = await Punishment.findByIdAndDelete(id);
  if (!deleted) {
    const err = new Error("Punishment not found");
    err.statusCode = 404;
    throw err;
  }
}

// جيب المخالفات بتاعت الطالب (بـ militaryNum)
export async function getStudentPunishments(militaryNum) {
  return await Punishment.find({ militaryNum }).sort({ createdAt: -1 });
}

// جيب الإحصائيات بتاعت الطالب
export async function getStudentPunishmentsStats(militaryNum) {
  const punishments = await Punishment.find({ militaryNum });

  const totalPunishments = punishments.length;
  const deductedPoints = punishments.reduce((sum, p) => sum + p.degree, 0);
  const remainingPoints = 100 - deductedPoints; // assuming max 100

  return {
    totalPunishments,
    deductedPoints,
    remainingPoints,
    punishments,
  };
}