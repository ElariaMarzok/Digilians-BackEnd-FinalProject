import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import Admin from "./models/Admin.js";
import User from "./models/User.js";

const createAdminUser = async () => {
  try {
    // Connect to MongoDB
    console.log("🔌 Connecting to MongoDB...");
    console.log("URI:", process.env.MONGO_URI.substring(0, 50) + "...");

    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Wait a moment for connection to stabilize
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Check if admin already exists and delete old one
    const existingAdmin = await Admin.findOne({ role: "admin" });
    if (existingAdmin) {
      console.log("🗑️  Deleting old admin account...");
      await Admin.deleteOne({ _id: existingAdmin._id });
      console.log("✅ Old admin deleted");
    }

    // Delete any existing Sandy account (case-insensitive)
    await User.deleteMany({ email: /^sandy@gmail\.com$/i });
    await Admin.deleteMany({ email: /^sandy@gmail\.com$/i });

    // Admin credentials
    const adminData = {
      name: "Sandy Admin",
      email: "Sandy@gmail.com",
      password: "Sandy123@",
      role: "admin",
      phoneNumber: "+201000000000",
      militaryId: "ADM001",
      isRegistered: true,
    };

    // Create admin user (let model pre-save hash the plain password)
    const admin = new Admin({
      ...adminData,
    });

    await admin.save();
    console.log("✅ Admin user created successfully!");
    console.log("\n🔐 Admin Credentials:");
    console.log("─────────────────────────");
    console.log(`Email: ${adminData.email}`);
    console.log(`Password: ${adminData.password}`);
    console.log(`Role: ${adminData.role}`);
    console.log(`Admin Code: ${process.env.ADMIN_REGISTRATION_KEY}`);
    console.log("─────────────────────────\n");

    // Verify it was saved
    const savedAdmin = await Admin.findOne({ email: "Sandy@gmail.com" });
    if (savedAdmin) {
      console.log("✅ Verified: Admin found in database");
    }

    await mongoose.connection.close();
    console.log("✅ Database connection closed");
  } catch (err) {
    console.error("❌ Error creating admin user:", err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
};

createAdminUser();
