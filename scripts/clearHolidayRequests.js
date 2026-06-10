import dotenv from "dotenv";
dotenv.config({ override: true });
import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI;

const clearHolidayRequests = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to database");

    const collection = mongoose.connection.collection("holiday_requests");
    const result = await collection.deleteMany({});
    console.log(`🗑️ Deleted ${result.deletedCount} holiday requests`);

    await mongoose.disconnect();
    console.log("✅ Disconnected");
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
};

clearHolidayRequests();