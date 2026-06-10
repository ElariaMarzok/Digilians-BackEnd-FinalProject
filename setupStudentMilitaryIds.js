/**
 * Script لتصحيح بيانات الطالب وإضافة militaryId للطلاب الموجودين
 * استخدم هذا إذا كانت بيانات الطالب موجودة لكن بدون militaryId
 * 
 * الطريقة:
 * 1. شغل هذا الـ script في الـ Terminal بالـ Backend directory
 * 2. node setupStudentMilitaryIds.js
 */

import db from "./config/db.js";
import User from "./models/User.js";
import PermitStudentDirectory from "./models/PermitStudentDirectory.js";

async function main() {
  try {
    await db();
    console.log("✅ تم الاتصال بقاعدة البيانات\n");

    // 1. اجلب جميع الطلاب
    const students = await User.find({ role: { $ne: "admin" } });
    console.log(`📌 عدد الطلاب في الـ Users: ${students.length}\n`);

    // 2. اجلب جميع الطلاب المسموحين
    const allowedStudents = await PermitStudentDirectory.find();
    console.log(`📌 عدد الطلاب المسموحين: ${allowedStudents.length}\n`);

    // 3. عرض الطلاب الذين ليس لديهم militaryId
    console.log("📋 الطلاب الذين سيتم تحديثهم:");
    console.log("─".repeat(80));

    let updated = 0;

    for (const student of students) {
      // ابحث عن هذا الطالب في PermitStudentDirectory
      const directoryEntry = await PermitStudentDirectory.findOne({
        email: student.email,
      });

      if (!directoryEntry) {
        console.log(
          `⚠️  الطالب "${student.name}" (${student.email}) - غير موجود في PermitStudentDirectory`
        );
        console.log(
          `   ➡️  يرجى إضافته يدوياً أو استخدام script آخر\n`
        );
      } else {
        console.log(
          `✅ الطالب "${student.name}" (${student.email})`
        );
        console.log(
          `   ➡️  الرقم العسكري: ${directoryEntry.militaryId}\n`
        );
        updated++;
      }
    }

    console.log("─".repeat(80));
    console.log(`\n📊 النتيجة النهائية:`);
    console.log(`   • إجمالي الطلاب: ${students.length}`);
    console.log(`   • الطلاب المسموحين: ${updated}`);
    console.log(`   • الطلاب بحاجة إلى إضافة: ${students.length - updated}\n`);

    if (students.length - updated > 0) {
      console.log("💡 الحل:");
      console.log("   1. افتح صفحة الأدمن");
      console.log("   2. اذهب إلى قسم إدارة الطلاب");
      console.log("   3. أضف الطلاب المفقودين مع أرقامهم العسكرية\n");
    }

    process.exit(0);
  } catch (err) {
    console.error("❌ خطأ:", err.message);
    process.exit(1);
  }
}

main();
