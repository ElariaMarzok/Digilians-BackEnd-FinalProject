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

const clearAttendance = async () => {
  const mongoUri = resolveMongoUri();
  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(mongoUri);
  console.log("✅ Connected\n");

  // Delete all attendance records
  const deleted = await PermitAdminAddition.deleteMany({});
  console.log(`🗑️  Deleted ${deleted.deletedCount} attendance records`);

  // Also delete all student directories and users (clean slate)
  await PermitStudentDirectory.deleteMany({});
  await User.deleteMany({});
  console.log("🗑️  Cleared student directory and users");

  // Check what's left
  const count = await PermitAdminAddition.countDocuments();
  console.log(`\n📊 Remaining attendance records: ${count}`);

  await mongoose.disconnect();
  console.log("\n✅ Database cleaned! Restart server and try again.");
};

clearAttendance().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
