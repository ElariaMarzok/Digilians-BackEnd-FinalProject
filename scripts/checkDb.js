import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import PermitAdminAddition from "../models/PermitAdminAddition.js";
import PermitStudentDirectory from "../models/PermitStudentDirectory.js";
import User from "../models/User.js";

const resolveMongoUri = () => {
  const envUri = process.env.MONGO_URI;
  const isPlaceholder = envUri && envUri.includes("USERNAME:PASSWORD");
  if (envUri && !isPlaceholder) return envUri;
  return "mongodb://127.0.0.1:27017/digilians";
};

const checkDb = async () => {
  const mongoUri = resolveMongoUri();
  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(mongoUri);
  console.log("✅ Connected\n");

  const count1 = await PermitAdminAddition.countDocuments();
  const count2 = await PermitStudentDirectory.countDocuments();
  const count3 = await User.countDocuments();

  console.log("══════════════════════════════════════");
  console.log("  DATABASE COUNTS");
  console.log("══════════════════════════════════════");
  console.log(`  permit_admin_additions:  ${count1}`);
  console.log(`  permit_student_directory: ${count2}`);
  console.log(`  users:                   ${count3}`);
  console.log("══════════════════════════════════════\n");

  // Show recent attendance records
  const recentRecords = await PermitAdminAddition.find().sort({ arrivedAt: -1 }).limit(5);
  console.log("Recent attendance records:");
  recentRecords.forEach(r => {
    console.log(`  - ${r._id}: arrivedAt=${r.arrivedAt}, status=${r.status}`);
  });

  await mongoose.disconnect();
  console.log("\n✅ Done");
};

checkDb().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
