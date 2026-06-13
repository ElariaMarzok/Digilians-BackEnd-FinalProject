import mongoose from "mongoose";
import Relative from "../models/Relative.js";
import PermitStudentDirectory from "../models/PermitStudentDirectory.js";
import { resolveDirectoryForAccount } from "./studentDirectory.service.js";

const ALLOWED_RELATIONS = [
  "\u0623\u0628",
  "\u0623\u0645",
  "\u0623\u062e",
  "\u0623\u062e\u062a",
  "\u0632\u0648\u062c",
  "\u0632\u0648\u062c\u0629",
  "\u0627\u0628\u0646",
  "\u0627\u0628\u0646\u0629",
  "\u062c\u062f",
  "\u062c\u062f\u0629",
  "\u0639\u0645",
  "\u0639\u0645\u0629",
  "\u062e\u0627\u0644",
  "\u062e\u0627\u0644\u0629",
  "\u0627\u0628\u0646 \u0639\u0645",
  "\u0627\u0628\u0646\u0629 \u0639\u0645",
  "\u0627\u0628\u0646 \u062e\u0627\u0644",
  "\u0627\u0628\u0646\u0629 \u062e\u0627\u0644",
  "\u0642\u0631\u064a\u0628 \u0622\u062e\u0631",
];

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeArabicSearchText = (value = "") =>
  String(value)
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/[\u0623\u0625\u0622\u0671]/g, "\u0627")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const buildArabicFlexibleRegex = (value = "") => {
  const arabicGroups = {
    "\u0627": "[\u0627\u0623\u0625\u0622\u0671]",
    "\u0623": "[\u0627\u0623\u0625\u0622\u0671]",
    "\u0625": "[\u0627\u0623\u0625\u0622\u0671]",
    "\u0622": "[\u0627\u0623\u0625\u0622\u0671]",
    "\u0671": "[\u0627\u0623\u0625\u0622\u0671]",
    " ": "\\s+",
  };

  return normalizeArabicSearchText(value)
    .split("")
    .map((char) => arabicGroups[char] || escapeRegex(char))
    .join("");
};

const formatDate = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toISOString().slice(0, 10);
};

const formatRelativeRecord = (record) => ({
  _id: record._id,
  id: record._id.toString(),
  student: record.student?._id || record.student,
  user: record.user || null,
  relativeName: record.relativeName,
  relation: record.relation,
  nationalId: record.nationalId || "",
  birthDate: formatDate(record.birthDate),
  job: record.job || "",
  socialStatus: record.socialStatus || "",
  phone: record.phone || "",
  address: record.address || "",
  notes: record.notes || "",
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
});

const formatStudentRecord = (student, relativesCount = 0) => ({
  _id: student._id,
  id: student._id.toString(),
  name: student.name,
  email: student.email,
  militaryId: student.militaryId,
  relativesCount,
  createdAt: student.createdAt ? student.createdAt.toISOString().slice(0, 10) : "",
  updatedAt: student.updatedAt ? student.updatedAt.toISOString().slice(0, 10) : "",
});

const assertValidObjectId = (value, label) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    const err = new Error(`Invalid ${label}`);
    err.statusCode = 400;
    throw err;
  }
};

const getStudentDirectoryForUser = async (user) => {
  const student = await resolveDirectoryForAccount({
    email: user.email,
    userId: user._id,
  });

  if (!student) {
    const err = new Error("Student directory entry not found");
    err.statusCode = 404;
    throw err;
  }

  return student;
};

const normalizeString = (value) => (typeof value === "string" ? value.trim() : "");

const normalizeRelativePayload = (payload = {}, { partial = false } = {}) => {
  const normalized = {};
  const fields = [
    "relativeName",
    "relation",
    "nationalId",
    "birthDate",
    "job",
    "socialStatus",
    "phone",
    "address",
    "notes",
  ];

  fields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      normalized[field] = normalizeString(payload[field]);
    }
  });

  if (!partial || Object.prototype.hasOwnProperty.call(normalized, "relativeName")) {
    if (!normalized.relativeName) {
      const err = new Error("relativeName is required");
      err.statusCode = 400;
      throw err;
    }
  }

  if (!partial || Object.prototype.hasOwnProperty.call(normalized, "relation")) {
    if (!normalized.relation) {
      const err = new Error("relation is required");
      err.statusCode = 400;
      throw err;
    }

    if (!ALLOWED_RELATIONS.includes(normalized.relation)) {
      const err = new Error("Unsupported relation value");
      err.statusCode = 400;
      throw err;
    }
  }

  if (partial && Object.keys(normalized).length === 0) {
    const err = new Error("No fields provided for update");
    err.statusCode = 400;
    throw err;
  }

  return normalized;
};

const getOwnedRelative = async (relativeId, studentId) => {
  assertValidObjectId(relativeId, "relative id");

  const record = await Relative.findOne({
    _id: relativeId,
    student: studentId,
  });

  if (!record) {
    const err = new Error("Relative record not found");
    err.statusCode = 404;
    throw err;
  }

  return record;
};

const matchesNormalizedStudentSearch = (student, normalizedSearch) => {
  const normalizedName = normalizeArabicSearchText(student.name || "");
  const normalizedEmail = String(student.email || "").trim().toLowerCase();
  const normalizedMilitaryId = String(student.militaryId || "").trim().toLowerCase();

  return (
    normalizedName.startsWith(normalizedSearch) ||
    normalizedEmail.includes(normalizedSearch) ||
    normalizedMilitaryId.includes(normalizedSearch)
  );
};

export const getMyRelatives = async (user) => {
  const student = await getStudentDirectoryForUser(user);
  const records = await Relative.find({ student: student._id }).sort({ createdAt: -1 });

  return records.map(formatRelativeRecord);
};

export const createRelativeForStudent = async (user, payload) => {
  const student = await getStudentDirectoryForUser(user);
  const relativePayload = normalizeRelativePayload(payload);

  const record = await Relative.create({
    ...relativePayload,
    student: student._id,
    user: user._id,
  });

  return formatRelativeRecord(record);
};

export const updateRelativeForStudent = async (user, relativeId, payload) => {
  const student = await getStudentDirectoryForUser(user);
  const relativePayload = normalizeRelativePayload(payload, { partial: true });
  const record = await getOwnedRelative(relativeId, student._id);

  Object.assign(record, relativePayload);
  await record.save();

  return formatRelativeRecord(record);
};

export const deleteRelativeForStudent = async (user, relativeId) => {
  const student = await getStudentDirectoryForUser(user);
  const record = await getOwnedRelative(relativeId, student._id);

  await record.deleteOne();

  return { id: relativeId };
};

const getRelativesCountMap = async (studentIds) => {
  if (studentIds.length === 0) {
    return new Map();
  }

  const counts = await Relative.aggregate([
    {
      $match: {
        student: {
          $in: studentIds.map((id) => new mongoose.Types.ObjectId(id)),
        },
      },
    },
    {
      $group: {
        _id: "$student",
        count: { $sum: 1 },
      },
    },
  ]);

  return new Map(counts.map((item) => [item._id.toString(), item.count]));
};

export const getStudentsWithRelatives = async () => {
  const groups = await Relative.aggregate([
    {
      $group: {
        _id: "$student",
        count: { $sum: 1 },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);

  if (groups.length === 0) {
    return [];
  }

  const students = await PermitStudentDirectory.find({
    _id: { $in: groups.map((item) => item._id) },
  }).sort({ createdAt: -1 });

  const countMap = new Map(groups.map((item) => [item._id.toString(), item.count]));

  return students.map((student) =>
    formatStudentRecord(student, countMap.get(student._id.toString()) || 0),
  );
};

export const searchStudentsWithRelatives = async (search = "") => {
  const trimmedSearch = search.trim();

  if (!trimmedSearch) {
    return getStudentsWithRelatives();
  }

  const normalizedSearch = normalizeArabicSearchText(trimmedSearch);
  const flexibleArabicText = buildArabicFlexibleRegex(trimmedSearch);
  const nameStartsWithRegex = new RegExp(`^${flexibleArabicText}`, "i");
  const emailOrIdRegex = new RegExp(escapeRegex(trimmedSearch), "i");

  const directMatches = await PermitStudentDirectory.find({
    $or: [
      { name: nameStartsWithRegex },
      { email: emailOrIdRegex },
      { militaryId: emailOrIdRegex },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(50);

  const directIds = new Set(directMatches.map((student) => student._id.toString()));

  const normalizedFallbackCandidates = await PermitStudentDirectory.find({
    _id: { $nin: Array.from(directIds) },
  })
    .sort({ createdAt: -1 })
    .limit(200);

  const fallbackMatches = normalizedFallbackCandidates.filter((student) =>
    matchesNormalizedStudentSearch(student, normalizedSearch),
  );

  const students = [...directMatches, ...fallbackMatches].slice(0, 50);
  const countMap = await getRelativesCountMap(
    students.map((student) => student._id.toString()),
  );

  return students.map((student) =>
    formatStudentRecord(student, countMap.get(student._id.toString()) || 0),
  );
};

export const getStudentRelativesForAdmin = async (studentId) => {
  assertValidObjectId(studentId, "student id");

  const student = await PermitStudentDirectory.findById(studentId);

  if (!student) {
    const err = new Error("Student not found");
    err.statusCode = 404;
    throw err;
  }

  const records = await Relative.find({ student: student._id }).sort({ createdAt: -1 });

  return {
    student: formatStudentRecord(student, records.length),
    relatives: records.map(formatRelativeRecord),
  };
};
