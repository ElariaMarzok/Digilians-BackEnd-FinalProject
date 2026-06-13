import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import PermitAdminAddition from "../models/PermitAdminAddition.js";

const resolveMongoUri = () => {
  const envUri = process.env.MONGO_URI;
  const isPlaceholder = envUri && envUri.includes("USERNAME:PASSWORD");
  if (envUri && !isPlaceholder) return envUri;
  return "mongodb://127.0.0.1:27017/digilians";
};

const clearTodayAttendance = async () => {
  const mongoUri = resolveMongoUri();
  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(mongoUri);
  console.log("✅ Connected\n");

  // Get today's date range (consistent with statement.service.js)
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // Delete only today's attendance records
  const deleted = await PermitAdminAddition.deleteMany({
    arrivedAt: { $gte: startOfToday, $lte: endOfToday },
  });
  
  console.log(`🗑️  Deleted ${deleted.deletedCount} today's attendance records`);

  // Check what's left - count only today's records (consistent with getStatementStats)
  const count = await PermitAdminAddition.countDocuments({
    arrivedAt: { $gte: startOfToday, $lte: endOfToday },
  });
  console.log(`\n📊 Remaining today's attendance records: ${count}`);

  await mongoose.disconnect();
  console.log("\n✅ Done!");
};

clearTodayAttendance().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
