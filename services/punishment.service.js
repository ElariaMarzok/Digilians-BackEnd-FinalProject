import Punishment from "../models/Punishment.model.js";
import { normalizeArabicSearchText } from "../utils/arabicNormalize.js";

const UNAVAILABLE_LABEL = "\u063a\u064a\u0631 \u0645\u062a\u0648\u0641\u0631";
const WARNING_KEYWORD = "\u0627\u0646\u0630\u0627\u0631";

function toSafeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeWarningSource(record = {}) {
  return normalizeArabicSearchText(
    `${record.punishment || ""} ${record.violation || ""}`,
  );
}

function isWarningRecord(record = {}) {
  const sourceText = normalizeWarningSource(record);
  return sourceText.includes(WARNING_KEYWORD);
}

function buildWarningStudent(record = {}) {
  return {
    studentName: String(record.studentName || "").trim() || UNAVAILABLE_LABEL,
    militaryId: String(record.militaryNum || "").trim() || UNAVAILABLE_LABEL,
    warningCount: 0,
    totalDeductedDegrees: 0,
    latestWarningDate: null,
    latestViolation: "",
    latestWarningDateValue: 0,
  };
}

function formatWarningStudent(student = {}) {
  return {
    studentName: student.studentName || UNAVAILABLE_LABEL,
    militaryId: student.militaryId || UNAVAILABLE_LABEL,
    warningCount: student.warningCount || 0,
    totalDeductedDegrees: student.totalDeductedDegrees || 0,
    latestWarningDate: student.latestWarningDate || UNAVAILABLE_LABEL,
    latestViolation: student.latestViolation || UNAVAILABLE_LABEL,
  };
}

function sortWarningStudents(first, second) {
  if ((second.warningCount || 0) !== (first.warningCount || 0)) {
    return (second.warningCount || 0) - (first.warningCount || 0);
  }

  return (second.latestWarningDateValue || 0) - (first.latestWarningDateValue || 0);
}

export async function getAllPunishments() {
  return await Punishment.find().sort({ createdAt: -1 });
}

export async function createPunishment(data) {
  const record = new Punishment(data);
  return await record.save();
}

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

export async function deletePunishment(id) {
  const deleted = await Punishment.findByIdAndDelete(id);

  if (!deleted) {
    const err = new Error("Punishment not found");
    err.statusCode = 404;
    throw err;
  }
}

export async function getStudentPunishments(militaryNum) {
  return await Punishment.find({ militaryNum }).sort({ createdAt: -1 });
}

export async function getStudentPunishmentsStats(militaryNum) {
  const punishments = await Punishment.find({ militaryNum });

  const totalPunishments = punishments.length;
  const deductedPoints = punishments.reduce((sum, p) => sum + p.degree, 0);
  const remainingPoints = 100 - deductedPoints;

  return {
    totalPunishments,
    deductedPoints,
    remainingPoints,
    punishments,
  };
}

export async function getAdminWarningSummary() {
  const records = await Punishment.find()
    .select("studentName militaryNum violation punishment degree createdAt")
    .sort({ createdAt: 1 })
    .lean();

  const studentsMap = new Map();

  records.forEach((record) => {
    if (!isWarningRecord(record)) {
      return;
    }

    const militaryId = String(record.militaryNum || "").trim();
    const fallbackName = String(record.studentName || "").trim();
    const key = militaryId || fallbackName || String(record._id);

    const current = studentsMap.get(key) || buildWarningStudent(record);
    const recordTime = new Date(record.createdAt || Date.now()).getTime();

    current.studentName = fallbackName || current.studentName || UNAVAILABLE_LABEL;
    current.militaryId = militaryId || current.militaryId || UNAVAILABLE_LABEL;
    current.warningCount += 1;
    current.totalDeductedDegrees += toSafeNumber(record.degree);

    if (!current.latestWarningDateValue || recordTime >= current.latestWarningDateValue) {
      current.latestWarningDateValue = recordTime;
      current.latestWarningDate = record.createdAt
        ? new Date(record.createdAt).toLocaleDateString("ar-EG", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          })
        : UNAVAILABLE_LABEL;
      current.latestViolation =
        String(record.violation || "").trim() ||
        String(record.punishment || "").trim() ||
        UNAVAILABLE_LABEL;
    }

    studentsMap.set(key, current);
  });

  const oneWarningStudents = [];
  const twoWarningsStudents = [];
  const dismissedStudents = [];

  studentsMap.forEach((student) => {
    if (student.warningCount === 1) {
      oneWarningStudents.push(student);
      return;
    }

    if (student.warningCount === 2) {
      twoWarningsStudents.push(student);
      return;
    }

    if (student.warningCount >= 3) {
      dismissedStudents.push(student);
    }
  });

  const oneWarning = oneWarningStudents.sort(sortWarningStudents).map(formatWarningStudent);
  const twoWarnings = twoWarningsStudents.sort(sortWarningStudents).map(formatWarningStudent);
  const dismissed = dismissedStudents.sort(sortWarningStudents).map(formatWarningStudent);

  return {
    oneWarning: {
      count: oneWarning.length,
      students: oneWarning,
    },
    twoWarnings: {
      count: twoWarnings.length,
      students: twoWarnings,
    },
    dismissed: {
      count: dismissed.length,
      students: dismissed,
    },
  };
}
