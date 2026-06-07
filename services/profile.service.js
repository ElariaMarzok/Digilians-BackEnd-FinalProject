import User from "../models/User.js";
import PermitStudentDirectory from "../models/PermitStudentDirectory.js";

const formatUserBasicData = (user, directoryEntry = null) => ({
  _id: user._id,
  name: directoryEntry?.name || user.name,
  email: user.email,
  militaryId: directoryEntry?.militaryId || "",
  role: "student",
  image: user.image,
  phoneNumber: user.phoneNumber,
});

const defaultStudentProfile = (user, directoryEntry) => ({
  student: formatUserBasicData(user, directoryEntry),
  department: "",
  specialization: "",
  course: "",
  specializationDuration: "غير محدد",
  status: "active",
  attendance: { absenceDays: 0 },
  grades: {
    behavior: 100,
    history: [{ label: "البداية", value: 100 }],
  },
  notes: "",
});

export const getOrCreateStudentProfile = async (user) => {
  const directoryEntry = await PermitStudentDirectory.findOne({
    email: user.email,
  });

  return defaultStudentProfile(user, directoryEntry);
};

export const getOrCreateCommanderProfile = async (user) => ({
  commander: {
    _id: user._id,
    name: user.name,
    email: user.email,
    militaryId: "",
    role: user.role,
    image: user.image,
    phoneNumber: user.phoneNumber,
  },
  rank: "",
  department: "",
  responsibility: "مسؤول شؤون الطلاب",
  permissionsScope: "department",
  notes: "",
});

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildArabicFlexibleRegex = (value) => {
  const arabicGroups = {
    ا: "[اأإآٱ]",
    أ: "[اأإآٱ]",
    إ: "[اأإآٱ]",
    آ: "[اأإآٱ]",
    ٱ: "[اأإآٱ]",
    ي: "[يىئ]",
    ى: "[يىئ]",
    ئ: "[يىئ]",
    ه: "[هة]",
    ة: "[هة]",
    و: "[وؤ]",
    ؤ: "[وؤ]",
  };

  return value
    .split("")
    .map((char) => arabicGroups[char] || escapeRegex(char))
    .join("");
};

export const searchStudentsForCommander = async ({ search = "" }) => {
  const trimmedSearch = search.trim();
  const query = {};

  if (trimmedSearch) {
    const flexibleArabicText = buildArabicFlexibleRegex(trimmedSearch);
    const nameStartsWithRegex = new RegExp(`^${flexibleArabicText}`, "i");
    const normalContainsRegex = new RegExp(escapeRegex(trimmedSearch), "i");

    query.$or = [
      { name: nameStartsWithRegex },
      { email: normalContainsRegex },
      { militaryId: normalContainsRegex },
    ];
  }

  const students = await PermitStudentDirectory.find(query)
    .sort({ createdAt: -1 })
    .limit(50);

  return students.map((student) => ({
    _id: student._id,
    name: student.name,
    email: student.email,
    militaryId: student.militaryId,
    role: "student",
  }));
};

export const getStudentProfileSummaryForCommander = async (studentId) => {
  const directoryEntry = await PermitStudentDirectory.findById(studentId);

  if (!directoryEntry) {
    const err = new Error("Student not found");
    err.statusCode = 404;
    throw err;
  }

  const user = await User.findOne({ email: directoryEntry.email });

  const profile = defaultStudentProfile(
    user || { email: directoryEntry.email, name: directoryEntry.name },
    directoryEntry,
  );

  return {
    ...profile,
    summary: {
      behaviorGrade: profile.grades.behavior,
      absenceDays: profile.attendance.absenceDays,
      status: profile.status,
    },
  };
};
