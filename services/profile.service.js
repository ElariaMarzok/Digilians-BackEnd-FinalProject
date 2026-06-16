import mongoose from "mongoose";
import Admin from "../models/Admin.js";
import User from "../models/User.js";
import PermitStudentDirectory from "../models/PermitStudentDirectory.js";

import Punishment from "../models/Punishment.model.js";

import PermitAdminAddition from "../models/PermitAdminAddition.js";

import Relative from "../models/Relative.js";
import MedicalRecord from "../models/MedicalRecord.js";
import HolidayRequest from "../models/HolidayRequest.js";
import Excuse from "../models/Excuse.js";
import StudentPayment from "../models/StudentPayment.js";
import {
  resolveDirectoryForAccount,
  buildStudentAuthProfile,
} from "./studentDirectory.service.js";
import { getUserStatementData } from "./statement.service.js";
import {
  normalizeArabicSearchText,
  buildArabicFlexibleRegex,
  escapeRegex,
} from "../utils/arabicNormalize.js";


const DEFAULT_DURATION_LABEL = "غير محدد";
const DEFAULT_STATUS_LABEL = "نشط";
const MAX_SEARCH_RESULTS = 50;
const HIGH_ABSENCE_THRESHOLD = 5;


const defaultStudentProfile = async (user, directoryEntry) => {
  const militaryId = directoryEntry?.militaryId || "";

  let behaviorGrade = 100;
  let punishmentHistory = [{ label: "البداية", value: 100 }];

  if (militaryId) {
    const punishments = await Punishment.find({ militaryNum: militaryId }).sort({ createdAt: 1 });

    let currentGrade = 100;
    punishments.forEach((p) => {
      currentGrade = Math.max(0, currentGrade - (p.degree || 0));
      punishmentHistory.push({
        label: new Date(p.createdAt).toLocaleDateString("ar-EG", { timeZone: "Africa/Cairo" }),
        value: currentGrade,
        reason: p.violation,
      });
    });
    behaviorGrade = currentGrade;
  }

  return {
    student: formatUserBasicData(user, directoryEntry),
    department: "",
    specialization: "",
    course: "",
    specializationDuration: "غير محدد",
    status: "active",
    attendance: { absenceDays: 0 },
    grades: {
      behavior: behaviorGrade,
      history: punishmentHistory,
    },
    notes: "",
  };
};
const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;

};

const toObjectId = (value) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw createHttpError("Invalid student id", 400);
  }

  return new mongoose.Types.ObjectId(value);
};

const isStudentRole = (role = "") => String(role).toLowerCase() === "student";

const isAdminRole = (role = "") => {
  const normalizedRole = String(role).toLowerCase();
  return (
    normalizedRole === "admin" ||
    normalizedRole === "commander" ||
    normalizedRole === "super_admin" ||
    normalizedRole === "superadmin"
  );
};

const formatChartMonthLabel = (date) =>
  new Date(date).toLocaleDateString("ar-EG", {
    month: "short",
    year: "numeric",
    timeZone: "Africa/Cairo",
  });

  // return await defaultStudentProfile(user, directoryEntry);

const formatDisplayDate = (date) => {
  if (!date) {
    return "";
  }

  return new Date(date).toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Africa/Cairo",
  });

};

const formatAdminRoleLabel = (role = "") => {
  if (!role) {
    return "مسؤول";
  }

  const normalizedRole = String(role).toLowerCase();

  if (normalizedRole === "admin") {
    return "مدير النظام";
  }

  if (normalizedRole === "commander") {
    return "قائد";
  }

  return role;
};

const classifyPunishmentLevel = (record) => {
  const sourceText = normalizeArabicSearchText(
    `${record?.punishment || ""} ${record?.violation || ""}`,
  );

  if (!sourceText) {
    return null;
  }

  if (
    sourceText.includes("فصل") ||
    sourceText.includes("استبعاد") ||
    sourceText.includes("dismiss")
  ) {
    return "dismissed";
  }

  if (
    sourceText.includes("ايقاف") ||
    sourceText.includes("موقوف") ||
    sourceText.includes("suspend")
  ) {
    return "suspended";
  }

  if (
    sourceText.includes("انذار ثاني") ||
    sourceText.includes("الانذار الثاني") ||
    sourceText.includes("second warning")
  ) {
    return "warning_two";
  }

  if (
    sourceText.includes("انذار اول") ||
    sourceText.includes("الانذار الاول") ||
    sourceText.includes("first warning")
  ) {
    return "warning_one";
  }

  return null;
};

const mapStatusToArabic = (status = "") => {
  const normalizedStatus = String(status).toLowerCase();

  switch (normalizedStatus) {
    case "approved":
    case "paid":
    case "present":
      return "مقبول";
    case "rejected":
      return "مرفوض";
    case "late":
      return "متأخر";
    case "under_review":
      return "قيد المراجعة";
    case "pending":
      return "قيد المراجعة";
    default:
      return status || "غير محدد";
  }
};

const buildBehaviorHistory = (punishments = []) => {
  if (!punishments.length) {
    return [];
  }

  const monthlyTotals = new Map();

  punishments.forEach((record) => {
    const date = new Date(record.createdAt || Date.now());
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const existing = monthlyTotals.get(key) || {
      label: formatChartMonthLabel(date),
      deduction: 0,
      sortDate: new Date(date.getFullYear(), date.getMonth(), 1),
    };

    existing.deduction += Number(record.degree || 0);
    monthlyTotals.set(key, existing);
  });

  const sortedMonths = Array.from(monthlyTotals.values()).sort(
    (first, second) => first.sortDate - second.sortDate,
  );

  let runningScore = 100;

  return sortedMonths.map((month) => {
    runningScore = Math.max(runningScore - month.deduction, 0);

    return {
      label: month.label,
      value: runningScore,
    };
  });
};

const formatPaymentRecord = (month) => ({
  title: month?.monthName || "مصروفات",
  status: mapStatusToArabic(month?.status),
  date: formatDisplayDate(month?.updatedAt),
});

const formatHolidayRecord = (holiday) => ({
  title: holiday?.reason || "طلب إجازة",
  status: mapStatusToArabic(holiday?.status),
  date: formatDisplayDate(holiday?.createdAt || holiday?.startDate),
});

const formatExcuseRecord = (excuse) => ({
  title: excuse?.title || "التماس",
  status: mapStatusToArabic(excuse?.status),
  date: formatDisplayDate(excuse?.createdAt),
});

const formatPunishmentRecord = (punishment) => ({
  title: punishment?.violation || punishment?.punishment || "مخالفة",
  status: punishment?.punishment || "مسجل",
  date: formatDisplayDate(punishment?.createdAt),
});

const buildStudentStatus = (punishments = []) => {
  const latestLevel = punishments
    .slice()
    .reverse()
    .map(classifyPunishmentLevel)
    .find(Boolean);

  switch (latestLevel) {
    case "dismissed":
      return "مفصول";
    case "suspended":
      return "موقوف";
    case "warning_two":
      return "إنذار ثانٍ";
    case "warning_one":
      return "إنذار أول";
    default:
      return DEFAULT_STATUS_LABEL;
  }
};

const findStudentUser = async (directoryEntry) => {
  if (!directoryEntry) {
    return null;
  }

  if (directoryEntry.user) {
    const byId = await User.findById(directoryEntry.user).select("-password");
    if (byId) {
      return byId;
    }
  }

  return User.findOne({ email: directoryEntry.email }).select("-password");
};

const resolveStudentDirectoryOrThrow = async (account) => {
  const directoryEntry = await resolveDirectoryForAccount({
    email: account.email,
    userId: account._id,
  });

  if (!directoryEntry) {
    throw createHttpError("Student directory record not found", 404);
  }

  return directoryEntry;
};

const getPunishmentData = async (militaryId) => {
  if (!militaryId) {
    return {
      records: [],
      behaviorScore: 100,
      warningsCount: 0,
      latestPunishment: null,
      chartData: [],
      currentStatus: DEFAULT_STATUS_LABEL,
    };
  }

  const records = await Punishment.find({ militaryNum: militaryId })
    .sort({ createdAt: 1 })
    .lean();

  const deductedPoints = records.reduce(
    (sum, record) => sum + Number(record.degree || 0),
    0,
  );
  const behaviorScore = Math.max(100 - deductedPoints, 0);
  const warningsCount = records.filter((record) => {
    const level = classifyPunishmentLevel(record);
    return level === "warning_one" || level === "warning_two";
  }).length;

  return {
    records,
    behaviorScore,
    warningsCount,
    latestPunishment: records.length ? records[records.length - 1] : null,
    chartData: buildBehaviorHistory(records),
    currentStatus: buildStudentStatus(records),
  };
};

const getAttendanceData = async (directoryEntry, userId) => {
  const statementData = await getUserStatementData(
    directoryEntry.email,
    userId || directoryEntry.user,
  );

  const permits = (statementData.history || []).map((record) => ({
    title: record.task || "تصريح طالب",
    status: record.status || "غير محدد",
    date: record.date || "",
  }));

  return {
    absenceDays: 0,
    totalAttendanceRecords: statementData.history?.length || 0,
    lateCount: statementData.stats?.lateCount || 0,
    totalDeduction: statementData.stats?.totalDeduction || 0,
    latestAttendance: statementData.latestAttendance,
    permits,
  };
};

const getPaymentData = async (studentUser, directoryEntry) => {
  const paymentRecord = studentUser?._id
    ? await StudentPayment.findOne({ user: studentUser._id }).lean()
    : await StudentPayment.findOne({ militaryId: directoryEntry.militaryId }).lean();

  const months = paymentRecord?.months || [];
  const sortedMonths = months
    .slice()
    .sort((first, second) => new Date(first.updatedAt) - new Date(second.updatedAt));

  return {
    latestPaymentStatus: sortedMonths.length
      ? mapStatusToArabic(sortedMonths[sortedMonths.length - 1].status)
      : "لا يوجد",
    payments: sortedMonths.map(formatPaymentRecord),
    pendingPaymentCount: sortedMonths.filter((month) => month.status !== "paid").length,
  };
};

const getHolidayData = async (directoryEntry, studentUser) => {
  const query = {
    $or: [{ student: directoryEntry._id }],
  };

  if (studentUser?._id) {
    query.$or.push({ user: studentUser._id });
  }

  if (directoryEntry.email) {
    query.$or.push({ studentEmail: directoryEntry.email });
  }

  const holidays = await HolidayRequest.find(query)
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  return holidays.map(formatHolidayRecord);
};

const getExcuseData = async (directoryEntry, studentUser) => {
  const query = {
    $or: [
      { militaryId: directoryEntry.militaryId },
      { studentEmail: directoryEntry.email },
    ],
  };

  if (studentUser?._id) {
    query.$or.push({ user: studentUser._id });
  }

  const excuses = await Excuse.find(query)
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  return excuses.map(formatExcuseRecord);
};

const getMedicalSummary = async (directoryEntry, studentUser) => {
  const query = {
    $or: [
      { militaryId: directoryEntry.militaryId },
      { studentEmail: directoryEntry.email },
    ],
  };

  if (studentUser?._id) {
    query.$or.push({ user: studentUser._id });
  }

  const records = await MedicalRecord.find(query)
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  return {
    count: records.length,
    latestStatus: records[0]?.status || null,
    latestVisitDate: records[0]?.date || null,
  };
};

const buildStudentProfilePayload = async (account, directoryEntry, studentUser = null) => {
  const linkedUser = studentUser || (await findStudentUser(directoryEntry));
  const studentIdentity = buildStudentAuthProfile(
    linkedUser || {
      _id: directoryEntry.user || directoryEntry._id,
      name: directoryEntry.name,
      email: directoryEntry.email,
      image: "",
      phoneNumber: "",
      isRegistered: true,
      createdAt: directoryEntry.createdAt,
    },
    directoryEntry,
  );

  const punishmentData = await getPunishmentData(directoryEntry.militaryId);
  const attendanceData = await getAttendanceData(
    directoryEntry,
    linkedUser?._id || account._id,
  );

  return {
    student: {
      ...studentIdentity,
      email: linkedUser?.email || directoryEntry.email,
      phoneNumber: linkedUser?.phoneNumber || "",
      image: linkedUser?.image || "",
    },
    official: {
      specialization: "",
      course: "",
      group: "",
      duration: DEFAULT_DURATION_LABEL,
      enrollmentInfo: "",
      status: punishmentData.currentStatus,
    },
    specialization: "",
    course: "",
    group: "",
    specializationDuration: DEFAULT_DURATION_LABEL,
    currentStatus: punishmentData.currentStatus,
    attendance: {
      absenceDays: attendanceData.absenceDays,
      lateCount: attendanceData.lateCount,
      totalAttendanceRecords: attendanceData.totalAttendanceRecords,
      totalDeduction: attendanceData.totalDeduction,
      latestAttendance: attendanceData.latestAttendance,
    },
    grades: {
      behavior: punishmentData.behaviorScore,
      history: punishmentData.chartData,
    },
    summary: {
      behaviorScore: punishmentData.behaviorScore,
      warningsCount: punishmentData.warningsCount,
      punishmentsCount: punishmentData.records.length,
      latestPunishment: punishmentData.latestPunishment
        ? formatPunishmentRecord(punishmentData.latestPunishment)
        : null,
      attendanceRecords: attendanceData.totalAttendanceRecords,
      lateCount: attendanceData.lateCount,
    },
  };
};

const buildAdminActions = async () => {
  const recentPunishments = await Punishment.find()
    .sort({ createdAt: -1 })
    .limit(15)
    .lean();

  const pendingExcuses = await Excuse.find({
    status: { $in: ["قيد المراجعة", "pending", "under_review"] },
  })
    .sort({ createdAt: -1 })
    .limit(15)
    .lean();

  const pendingHolidays = await HolidayRequest.find({ status: "pending" })
    .sort({ createdAt: -1 })
    .limit(15)
    .lean();

  const paymentRecords = await StudentPayment.find()
    .sort({ updatedAt: -1 })
    .limit(20)
    .lean();

  const paymentFollowUps = paymentRecords.flatMap((record) => {
    return (record.months || [])
      .filter((month) => month.status !== "paid")
      .map((month) => ({
        name: record.studentName,
        detail: `${month.monthName || "شهر غير محدد"}`,
        punishment: mapStatusToArabic(month.status),
      }));
  });

  return [
    {
      id: "punishments",
      title: "الطلاب المسجل عليهم مخالفات",
      time: "آخر التحديثات",
      reportType: "المخالفات والعقوبات",
      detailLabel: "نوع المخالفة",
      punishmentLabel: "الإجراء",
      students: recentPunishments.map((record) => ({
        name: record.studentName,
        detail: record.violation,
        punishment: record.punishment,
      })),
    },
    {
      id: "payment-follow-up",
      title: "الطلاب غير المسددين أو المتأخرين",
      time: "ملفات المصروفات",
      reportType: "متابعة السداد",
      detailLabel: "الفاتورة",
      punishmentLabel: "الحالة",
      students: paymentFollowUps.slice(0, 20),
    },
    {
      id: "excuses",
      title: "الالتماسات وطلبات الأعذار",
      time: "قيد المراجعة",
      reportType: "طلبات تحتاج متابعة",
      detailLabel: "الطلب",
      punishmentLabel: "الحالة",
      students: pendingExcuses.map((record) => ({
        name: record.studentName || record.studentEmail || "طالب",
        detail: record.title,
        punishment: mapStatusToArabic(record.status),
      })),
    },
    {
      id: "holidays",
      title: "طلبات الإجازات الرسمية",
      time: "قيد المراجعة",
      reportType: "طلبات إجازة",
      detailLabel: "السبب",
      punishmentLabel: "الحالة",
      students: pendingHolidays.map((record) => ({
        name: record.studentName,
        detail: record.reason,
        punishment: mapStatusToArabic(record.status),
      })),
    },
  ];
};

export const getStudentProfile = async (account) => {
  if (!isStudentRole(account?.role)) {
    throw createHttpError("Student access only", 403);
  }

  const directoryEntry = await resolveStudentDirectoryOrThrow(account);
  const userDocument = await User.findById(account._id).select("-password");

  return buildStudentProfilePayload(account, directoryEntry, userDocument);
};

export const updateStudentProfile = async (account, payload = {}) => {
  if (!isStudentRole(account?.role)) {
    throw createHttpError("Student access only", 403);
  }

  const nextEmail = String(payload.email || "").trim().toLowerCase();

  if (!nextEmail) {
    throw createHttpError("Email is required", 400);
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(nextEmail)) {
    throw createHttpError("Invalid email address", 400);
  }

  const userDocument = await User.findById(account._id);
  if (!userDocument) {
    throw createHttpError("Student account not found", 404);
  }

  const directoryEntry = await resolveStudentDirectoryOrThrow(account);

  const duplicateUser = await User.findOne({
    email: nextEmail,
    _id: { $ne: userDocument._id },
  });
  if (duplicateUser) {
    throw createHttpError("Email is already in use", 409);
  }

  const duplicateDirectory = await PermitStudentDirectory.findOne({
    email: nextEmail,
    _id: { $ne: directoryEntry._id },
  });
  if (duplicateDirectory) {
    throw createHttpError("Email is already in use", 409);
  }

  userDocument.email = nextEmail;
  await userDocument.save();

  directoryEntry.email = nextEmail;
  await directoryEntry.save();

  return buildStudentProfilePayload(account, directoryEntry, userDocument);
};

export const getAdminProfile = async (account) => {
  if (!isAdminRole(account?.role)) {
    throw createHttpError("Admin access only", 403);
  }

  const adminDocument = await Admin.findById(account._id).select("-password");
  if (!adminDocument) {
    throw createHttpError("Admin account not found", 404);
  }

  const [
    totalStudents,
    punishmentRecords,
    lateAggregation,
    pendingHolidayCount,
    pendingExcuseCount,
  ] = await Promise.all([
    PermitStudentDirectory.countDocuments(),
    Punishment.find().select("militaryNum punishment violation createdAt").lean(),
    PermitAdminAddition.aggregate([
      { $match: { status: "late" } },
      { $group: { _id: "$student", count: { $sum: 1 } } },
      { $match: { count: { $gte: HIGH_ABSENCE_THRESHOLD } } },
      { $count: "total" },
    ]),
    HolidayRequest.countDocuments({ status: "pending" }),
    Excuse.countDocuments({ status: { $in: ["قيد المراجعة", "pending", "under_review"] } }),
  ]);

  const statusMap = new Map();
  punishmentRecords.forEach((record) => {
    const key = record.militaryNum || record.studentName || record._id.toString();
    const level = classifyPunishmentLevel(record);
    if (!level) {
      return;
    }

    const current = statusMap.get(key);
    const rank = {
      warning_one: 1,
      warning_two: 2,
      suspended: 3,
      dismissed: 4,
    };

    if (!current || rank[level] > rank[current]) {
      statusMap.set(key, level);
    }
  });

  let warningOneCount = 0;
  let warningTwoCount = 0;
  let dismissedCount = 0;
  let suspendedCount = 0;

  statusMap.forEach((level) => {
    if (level === "warning_one") warningOneCount += 1;
    if (level === "warning_two") warningTwoCount += 1;
    if (level === "dismissed") dismissedCount += 1;
    if (level === "suspended") suspendedCount += 1;
  });

  return {
    admin: {
      _id: adminDocument._id,
      name: adminDocument.name,
      email: adminDocument.email,
      role: formatAdminRoleLabel(adminDocument.role),
      roleKey: adminDocument.role,
      permissions: ["profile:read", "profile:search_students", "profile:view_student_summary"],
      department: "إدارة شؤون الطلاب",
      staffInfo: {
        phoneNumber: adminDocument.phoneNumber || "",
      },
      avatar: adminDocument.image || "/images/admin-avatar.png",
      militaryId: adminDocument._id.toString().slice(-6).toUpperCase(),
    },
    contacts: {
      studentEmail: "",
      supervisorEmail: adminDocument.email,
    },
    stats: {
      totalStudents,
      warningOneCount,
      warningTwoCount,
      dismissedCount,
      suspendedCount,
      highAbsenceCount: lateAggregation[0]?.total || 0,
      pendingRequestsCount: pendingHolidayCount + pendingExcuseCount,
    },
    actions: await buildAdminActions(),
  };
};

export const searchStudentsForAdmin = async ({ search = "" } = {}) => {
  const trimmedSearch = String(search || "").trim();
  const normalizedSearch = normalizeArabicSearchText(trimmedSearch);

  const query = {};

  if (trimmedSearch) {
    const flexibleStartsWithRegex = new RegExp(
      `^${buildArabicFlexibleRegex(trimmedSearch)}`,
      "i",
    );
    const containsRegex = new RegExp(escapeRegex(trimmedSearch), "i");

    query.$or = [
      { name: flexibleStartsWithRegex },
      { email: containsRegex },
      { militaryId: containsRegex },
    ];
  }

  const students = await PermitStudentDirectory.find(query)
    .sort({ createdAt: -1 })
    .limit(MAX_SEARCH_RESULTS)
    .lean();

  return students.filter((student) => {
    if (!normalizedSearch) {
      return true;
    }

    const normalizedName = normalizeArabicSearchText(student.name || "");
    const normalizedEmail = String(student.email || "").toLowerCase();
    const normalizedMilitaryId = String(student.militaryId || "").toLowerCase();

    return (
      normalizedName.startsWith(normalizedSearch) ||
      normalizedEmail.includes(normalizedSearch) ||
      normalizedMilitaryId.includes(normalizedSearch)
    );
  }).map((student) => ({
    _id: student._id,
    id: student._id,
    name: student.name,
    email: student.email,
    militaryId: student.militaryId,
    avatar: "/images/student-avatar.png",
    role: "student",
  }));
};

export const getStudentProfileSummaryForAdmin = async (studentId) => {
  const directoryEntry = await PermitStudentDirectory.findById(toObjectId(studentId));

  if (!directoryEntry) {
    throw createHttpError("Student not found", 404);
  }


  const user = await User.findOne({ email: directoryEntry.email });

  const profile = await defaultStudentProfile(
    user || { email: directoryEntry.email, name: directoryEntry.name },
    directoryEntry,
  );

  const studentUser = await findStudentUser(directoryEntry);
  const [punishmentData, attendanceData, relativesCount, holidays, excuses, paymentData, medicalSummary] =
    await Promise.all([
      getPunishmentData(directoryEntry.militaryId),
      getAttendanceData(directoryEntry, studentUser?._id || directoryEntry.user),
      Relative.countDocuments({ student: directoryEntry._id }),
      getHolidayData(directoryEntry, studentUser),
      getExcuseData(directoryEntry, studentUser),
      getPaymentData(studentUser, directoryEntry),
      getMedicalSummary(directoryEntry, studentUser),
    ]);


  return {
    _id: directoryEntry._id,
    id: directoryEntry._id,
    name: directoryEntry.name,
    militaryId: directoryEntry.militaryId,
    email: studentUser?.email || directoryEntry.email,
    avatar: studentUser?.image || "/images/student-avatar.png",
    duration: DEFAULT_DURATION_LABEL,
    behaviorGrade: punishmentData.behaviorScore,
    absenceDays: attendanceData.absenceDays,
    busRequests: [],
    permits: attendanceData.permits,
    petitions: excuses,
    holidayRequests: holidays,
    payments: paymentData.payments,
    punishments: punishmentData.records.map(formatPunishmentRecord),
    summary: {
      currentStatus: punishmentData.currentStatus,
      warningsCount: punishmentData.warningsCount,
      punishmentsCount: punishmentData.records.length,
      latestPunishment: punishmentData.latestPunishment
        ? formatPunishmentRecord(punishmentData.latestPunishment)
        : null,
      attendanceRecords: attendanceData.totalAttendanceRecords,
      lateCount: attendanceData.lateCount,
      relativesCount,
      medicalCount: medicalSummary.count,
      latestMedicalStatus: medicalSummary.latestStatus,
      holidaysCount: holidays.length,
      excusesCount: excuses.length,
      pendingPaymentCount: paymentData.pendingPaymentCount,
    },
  };

};

export const getCurrentProfileByRole = async (account) => {
  if (isAdminRole(account?.role)) {
    return getAdminProfile(account);
  }

  return getStudentProfile(account);
};

