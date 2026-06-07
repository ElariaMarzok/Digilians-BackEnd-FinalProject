/**
 * ═══════════════════════════════════════════════════════════════
 *  بيانات تسجيل الدخول للتجربة
 * ═══════════════════════════════════════════════════════════════
 *
 *  users  → تسجيل دخول الطلاب
 *  admins → تسجيل دخول الأدمن (Sandy@gmail.com فقط)
 */

export const STUDENT_PASSWORD = "Student123@";

export const ADMIN_ACCOUNT = {
  name: "Sandy Admin",
  email: "Sandy@gmail.com",
  password: "Sandy123@",
  role: "admin",
  militaryId: "ADM001",
};

/**
 * الطلاب الفعليين — موجودين في:
 *   users                     → للدخول
 *   permit_student_directory  → الاسم والرقم العسكري
 */
export const TEST_STUDENTS = [
  {
    name: "أحمد محمد علي",
    email: "ahmed.mohamed@digilians.test",
    militaryId: "23451",
    adminAddition: { status: "present" },
  },
  {
    name: "محمود حسن إبراهيم",
    email: "mahmoud.hassan@digilians.test",
    militaryId: "56782",
    adminAddition: { status: "late" },
  },
  {
    name: "يوسف عادل سالم",
    email: "youssef.adel@digilians.test",
    militaryId: "89123",
    adminAddition: null,
  },
  {
    name: "كريم سامي فتحي",
    email: "karim.samy@digilians.test",
    militaryId: "34567",
    adminAddition: null,
  },
  {
    name: "عمر خالد ناصر",
    email: "omar.khaled@digilians.test",
    militaryId: "67890",
    adminAddition: null,
  },
  {
    name: "فاطمة أحمد محمود",
    email: "fatma.ahmed@digilians.test",
    militaryId: "12389",
    adminAddition: null,
  },
  {
    name: "سارة محمود عبدالله",
    email: "sara.mahmoud@digilians.test",
    militaryId: "45612",
    adminAddition: null,
  },
  {
    name: "مصطفى إبراهيم رضا",
    email: "mostafa.ibrahim@digilians.test",
    militaryId: "78934",
    adminAddition: null,
  },
];
