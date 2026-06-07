import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import User from "../models/User.js";
import Admin from "../models/Admin.js";
import PermitStudentDirectory from "../models/PermitStudentDirectory.js";
import PermitAdminAddition from "../models/PermitAdminAddition.js";
import {
  ADMIN_ACCOUNT,
  STUDENT_PASSWORD,
  TEST_STUDENTS,
} from "../data/testAccounts.js";
import { ensureStudentInDirectory } from "../services/studentDirectory.service.js";

const OLD_COLLECTIONS = [
  "login_accounts",
  "statement_students",
  "statement_attendances",
  "permit_registered_students",
  "permit_attendance_records",
  "studentprofiles",
  "student_academic_profiles",
  "commanderprofiles",
];

const resolveMongoUri = () => {
  const envUri = process.env.MONGO_URI;
  const isPlaceholder = envUri && envUri.includes("USERNAME:PASSWORD");
  if (envUri && !isPlaceholder) return envUri;
  return "mongodb://127.0.0.1:27017/digilians";
};

const buildArrivedAt = (status) => {
  const date = new Date();
  date.setHours(status === "late" ? 17 : 15, 30, 0, 0);
  return date;
};

const setupDatabase = async () => {
  const mongoUri = resolveMongoUri();

  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(mongoUri);
  console.log("✅ Connected\n");

  console.log("🧹 Removing old/unused collections...");
  const db = mongoose.connection.db;
  const existing = (await db.listCollections().toArray()).map((c) => c.name);

  for (const name of OLD_COLLECTIONS) {
    if (existing.includes(name)) {
      await db.dropCollection(name);
      console.log(`   dropped: ${name}`);
    }
  }

  console.log("\n🗑️  Clearing main collections...");
  await PermitAdminAddition.deleteMany({});
  await PermitStudentDirectory.deleteMany({});
  await User.deleteMany({});
  await Admin.deleteMany({});

  console.log("\n══════════════════════════════════════════");
  console.log("  DATABASE STRUCTURE (4 collections)");
  console.log("══════════════════════════════════════════");
  console.log("  [1] users                    → طلاب (login)");
  console.log("  [2] admins                   → Sandy فقط (login)");
  console.log("  [3] permit_student_directory → الأسماء الفعلية");
  console.log("  [4] permit_admin_additions   → إضافات الأدمن");
  console.log("══════════════════════════════════════════\n");

  await Admin.create({
    name: ADMIN_ACCOUNT.name,
    email: ADMIN_ACCOUNT.email,
    password: ADMIN_ACCOUNT.password,
  });
  console.log(`✅ admins: ${ADMIN_ACCOUNT.email}`);

  for (const student of TEST_STUDENTS) {
    const user = await User.create({
      name: student.name,
      email: student.email,
      password: STUDENT_PASSWORD,
      isRegistered: true,
    });

    const directoryEntry = await PermitStudentDirectory.create({
      user: user._id,
      email: student.email,
      name: student.name,
      militaryId: student.militaryId,
    });

    console.log(`✅ users + directory: ${student.name} → ${student.email}`);

    if (student.adminAddition) {
      const isLate = student.adminAddition.status === "late";
      await PermitAdminAddition.create({
        student: directoryEntry._id,
        arrivedAt: buildArrivedAt(student.adminAddition.status),
        status: student.adminAddition.status,
        deduction: isLate ? 5 : 0,
      });
    }
  }

  console.log("\n══════════════════════════════════════════");
  console.log("  PASSWORDS");
  console.log("══════════════════════════════════════════");
  console.log(`  Admin (admins):  ${ADMIN_ACCOUNT.password}`);
  console.log(`  Students (users): ${STUDENT_PASSWORD}`);
  console.log("══════════════════════════════════════════");
  console.log("\n  Admin login:");
  console.log(`    ${ADMIN_ACCOUNT.email}  →  ${ADMIN_ACCOUNT.password}`);
  console.log("\n  Student examples:");
  TEST_STUDENTS.slice(0, 3).forEach((s) => {
    console.log(`    ${s.email}  →  ${STUDENT_PASSWORD}`);
  });
  const allUsers = await User.find();
  for (const user of allUsers) {
    await ensureStudentInDirectory(user);
  }

  console.log("══════════════════════════════════════════");
  console.log("\n⚠️  بعد الـ setup: اعمل Logout ثم Login تاني من الفرونت");
  console.log("══════════════════════════════════════════\n");

  await mongoose.connection.close();
  console.log("✅ Database ready");
};

setupDatabase().catch((err) => {
  console.error("❌ Setup failed:", err.message);
  process.exit(1);
});
