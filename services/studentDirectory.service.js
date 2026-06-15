import User from "../models/User.js";
import PermitStudentDirectory from "../models/PermitStudentDirectory.js";
import { normalizeArabicSearchText, buildArabicFlexibleRegex, escapeRegex } from "../utils/arabicNormalize.js";

export const generateUniqueMilitaryId = async () => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const length = Math.floor(Math.random() * 3) + 4;
    const digits = Array.from({ length }, () =>
      Math.floor(Math.random() * 10),
    ).join("");
    const militaryId = digits.replace(/^0+/, "") || "1";

    const exists = await PermitStudentDirectory.findOne({ militaryId });
    if (!exists) {
      return militaryId;
    }
  }

  const err = new Error("تعذر إنشاء رقم عسكري فريد");
  err.statusCode = 500;
  throw err;
};

const hasArabicText = (value = "") => /[\u0600-\u06FF]/.test(value);

export const ensureStudentInDirectory = async (user) => {
  const normalizedEmail = user.email.toLowerCase().trim();
  const emailPrefix = normalizedEmail.split("@")[0];

  let entry = await PermitStudentDirectory.findOne({ email: normalizedEmail });

  if (!entry && user._id) {
    entry = await PermitStudentDirectory.findOne({ user: user._id });
  }

  if (entry) {
    if (!entry.user) {
      entry.user = user._id;
    }

    const userNeedsArabicName =
      !user.name || user.name === emailPrefix || !hasArabicText(user.name);
    const entryHasArabicName = hasArabicText(entry.name);

    if (userNeedsArabicName && entryHasArabicName) {
      user.name = entry.name;
      await user.save();
    } else if (!entryHasArabicName && hasArabicText(user.name)) {
      entry.name = user.name;
    }

    await entry.save();
    return entry;
  }

  const militaryId = await generateUniqueMilitaryId();

  entry = await PermitStudentDirectory.create({
    user: user._id,
    email: normalizedEmail,
    name: user.name || emailPrefix,
    militaryId,
  });

  return entry;
};

export const resolveDirectoryForAccount = async ({ email, userId }) => {
  const normalizedEmail = email?.toLowerCase().trim();

  if (!normalizedEmail && !userId) {
    return null;
  }

  const query = [];

  if (normalizedEmail) {
    query.push({ email: normalizedEmail });
  }

  if (userId) {
    query.push({ user: userId });
  }

  let entry = await PermitStudentDirectory.findOne({ $or: query });

  if (!entry && userId) {
    const user = await User.findById(userId);
    if (user) {
      entry = await ensureStudentInDirectory(user);
    }
  }

  return entry;
};

export const buildStudentAuthProfile = (user, directoryEntry) => ({
  _id: user._id,
  name: directoryEntry?.name || user.name,
  email: user.email,
  militaryId: directoryEntry?.militaryId || "",
  role: "student",
  image: user.image,
  phoneNumber: user.phoneNumber,
  isRegistered: user.isRegistered,
  createdAt: user.createdAt,
});

export const findDirectoryStudentByIdentifier = async (identifier) => {
  const trimmed = identifier.trim();
  console.log("🔍 Searching for:", trimmed);

  if (!trimmed) {
    const err = new Error("يرجى إدخال البريد الإلكتروني أو اسم الطالب");
    err.statusCode = 400;
    throw err;
  }

  // البحث مباشرة من جدول الطلاب (permit_student_directories)
  // بدون البحث من جدول الحضور

  // Check if database has any students
  const totalCount = await PermitStudentDirectory.countDocuments();
  console.log("📊 Total students in database:", totalCount);

  if (totalCount === 0) {
    const err = new Error("لا يوجد طلاب في الداتا بيز - يرجى إضافة طلاب أولاً");
    err.statusCode = 404;
    throw err;
  }

  // استخدام البحث المرن للأسماء العربية
  const flexibleRegex = new RegExp("^" + buildArabicFlexibleRegex(trimmed), "i");
  const containsRegex = new RegExp(escapeRegex(trimmed), "i");

  // أولاً: البحث بالتطابق التام
  console.log("Step 1: Exact match...");
  let student = await PermitStudentDirectory.findOne({
    $or: [
      { email: trimmed.toLowerCase() },
      { militaryId: trimmed }
    ]
  });

  if (student) {
    console.log("✅ Found by exact match:", student.name);
    return student;
  }

  // ثانياً: البحث المرن (مع تجاهال الهمزات والتشكيل)
  console.log("Step 2: Flexible regex...");
  student = await PermitStudentDirectory.findOne({
    $or: [
      { email: containsRegex },
      { name: flexibleRegex },
      { name: containsRegex },
      { militaryId: containsRegex }
    ]
  });

  if (student) {
    console.log("✅ Found by flexible:", student.name);
    return student;
  }

  // ثالثاً: البحث باستخدام normalized name
  console.log("Step 3: Normalized search...");
  const normalizedSearch = normalizeArabicSearchText(trimmed);
  const allStudents = await PermitStudentDirectory.find({}).limit(100);

  const fallbackMatch = allStudents.find(s => {
    const normalizedName = normalizeArabicSearchText(s.name || "");
    return normalizedName.includes(normalizedSearch);
  });

  if (fallbackMatch) {
    console.log("✅ Found by normalized:", fallbackMatch.name);
    return fallbackMatch;
  }

  // If not found in database, return not found error
  console.log("❌ Student not found");
  const err = new Error("الطالب دا مش موجود");
  err.statusCode = 404;
  throw err;
};
