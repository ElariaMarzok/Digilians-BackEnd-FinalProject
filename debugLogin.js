import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { loginUser } from "./services/auth.service.js";

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected for debug");
    const email = "Sandy@gmail.com";
    const password = "Sandy123@";
    try {
      const res = await loginUser({ email, password });
      console.log("Login result:", res);
    } catch (err) {
      console.error("Login error:", err.message);
      if (err.stack) console.error(err.stack);
    }

    await mongoose.connection.close();
    console.log("Disconnected");
  } catch (e) {
    console.error("Debug error", e.message);
  }
};

run();
