import mongoose from "mongoose";
import HolidayRequest from "../models/HolidayRequest.js";
import { resolveDirectoryForAccount } from "./studentDirectory.service.js";

const formatDate = (date) =>
  date.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

const formatHolidayRecord = (record, student) => ({
  _id: record._id,
  id: record._id,
  studentName: student?.name || "—",
  studentEmail: student?.email || "—",
  militaryId: student?.militaryId || "—",
  reason: record.reason,
  startDate: formatDate(record.startDate),
  endDate: formatDate(record.endDate),
  startDateRaw: record.startDate,
  endDateRaw: record.endDate,
  status: record.status,
  adminResponse: record.adminResponse || "",
  reviewedAt: record.reviewedAt ? formatDate(record.reviewedAt) : null,
  createdAt: formatDate(record.createdAt),
  createdAtRaw: record.createdAt,
});

export const submitHolidayRequest = async (userId, email, { reason, startDate, endDate }) => {
  // Get student from directory
  const directoryStudent = await resolveDirectoryForAccount({ email, userId });

  if (!directoryStudent) {
    const err = new Error("الطالب غير موجود في الدليل");
    err.statusCode = 404;
    throw err;
  }

  // Check for pending requests
  const existingPending = await HolidayRequest.findOne({
    user: userId,
    status: "pending"
  });

  if (existingPending) {
    const err = new Error("لديك طلب اجازة معلقة بالفعل");
    err.statusCode = 409;
    throw err;
  }

  const holidayRequest = await HolidayRequest.create({
    user: userId,
    student: directoryStudent._id,
    studentName: directoryStudent.name,
    studentMilitaryId: directoryStudent.militaryId,
    studentEmail: directoryStudent.email,
    reason,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
  });

  const populated = await HolidayRequest.findById(holidayRequest._id)
    .populate({
      path: "student",
      model: "PermitStudentDirectory"
    });

  return formatHolidayRecord(populated, populated.student);
};

export const getPendingHolidayRequests = async ({ searchValue = "", status = "pending" } = {}) => {
  const query = { status: status || "pending" };

  const records = await HolidayRequest.find(query)
    .populate({
      path: "student",
      model: "PermitStudentDirectory"
    })
    .sort({ createdAt: -1 });

  // DEBUG: Log raw records to see what's being returned from populate
  console.log('=== getPendingHolidayRequests DEBUG ===');
  console.log('Query:', query);
  console.log('Records found:', records.length);
  if (records.length > 0) {
    const first = records[0];
    console.log('First record student type:', typeof first.student);
    console.log('First record student is ObjectId:', first.student instanceof mongoose.Types.ObjectId);
    console.log('First record student:', first.student);
    if (first.student && typeof first.student === 'object' && !(first.student instanceof mongoose.Types.ObjectId)) {
      console.log('First record student.name:', first.student.name);
      console.log('First record student.militaryId:', first.student.militaryId);
    }
  }
  console.log('=====================================');

  const trimmedSearch = searchValue?.trim();

  const filtered = trimmedSearch
    ? records.filter((record) => {
        const student = record.student;
        return (
          student.militaryId?.includes(trimmedSearch) ||
          student.email?.toLowerCase().includes(trimmedSearch.toLowerCase()) ||
          student.name?.includes(trimmedSearch)
        );
      })
    : records;

  return filtered.map((record) => formatHolidayRecord(record, record.student));
};

// Get all approved holiday requests (for admin to view approved requests)
export const getApprovedHolidayRequests = async ({ searchValue = "" } = {}) => {
  const query = { status: "approved" };

  const records = await HolidayRequest.find(query)
    .populate({
      path: "student",
      model: "PermitStudentDirectory"
    })
    .sort({ createdAt: -1 });

  const trimmedSearch = searchValue?.trim();

  const filtered = trimmedSearch
    ? records.filter((record) => {
        const student = record.student;
        return (
          student.militaryId?.includes(trimmedSearch) ||
          student.email?.toLowerCase().includes(trimmedSearch.toLowerCase()) ||
          student.name?.includes(trimmedSearch)
        );
      })
    : records;

  return filtered.map((record) => formatHolidayRecord(record, record.student));
};

// Get all rejected holiday requests (for admin to view rejected requests)
export const getRejectedHolidayRequests = async ({ searchValue = "" } = {}) => {
  const query = { status: "rejected" };

  const records = await HolidayRequest.find(query)
    .populate({
      path: "student",
      model: "PermitStudentDirectory"
    })
    .sort({ createdAt: -1 });

  const trimmedSearch = searchValue?.trim();

  const filtered = trimmedSearch
    ? records.filter((record) => {
        const student = record.student;
        return (
          student.militaryId?.includes(trimmedSearch) ||
          student.email?.toLowerCase().includes(trimmedSearch.toLowerCase()) ||
          student.name?.includes(trimmedSearch)
        );
      })
    : records;

  return filtered.map((record) => formatHolidayRecord(record, record.student));
};

// Get ALL holiday requests regardless of status
export const getAllHolidayRequests = async ({ searchValue = "" } = {}) => {
  const records = await HolidayRequest.find({})
    .populate("student")
    .sort({ createdAt: -1 });

  const trimmedSearch = searchValue?.trim();

  const filtered = trimmedSearch
    ? records.filter((record) => {
        const student = record.student;
        return (
          student.militaryId?.includes(trimmedSearch) ||
          student.email?.toLowerCase().includes(trimmedSearch.toLowerCase()) ||
          student.name?.includes(trimmedSearch)
        );
      })
    : records;

  return filtered.map((record) => formatHolidayRecord(record, record.student));
};

export const getUserHolidayRequests = async (userId) => {
  const records = await HolidayRequest.find({ user: userId })
    .populate("student")
    .sort({ createdAt: -1 });

  return records.map((record) => {
    const populated = record; // Already populated due to .populate("student") above
    return formatHolidayRecord(populated, populated.student);
  });
};

export const approveHolidayRequest = async (requestId, adminId, adminResponse) => {
  const request = await HolidayRequest.findById(requestId);

  if (!request) {
    const err = new Error("طلب الاجازة غير موجود");
    err.statusCode = 404;
    throw err;
  }

  request.status = "approved";
  request.adminResponse = adminResponse || "";
  request.reviewedBy = adminId;
  request.reviewedAt = new Date();

  await request.save();

  const populated = await HolidayRequest.findById(request._id)
    .populate("student");

  return formatHolidayRecord(populated, populated.student);
};

export const rejectHolidayRequest = async (requestId, adminId, adminResponse) => {
  const request = await HolidayRequest.findById(requestId);

  if (!request) {
    const err = new Error("طلب الاجازة غير موجود");
    err.statusCode = 404;
    throw err;
  }

  request.status = "rejected";
  request.adminResponse = adminResponse || "";
  request.reviewedBy = adminId;
  request.reviewedAt = new Date();

  await request.save();

  const populated = await HolidayRequest.findById(request._id)
    .populate("student");

  return formatHolidayRecord(populated, populated.student);
};

export const setPendingHolidayRequest = async (requestId, adminId, adminResponse) => {
  const request = await HolidayRequest.findById(requestId);

  if (!request) {
    const err = new Error("طلب الاجازة غير موجود");
    err.statusCode = 404;
    throw err;
  }

  request.status = "pending";
  request.adminResponse = adminResponse || "";
  request.reviewedBy = adminId;
  request.reviewedAt = new Date();

  await request.save();

  const populated = await HolidayRequest.findById(request._id)
    .populate("student");

  return formatHolidayRecord(populated, populated.student);
};

export const getHolidayStats = async () => {
  const pending = await HolidayRequest.countDocuments({ status: "pending" });
  const approved = await HolidayRequest.countDocuments({ status: "approved" });
  const rejected = await HolidayRequest.countDocuments({ status: "rejected" });

  return {
    pending,
    approved,
    rejected,
    total: pending + approved + rejected
  };
};

// Delete all holiday requests by status (for clear all functionality)
export const clearAllHolidayRequests = async (status) => {
  const query = status && status !== 'all' ? { status } : {};
  await HolidayRequest.deleteMany(query);
  return { success: true };
};
