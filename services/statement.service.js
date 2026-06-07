import PermitStudentDirectory from "../models/PermitStudentDirectory.js";
import PermitAdminAddition from "../models/PermitAdminAddition.js";
import User from "../models/User.js";
import {
  findDirectoryStudentByIdentifier,
  resolveDirectoryForAccount,
  ensureStudentInDirectory,
} from "./studentDirectory.service.js";

const LATE_HOUR = 17;
const LATE_DEDUCTION = 5;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getTodayRange = () => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

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
    permitType: record.permitType,
    status: record.status,
    deduction: record.deduction,
    note: record.note || "",
  };
};

const formatArrivalStatus = (status) =>
  status === "late" ? "متأخر" : "في الموعد";

export const addStudentAttendance = async (identifier) => {
  const directoryStudent = await findDirectoryStudentByIdentifier(identifier);
  const { startOfToday, endOfToday } = getTodayRange();

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
  const records = await PermitAdminAddition.find()
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

  return filtered.map(formatAdditionRecord);
};

export const searchAllStudentsWithStatus = async ({ searchValue = "" } = {}) => {
  const trimmed = searchValue.trim();

  if (!trimmed) {
    return [];
  }

  const searchRegex = new RegExp(escapeRegex(trimmed), "i");
  const nameStartsRegex = new RegExp(`^${escapeRegex(trimmed)}`, "i");

  let students = await PermitStudentDirectory.find({
    $or: [
      { email: trimmed.toLowerCase() },
      { email: searchRegex },
      { name: nameStartsRegex },
      { name: searchRegex },
      { militaryId: searchRegex },
    ],
  })
    .sort({ name: 1 })
    .limit(30);

  if (students.length === 0) {
    const user = await User.findOne({
      $or: [
        { email: trimmed.toLowerCase() },
        { email: searchRegex },
        { name: nameStartsRegex },
        { name: searchRegex },
      ],
    });

    if (user) {
      const entry = await ensureStudentInDirectory(user);
      students = [entry];
    }
  }

  const { startOfToday, endOfToday } = getTodayRange();

  const results = await Promise.all(
    students.map(async (student) => {
      const todayRecord = await PermitAdminAddition.findOne({
        student: student._id,
        arrivedAt: { $gte: startOfToday, $lte: endOfToday },
      }).sort({ arrivedAt: -1 });

      return {
        _id: student._id,
        name: student.name,
        email: student.email,
        militaryId: student.militaryId,
        inTable: Boolean(todayRecord),
        arrivalStatus: todayRecord
          ? formatArrivalStatus(todayRecord.status)
          : "غير مسجل",
        permitType: todayRecord?.permitType || "—",
        requestStatus: todayRecord?.permitType || "—",
        additionId: todayRecord?._id || null,
      };
    }),
  );

  return results;
};

export const getStatementStats = async () => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const [totalExpected, todayAttendance, todayLate] = await Promise.all([
    PermitStudentDirectory.countDocuments(),
    PermitAdminAddition.countDocuments({
      arrivedAt: { $gte: startOfToday, $lte: endOfToday },
    }),
    PermitAdminAddition.countDocuments({
      arrivedAt: { $gte: startOfToday, $lte: endOfToday },
      status: "late",
    }),
  ]);

  return {
    totalExpected,
    totalAttendance: todayAttendance,
    lateStudents: todayLate,
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
    task: record.permitType,
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
  const record = await PermitAdminAddition.findByIdAndDelete(additionId);

  if (!record) {
    const err = new Error("سجل الإضافة غير موجود");
    err.statusCode = 404;
    throw err;
  }

  return { deleted: true };
};
