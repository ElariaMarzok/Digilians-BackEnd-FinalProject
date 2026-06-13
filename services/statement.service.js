import PermitStudentDirectory from "../models/PermitStudentDirectory.js";
import PermitAdminAddition from "../models/PermitAdminAddition.js";
import HolidayRequest from "../models/HolidayRequest.js";
import User from "../models/User.js";
import {
  findDirectoryStudentByIdentifier,
  resolveDirectoryForAccount,
  ensureStudentInDirectory,
} from "./studentDirectory.service.js";

// Late hour set to 17 (5 PM) - marks student as late but no deduction
const LATE_HOUR = 17;
const LATE_DEDUCTION = 0; // No automatic deduction for late arrival

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Unified today range function - uses local server time
const getTodayRange = () => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  return { startOfToday, endOfToday };
};

const formatDate = (date) =>
  date.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

const formatTime = (date) =>
  date.toLocaleTimeString("ar-EG", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

const getLateInfo = (arrivedAt) => {
  const hour = arrivedAt.getHours();
  const isLate = hour >= LATE_HOUR;

  return {
    status: isLate ? "late" : "present",
    deduction: isLate ? LATE_DEDUCTION : 0,
  };
};

const formatAdditionRecord = (record) => {
  const student = record.student;

  return {
    _id: record._id,
    id: record._id,
    name: student.name,
    email: student.email,
    militaryId: student.militaryId,
    nationalId: "-",
    date: formatDate(record.arrivedAt),
    time: formatTime(record.arrivedAt),
    arrivedAt: record.arrivedAt,
    permitType: record.permitType || "—",
    status: record.status,
    deduction: record.deduction,
    note: record.note || "",
  };
};

const formatArrivalStatus = (status) =>
  status === "late" ? "متأخر" : "في الموعد";

// دالة مساعدة لفحص حالة طلبات التماس للطالب
// ترجع "التماس" لو تم قبول الطلب، أو "اعتيادي" لو الطلب قيد الانتظار أو مفيش طلب
const getPermitRequestStatus = async (studentId) => {
  const { startOfToday, endOfToday } = getTodayRange();

  // البحث عن طلب اجازة للطالب خلال اليوم
  const permitRequest = await HolidayRequest.findOne({
    student: studentId,
    createdAt: { $gte: startOfToday, $lte: endOfToday },
    status: { $in: ["approved", "pending"] },
  }).sort({ createdAt: -1 });

  if (!permitRequest) {
    return "اعتيادي"; //Default: regular - no permit request or rejected
  }

  if (permitRequest.status === "approved") {
    return "التماس"; // Permit approved - show as "التماس"
  }

  // If status is "pending" - still show as regular until approved
  return "اعتيادي";
};

export const addStudentAttendance = async (identifier) => {
  const directoryStudent = await findDirectoryStudentByIdentifier(identifier);
  const { startOfToday, endOfToday } = getTodayRange();

  // Check for existing record for today
  const existingToday = await PermitAdminAddition.findOne({
    student: directoryStudent._id,
    arrivedAt: { $gte: startOfToday, $lte: endOfToday },
  });

  if (existingToday) {
    const err = new Error("الطالب موجود بالفعل في الجدول");
    err.statusCode = 409;
    throw err;
  }

  const arrivedAt = new Date();
  const { status, deduction } = getLateInfo(arrivedAt);

  const addition = await PermitAdminAddition.create({
    student: directoryStudent._id,
    arrivedAt,
    status,
    deduction,
  });

  const populated = await PermitAdminAddition.findById(addition._id).populate(
    "student",
  );

  return formatAdditionRecord(populated);
};

export const getAttendanceRecords = async ({ searchValue = "" } = {}) => {
  const { startOfToday, endOfToday } = getTodayRange();

  // Only show today's records in admin table
  const records = await PermitAdminAddition.find({
    arrivedAt: { $gte: startOfToday, $lte: endOfToday },
  })
    .populate("student")
    .sort({ arrivedAt: -1 });

  const trimmedSearch = searchValue.trim();

  const filtered = trimmedSearch
    ? records.filter((record) => {
        const student = record.student;
        return (
          student.militaryId.includes(trimmedSearch) ||
          student.email.toLowerCase().includes(trimmedSearch.toLowerCase()) ||
          student.name.includes(trimmedSearch)
        );
      })
    : records;

  // Use Promise.all to check permit status for each record
  const results = await Promise.all(
    filtered.map(async (record) => {
      const student = record.student;

      // فحص حالة طلبات التماس للطالب
      const permitStatus = await getPermitRequestStatus(student._id);

      return {
        _id: record._id,
        id: record._id,
        name: student.name,
        email: student.email,
        militaryId: student.militaryId,
        nationalId: "-",
        date: formatDate(record.arrivedAt),
        time: formatTime(record.arrivedAt),
        arrivedAt: record.arrivedAt,
        permitType: record.permitType || "—",
        status: record.status,
        deduction: record.deduction,
        note: record.note || "",
        requestStatus: permitStatus, // حالة الطلب الحقيقية
      };
    })
  );

  return results;
};

export const searchAllStudentsWithStatus = async ({ searchValue = "" } = {}) => {
  const trimmed = searchValue.trim();

  if (!trimmed) {
    return [];
  }

  const { startOfToday, endOfToday } = getTodayRange();

// البحث فقط على طلاب اليوم في جدول التصحيح
  const additionRecords = await PermitAdminAddition.find({
    arrivedAt: { $gte: startOfToday, $lte: endOfToday },
  })
    .populate("student")
    .sort({ arrivedAt: -1 });

  // تصفية الطلاب اللي عندهم record ومطابقين للبحث
  const matchedRecords = additionRecords.filter((record) => {
    const student = record.student;
    return (
      student.militaryId.includes(trimmed) ||
      student.email.toLowerCase().includes(trimmed.toLowerCase()) ||
      student.name.includes(trimmed)
    );
  });

  // إزالة المكررات (أخذ آخر record لكل طالب)
  const uniqueByStudent = {};
  matchedRecords.forEach((record) => {
    const studentId = record.student._id.toString();
    if (!uniqueByStudent[studentId]) {
      uniqueByStudent[studentId] = record;
    }
  });

  const students = Object.values(uniqueByStudent);

  // استخدام Promise.all للتحقق من حالة طلبات التماس لكل طالب
  const results = await Promise.all(
    students.map(async (record) => {
      const student = record.student;

      // فحص حالة طلبات التماس للطالب
      const permitStatus = await getPermitRequestStatus(student._id);

      return {
        _id: student._id,
        name: student.name,
        email: student.email,
        militaryId: student.militaryId,
        inTable: true,
        arrivalStatus: formatArrivalStatus(record.status),
        permitType: record.permitType || "—",
        requestStatus: permitStatus, // استخدام حالة الطلب الحقيقية
        additionId: record._id,
        arrivedAt: record.arrivedAt,
        status: record.status,
        deduction: record.deduction,
      };
    })
  );

  return results;
};

export const getStatementStats = async () => {
  // Use unified getTodayRange for consistency with Egypt timezone
  const { startOfToday, endOfToday } = getTodayRange();

  // Count today's attendance records
  const todayAttendance = await PermitAdminAddition.countDocuments({
    arrivedAt: { $gte: startOfToday, $lte: endOfToday },
  });
  
  const todayLate = await PermitAdminAddition.countDocuments({
    arrivedAt: { $gte: startOfToday, $lte: endOfToday },
    status: "late",
  });

  // Get all today's records to calculate total deductions
  const todayRecords = await PermitAdminAddition.find({
    arrivedAt: { $gte: startOfToday, $lte: endOfToday },
  });
  
  // Calculate total deductions (sum of all late penalties)
  const totalDeductions = todayRecords.reduce((sum, record) => sum + record.deduction, 0);

  //_totalExpected = كل الطلاب في الداتا بيز_=
  const totalExpected = await PermitStudentDirectory.countDocuments();

  return {
    totalExpected,
    totalAttendance: todayAttendance,
    lateStudents: todayLate,
    totalDeductions,
  };
};

export const getUserStatementData = async (email, userId) => {
  const directoryStudent = await resolveDirectoryForAccount({ email, userId });

  if (!directoryStudent) {
    return {
      student: null,
      latestAttendance: null,
      history: [],
      stats: {
        totalDeduction: 0,
        lateCount: 0,
      },
    };
  }

  const records = await PermitAdminAddition.find({
    student: directoryStudent._id,
  })
    .populate("student")
    .sort({ arrivedAt: -1 });

  const history = records.map((record) => ({
    _id: record._id,
    date: formatDate(record.arrivedAt),
    task: record.permitType || "—",
    duration: "-",
    status: record.status === "late" ? "متأخر" : "في الموعد",
    deduction: record.deduction,
    time: formatTime(record.arrivedAt),
    arrivedAt: record.arrivedAt,
  }));

  const latestAttendance = history[0] || null;

  return {
    student: {
      name: directoryStudent.name,
      email: directoryStudent.email,
      militaryId: directoryStudent.militaryId,
    },
    latestAttendance,
    history,
    stats: {
      totalDeduction: records.reduce((sum, item) => sum + item.deduction, 0),
      lateCount: records.filter((item) => item.status === "late").length,
    },
  };
};

export const updateAttendanceNote = async (additionId, note) => {
  const record = await PermitAdminAddition.findByIdAndUpdate(
    additionId,
    { note: note || "" },
    { new: true },
  ).populate("student");

  if (!record) {
    const err = new Error("سجل الإضافة غير موجود");
    err.statusCode = 404;
    throw err;
  }

  return formatAdditionRecord(record);
};

export const deleteAttendanceRecord = async (additionId) => {
  // First get the record to find the student reference
  const record = await PermitAdminAddition.findById(additionId);

  if (!record) {
    const err = new Error("سجل الإضافة غير موجود");
    err.statusCode = 404;
    throw err;
  }

  // Delete ONLY the attendance record - keep the student in directory!
  await PermitAdminAddition.findByIdAndDelete(additionId);

  return { deleted: true };
};

// Update deduction (grades) for attendance record
export const updateAttendanceDeduction = async (additionId, deduction) => {
  const record = await PermitAdminAddition.findByIdAndUpdate(
    additionId,
    { deduction: Math.max(0, deduction) },
    { new: true },
  ).populate("student");

  if (!record) {
    const err = new Error("سجل الإضافة غير موجود");
    err.statusCode = 404;
    throw err;
  }

  return formatAdditionRecord(record);
};


export const clearAllAttendanceRecords = async () => {
  // Delete ALL today's attendance records from the database
  const { startOfToday, endOfToday } = getTodayRange();
  
  const result = await PermitAdminAddition.deleteMany({
    arrivedAt: { $gte: startOfToday, $lte: endOfToday },
  });
  
  return { deleted: true, count: result.deletedCount };
};
