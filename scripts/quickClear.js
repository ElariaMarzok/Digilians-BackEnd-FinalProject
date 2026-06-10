import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import PermitAdminAddition from "../models/PermitAdminAddition.js";
import PermitStudentDirectory from "../models/PermitStudentDirectory.js";
import User from "../models/User.js";

const clearAll = async () => {
  const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/digilians";
  console.log("Connecting to:", mongoUri);
  
  try {
    await mongoose.connect(mongoUri);
    console.log("Connected!");

    const del1 = await PermitAdminAddition.deleteMany({});
    console.log("Deleted attendance:", del1.deletedCount);

    const del2 = await PermitStudentDirectory.deleteMany({});
    console.log("Deleted student dir:", del2.deletedCount);

    const del3 = await User.deleteMany({});
    console.log("Deleted users:", del3.deletedCount);

    console.log("Done!");
  } catch (err) {
    console.error("Error:", err.message);
  }
  
  await mongoose.disconnect();
  process.exit(0);
};

clearAll();
