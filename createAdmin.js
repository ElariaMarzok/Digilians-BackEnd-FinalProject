import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import Admin from "./models/Admin.js";
import { ADMIN_ACCOUNT } from "./data/testAccounts.js";

const createAdminUser = async () => {
  try {
    const mongoUri =
      process.env.MONGO_URI && !process.env.MONGO_URI.includes("USERNAME:PASSWORD")
        ? process.env.MONGO_URI
        : "mongodb://127.0.0.1:27017/digilians";

    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("✅ Connected");

    await Admin.deleteMany({ email: /^sandy@gmail\.com$/i });

    await Admin.create({
      name: ADMIN_ACCOUNT.name,
      email: ADMIN_ACCOUNT.email,
      password: ADMIN_ACCOUNT.password,
      phoneNumber: "+201000000000",
    });

    console.log("✅ Admin created in admins collection");
    console.log(`   Email:    ${ADMIN_ACCOUNT.email}`);
    console.log(`   Password: ${ADMIN_ACCOUNT.password}`);

    await mongoose.connection.close();
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
};

createAdminUser();
