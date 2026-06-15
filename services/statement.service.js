import PermitStudentDirectory from "../models/PermitStudentDirectory.js";
import PermitAdminAddition from "../models/PermitAdminAddition.js";
import Excuse from "../models/Excuse.js";
import User from "../models/User.js";
import {
  findDirectoryStudentByIdentifier,
  resolveDirectoryForAccount,
  ensureStudentInDirectory,
} from "./studentDirectory.service.js";

// Late hour set to 17 (5 PM) - marks student as late with 5 degree deduction
const LATE_HOUR = 17;
const LATE_DEDUCTION = 5; // 5 degree deduction for late arrival

// Helper to check if a date is today (using Egypt timezone)
const isToday = (date) => {
  const now = new Date();
  const todayStr = now.toLocaleString("en-US", { timeZone: "Africa/Cairo" });
  const today = new Date(todayStr);

  const dateStr = date.toLocaleString("en-US", { timeZone: "Africa/Cairo" });
  const dateLocal = new Date(dateStr);

  return (
    dateLocal.getDate() === today.getDate() &&
    dateLocal.getMonth() === today.getMonth() &&
    dateLocal.getFullYear() === today.getFullYear()
  );
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Unified today range function - uses Egypt timezone
const getTodayRange = () => {
  // Get current time in Egypt timezone
  const now = new Date();
  const nowStr = now.toLocaleString("en-US", { timeZone: "Africa/Cairo" });
  const nowEgypt = new Date(nowStr);

  const year = nowEgypt.getFullYear();
  const month = nowEgypt.getMonth();
  const day = nowEgypt.getDate();

  const startOfToday = new Date(year, month, day, 0, 0, 0, 0);
  const endOfToday = new Date(year, month, day, 23, 59, 59, 999);

  return { startOfToday, endOfToday };
};

const formatDate = (date) =>
  date.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Africa/Cairo",
  });

const formatTime = (date) =>
  date.toLocaleTimeString("ar-EG", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Cairo",
  });

// Check if student has an approved excuse for today
const getExcuseStatus = async (studentId) => {
  const { startOfToday, endOfToday } = getTodayRange();

const approvedExcuse = await Excuse.findOne({
    user: studentId,
    status: "تم الوصول",
    createdAt: { $gte: startOfToday, $lte: endOfToday },
  });

  return !!approvedExcuse;
};

// Check if a date is today (using Egypt timezone)
const isDateToday = (date) => {
  const dateStr = date.toLocaleString("en-US", { timeZone: "Africa/Cairo" });
  const dateLocal = new Date(dateStr);

  const now = new Date();
  const nowStr = now.toLocaleString("en-US", { timeZone: "Africa/Cairo" });
  const nowLocal = new Date(nowStr);

  return (
    dateLocal.getDate() === nowLocal.getDate() &&
    dateLocal.getMonth() === nowLocal.getMonth() &&
    dateLocal.getFullYear() === nowLocal.getFullYear()
  );
};

const getLateInfo = (arrivedAt) => {
  // Convert to Egypt timezone (UTC+3 summer / UTC+2 winter)
  // Using toLocaleString to get the local time in Cairo
  const localTimeStr = arrivedAt.toLocaleString("en-US", { timeZone: "Africa/Cairo" });
  const localDate = new Date(localTimeStr);
  const hour = localDate.getHours();
  const isLate = hour >= LATE_HOUR;

  return {
    status: isLate ? "late" : "present",
    deduction: isLate ? LATE_DEDUCTION : 0,
  };
};

const formatAdditionRecord = async (record) => {
  const student = record.student;

  // Use the saved status from the attendance record directly
  // Don't check excuses - we only check that for display in other places
  // "present" means arrived on time, "late" means arrived after 5 PM
  let displayStatus, displayDeduction;
  const savedStatus = record.status;
  
  if (savedStatus === "present") {
    displayStatus = "في الموعد";
    displayDeduction = 0;
  } else if (savedStatus === "late") {
    displayStatus = "متأخر";
    displayDeduction = LATE_DEDUCTION;
  } else {
    // Fallback: calculate based on arrival time (for older records without status)
    const lateInfo = getLateInfo(record.arrivedAt);
    displayStatus = lateInfo.status === "late" ? "متأخر" : "في الموعد";
    displayDeduction = lateInfo.deduction;
  }

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
    status: displayStatus,
    deduction: displayDeduction,
    note: record.note || "",
  };
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

  // Use Egypt timezone for arrival time
  const now = new Date();
  const arrivedAt = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Cairo" }));

  // Calculate status based on arrival time
  // Before 5 PM = present (في الموعد), no deduction
  // After 5 PM = late (متأخر), 5 degrees deduction
  const lateInfo = getLateInfo(arrivedAt);
  const status = lateInfo.status;
  const deduction = lateInfo.deduction;

  const addition = await PermitAdminAddition.create({
    student: directoryStudent._id,
    arrivedAt,
    status,
    deduction,
  });

  const populated = await PermitAdminAddition.findById(addition._id).populate(
    "student",
  );

  return await formatAdditionRecord(populated);
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

  // Calculate status based on arrival time and excuse for each record
  const results = await Promise.all(filtered.map((record) => formatAdditionRecord(record)));

  return results;
};

export const searchAllStudentsWithStatus = async ({ searchValue = "" } = {}) => {
  const trimmed = searchValue.trim();
  console.log("🔍 searchAllStudentsWithStatus called with:", trimmed);

  if (!trimmed) {
    return [];
  }

  const { startOfToday, endOfToday } = getTodayRange();

  // البحث في جدول الطلاب (permit_student_directory - الداتا بيز)
  const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Check total students in DB
  const totalInDB = await PermitStudentDirectory.countDocuments();
  console.log("📊 Total students in database:", totalInDB);

  // البحث من جدول الطلاب (permit_student_directories - الداتا بيز)
  const directoryStudents = await PermitStudentDirectory.find({
    $or: [
      { email: new RegExp(escapeRegex(trimmed), "i") },
      { name: { $regex: escapeRegex(trimmed), $options: "i" } },
      { militaryId: trimmed },
      { militaryId: { $regex: escapeRegex(trimmed), $options: "i" } },
    ]
  });

  console.log("📋 Found students:", directoryStudents.length);

  // If NOT found in directory, throw error (not found)
  if (!directoryStudents || directoryStudents.length === 0) {
    console.log("❌ Student not found in database");
    const err = new Error("الطالب دا مش موجود في الداتا بيز");
    err.statusCode = 404;
    throw err;
  }

  // If found in directory, check if they have attendance today and return their data
  const results = await Promise.all(
    directoryStudents.map(async (student) => {
      // Check if they have attendance record today
      const todayRecord = await PermitAdminAddition.findOne({
        student: student._id,
        arrivedAt: { $gte: startOfToday, $lte: endOfToday },
      });

      let inTable = false;
      let arrivalStatus = "غير موجود";
      let additionId = null;
      let status = null;
      let deduction = 0;

      if (todayRecord) {
        inTable = true;
        additionId = todayRecord._id;
        status = todayRecord.status;

        // Check if student has approved excuse for today
        const hasExcuse = await getExcuseStatus(student._id);

        if (hasExcuse) {
          arrivalStatus = "التماس";
          deduction = 0;
        } else if (todayRecord.status === "late") {
          arrivalStatus = "متأخر";
          deduction = 5;
        } else {
          arrivalStatus = "في الموعد";
          deduction = 0;
        }
      }

return {
        _id: student._id,
        name: student.name,
        email: student.email,
        militaryId: student.militaryId,
        inTable: inTable,
        arrivalStatus: arrivalStatus,
        additionId: additionId,
        arrivedAt: todayRecord?.arrivedAt || null,
        status: status,
        deduction: deduction,
        userId: student.user || null,
        time: todayRecord?.arrivedAt ? formatTime(todayRecord.arrivedAt) : "-",
      };
    })
  );

  console.log("✅ Returning results:", results.length);
  return results;
};

export const getStatementStats = async () => {
  // Use unified getTodayRange for consistency with Egypt timezone
  const { startOfToday, endOfToday } = getTodayRange();

  // Count today's attendance records
  const todayAttendance = await PermitAdminAddition.countDocuments({
    arrivedAt: { $gte: startOfToday, $lte: endOfToday },
  });

  // Get all today's records to calculate total deductions
  const todayRecords = await PermitAdminAddition.find({
    arrivedAt: { $gte: startOfToday, $lte: endOfToday },
  });

  // Calculate late count and total deductions considering excuse status
  let lateCount = 0;
  let totalDeductions = 0;

  for (const record of todayRecords) {
    const hasExcuse = await getExcuseStatus(record.student);
    if (hasExcuse) {
      // Excused students don't count as late and no deduction
      continue;
    }
    const lateInfo = getLateInfo(record.arrivedAt);
    if (lateInfo.status === "late") {
      lateCount++;
    }
    totalDeductions += lateInfo.deduction;
  }

  // totalExpected = كل الطلاب في الداتا بيز
  const totalExpected = await PermitStudentDirectory.countDocuments();

  return {
    totalExpected,
    totalAttendance: todayAttendance,
    lateStudents: lateCount,
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

  // Check if student has approved excuse for today
  const hasExcuseToday = await getExcuseStatus(directoryStudent._id);

  // Calculate status based on arrival time and excuse for each record
  const history = records.map((record) => {
    const lateInfo = getLateInfo(record.arrivedAt);
    // Check if this specific record's date is today
    const recordIsToday = isDateToday(record.arrivedAt);

    let displayStatus, displayDeduction;
    if (recordIsToday && hasExcuseToday) {
      displayStatus = "التماس";
      displayDeduction = 0;
    } else {
      displayStatus = lateInfo.status === "late" ? "متأخر" : "في الموعد";
      displayDeduction = lateInfo.deduction;
    }

    return {
      _id: record._id,
      date: formatDate(record.arrivedAt),
      task: "—",
      duration: "-",
      status: displayStatus,
      deduction: displayDeduction,
      time: formatTime(record.arrivedAt),
      arrivedAt: record.arrivedAt,
    };
  });

  const latestAttendance = history[0] || null;

  // Calculate stats based on corrected display values
  const totalDeduction = history.reduce((sum, item) => sum + item.deduction, 0);
  const lateCount = history.filter((item) => item.status === "متأخر").length;

  return {
    student: {
      name: directoryStudent.name,
      email: directoryStudent.email,
      militaryId: directoryStudent.militaryId,
    },
    latestAttendance,
    history,
    stats: {
      totalDeduction,
      lateCount,
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

  return await formatAdditionRecord(record);
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

  return await formatAdditionRecord(record);
};

export const clearAllAttendanceRecords = async () => {
  // Delete ALL today's attendance records from the database
  const { startOfToday, endOfToday } = getTodayRange();

  const result = await PermitAdminAddition.deleteMany({
    arrivedAt: { $gte: startOfToday, $lte: endOfToday },
  });

  return { deleted: true, count: result.deletedCount };
};

// Get all approved excuses (مقبول) from the database
export const getApprovedExcuses = async () => {
  console.log('Fetching excuses with status مقبول...')
  const excuses = await Excuse.find({ status: "مقبول" })
    .populate("user")
    .sort({ createdAt: -1 });
  
  console.log('Found excuses with مقبول status:', excuses.length)

  console.log('Found excuses:', excuses.length, excuses)

  return excuses.map((excuse) => ({
    _id: excuse._id,
    id: excuse._id,
    name: excuse.studentName || excuse.user?.name || "-",
    email: excuse.studentEmail || excuse.user?.email || "-",
    militaryId: excuse.militaryId || "-",
    date: formatDate(excuse.createdAt),
    time: formatTime(excuse.createdAt),
    status: "التماس",
    deduction: 0,
    note: excuse.response || excuse.message || "",
  }));
};

// Confirm an excuse and create attendance record (persists in database)
export const confirmExcuseAttendance = async (excuseId) => {
  const excuse = await Excuse.findById(excuseId).populate("user");
  
  if (!excuse) {
    const err = new Error("التماس غير موجود");
    err.statusCode = 404;
    throw err;
  }

  // Find student in directory by user reference or militaryId
  let student = null;
  if (excuse.user) {
    student = await PermitStudentDirectory.findOne({ user: excuse.user._id });
  }
  if (!student && excuse.militaryId) {
    student = await PermitStudentDirectory.findOne({ militaryId: excuse.militaryId });
  }

  if (!student) {
    const err = new Error("الطالب غير موجود في الجدول");
    err.statusCode = 404;
    throw err;
  }

  // Check if student already has attendance record today (prevent duplicates)
  const { startOfToday, endOfToday } = getTodayRange();
  const existingToday = await PermitAdminAddition.findOne({
    student: student._id,
    arrivedAt: { $gte: startOfToday, $lte: endOfToday },
  });

if (existingToday) {
    // Update excuse status but don't create duplicate
    await Excuse.findByIdAndUpdate(excuseId, { status: "تم الوصول" });
    const err = new Error("الطالب موجود بالفعل في جدول الحضور اليوم");
    err.statusCode = 409;
    throw err;
  }

  // Get current time in Egypt timezone
  const now = new Date();
  const arrivedAt = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Cairo" }));

  // Create attendance record (status: present, no deduction)
  const record = await PermitAdminAddition.create({
    student: student._id,
    arrivedAt,
    status: "present",
    deduction: 0,
    note: `تم تأكيد التماس - ${excuse.title || excuse.message || ""}`,
  });

  const populated = await PermitAdminAddition.findById(record._id).populate("student");

// Update excuse status to indicate it was confirmed (so it won't show in list again)
  await Excuse.findByIdAndUpdate(excuseId, { status: "تم الوصول" });

  return {
    _id: populated._id,
    name: populated.student.name,
    email: populated.student.email,
    militaryId: populated.student.militaryId,
    date: formatDate(populated.arrivedAt),
    time: formatTime(populated.arrivedAt),
    status: "في الموعد",
    deduction: 0,
  };
};

// Reject/ignore an excuse (removes from list without confirming)
export const rejectExcuseAttendance = async (excuseId) => {
  const excuse = await Excuse.findById(excuseId);
  
  if (!excuse) {
    const err = new Error("التماس غير موجود");
    err.statusCode = 404;
    throw err;
  }

  // Update excuse status to "مرفوض" (rejected) - removes from display
  await Excuse.findByIdAndUpdate(excuseId, { status: "مرفوض" });

  return { deleted: true };
};
