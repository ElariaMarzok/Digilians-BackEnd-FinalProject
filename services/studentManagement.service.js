import PermitStudentDirectory from "../models/PermitStudentDirectory.js";
import PermitAdminAddition from "../models/PermitAdminAddition.js";
import Excuse from "../models/Excuse.js";
import { generateUniqueMilitaryId } from "./studentDirectory.service.js";

const getTodayRange = () => {
  const now = new Date();
  const formatObj = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });
  const partsNow = formatObj.formatToParts(now);
  const mapNow = Object.fromEntries(partsNow.map((p) => [p.type, p.value]));

  const year = parseInt(mapNow.year, 10);
  const month = parseInt(mapNow.month, 10) - 1; // 0-indexed month
  const day = parseInt(mapNow.day, 10);
  const hour = parseInt(mapNow.hour, 10);
  const minute = parseInt(mapNow.minute, 10);
  const second = parseInt(mapNow.second, 10);

  const cairoAsUTC = Date.UTC(year, month, day, hour, minute, second);
  const offset = cairoAsUTC - now.getTime(); // Egypt offset in ms

  const startOfToday = new Date(Date.UTC(year, month, day, 0, 0, 0, 0) - offset);
  const endOfToday = new Date(Date.UTC(year, month, day, 23, 59, 59, 999) - offset);

  return { startOfToday, endOfToday };
};

/**
 * Add a new student to the directory (not attendance, just creating the student record)
 */
export const addStudentToDirectory = async ({ name, militaryId, email }) => {
  if (!name || !name.trim()) {
    const err = new Error("يرجى إدخال اسم الطالب");
    err.statusCode = 400;
    throw err;
  }

  const normalizedName = name.trim();
  const normalizedEmail = email?.trim()?.toLowerCase() || null;
  const providedMilitaryId = militaryId?.trim() || null;

  // Check if email already exists (if provided)
  if (normalizedEmail) {
    const existingEmail = await PermitStudentDirectory.findOne({ email: normalizedEmail });
    if (existingEmail) {
      const err = new Error("البريد الإلكتروني مسجل بالفعل");
      err.statusCode = 409;
      throw err;
    }
  }

  // Check if militaryId already exists (if provided)
  if (providedMilitaryId) {
    const existingMilitaryId = await PermitStudentDirectory.findOne({ militaryId: providedMilitaryId });
    if (existingMilitaryId) {
      const err = new Error(`الرقم العسكري ${providedMilitaryId} مسجل بالفعل`);
      err.statusCode = 409;
      throw err;
    }
  }

  // Generate unique militaryId if not provided
  const finalMilitaryId = providedMilitaryId || await generateUniqueMilitaryId();

  // If email not provided, create a placeholder email based on name
  // Convert Arabic name to lowercase and remove spaces for email
  const emailPrefix = normalizedName
    .replace(/[\u0600-\u06FF]/g, (match) => {
      // Arabic to English mappings for common characters
      const arabicToEnglish = {
        'ا': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'a', 'ب': 'b', 'ت': 't', 'ث': 'th',
        'ج': 'j', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'dh', 'ر': 'r',
        'ز': 'z', 'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z',
        'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l',
        'م': 'm', 'ن': 'n', 'ه': 'h', 'و': 'w', 'ي': 'y', 'ى': 'y',
        'ة': 'a', 'ء': 'a', 'ئ': 'a', 'ؤ': 'a', 'ٱ': 'a'
      };
      return arabicToEnglish[match] || match;
    })
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();

  const finalEmail = normalizedEmail || `${emailPrefix}@digilians.local`;

  // Create the student directory entry
  const student = await PermitStudentDirectory.create({
    name: normalizedName,
    email: finalEmail,
    militaryId: finalMilitaryId,
  });

return {
    _id: student._id,
    name: student.name,
    email: student.email,
    militaryId: student.militaryId,
  };
};

/**
 * Search for a student by military ID
 */
export const searchStudentByMilitaryId = async (militaryId) => {
  if (!militaryId || !militaryId.trim()) {
    const err = new Error("يرجى إدخال الرقم العسكري");
    err.statusCode = 400;
    throw err;
  }

  const trimmedId = militaryId.trim();
  
  // Find student in directory
  const student = await PermitStudentDirectory.findOne({ militaryId: trimmedId });

  if (!student) {
    const err = new Error("الطالب غير موجود في الجدول");
    err.statusCode = 404;
    throw err;
  }

  return {
    _id: student._id,
    name: student.name,
    email: student.email,
    militaryId: student.militaryId,
  };
};

/**
 * Record student attendance (for a student already in directory)
 */
export const recordStudentAttendance = async ({ studentId, permitType = "اعتيادي", note = "" }) => {
  const { startOfToday, endOfToday } = getTodayRange();

  // Check if student exists
  const student = await PermitStudentDirectory.findById(studentId);
  if (!student) {
    const err = new Error("الطالب غير موجود");
    err.statusCode = 404;
    throw err;
  }

  // Check if already recorded today
  const existingToday = await PermitAdminAddition.findOne({
    student: studentId,
    arrivedAt: { $gte: startOfToday, $lte: endOfToday },
  });

  if (existingToday) {
    const err = new Error("الطالب موجود بالفعل في الجدول");
    err.statusCode = 409;
    throw err;
  }

// Check if student has an approved excuse (التماس مقبول)
  let isApprovedExcuse = false;
  let approvedExcuseTitle = null;
  let status = "present";
  let deduction = 0;

  if (student.user) {
    const excuse = await Excuse.findOne({
      user: student.user,
      status: "مُجاب",
    }).sort({ createdAt: -1 });

    isApprovedExcuse = !!excuse;
    approvedExcuseTitle = excuse?.title || null;
  }

if (isApprovedExcuse) {
    // If student has approved excuse: display as "في الموعد" (on time)
    // requestStatus will show "التماس"
    status = "present";
    deduction = 0;
  } else {
    // No excuse: Apply normal late logic
    // Before 5 PM = present (في الموعد), no deduction
    // After 5 PM = late (متأخر), 5 degrees deduction
    const arrivedAt = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Africa/Cairo",
      hour: "numeric",
      hour12: false,
    });
    const hour = parseInt(formatter.format(arrivedAt), 10);
    const isLate = hour >= 17;
    status = isLate ? "late" : "present";
    deduction = isLate ? 5 : 0;
  }

  // Get current time for record
  const arrivedAt = new Date();

  // Use excuse title for permitType if approved, otherwise use provided permitType
  const finalPermitType = isApprovedExcuse ? approvedExcuseTitle : (permitType || "اعتيادي");

  // Create attendance record
  const record = await PermitAdminAddition.create({
    student: studentId,
    arrivedAt,
    status,
    deduction,
    permitType: finalPermitType,
    note,
  });

  const populated = await PermitAdminAddition.findById(record._id).populate("student");

  return {
    _id: populated._id,
    name: populated.student.name,
    email: populated.student.email,
    militaryId: populated.student.militaryId,
    permitType: populated.permitType,
    status: populated.status,
    deduction: populated.deduction,
    note: populated.note,
    arrivedAt: populated.arrivedAt,
  };
};
