import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import User from "../models/User.js";
import Admin from "../models/Admin.js";
import Excuse from "../models/Excuse.js";

const resolveMongoUri = () => {
  const envUri = process.env.MONGO_URI;
  const isPlaceholder = envUri && envUri.includes("USERNAME:PASSWORD");
  if (envUri && !isPlaceholder) return envUri;
  return "mongodb://127.0.0.1:27017/digilians";
};

const run = async () => {
  const uri = resolveMongoUri();
  await mongoose.connect(uri);

  const studentEmail = "ahmed.mohamed@digilians.test";
  const adminEmail = "Sandy@gmail.com";

  const student = await User.findOne({ email: studentEmail });
  const admin = await Admin.findOne({ email: adminEmail });

  if (!student || !admin) {
    console.error("Student or Admin not found. Run db:setup first.");
    process.exit(1);
  }

  const excuse = await Excuse.create({
    user: student._id,
    title: "طلب عذر تجريبي",
    message: "هذا نص اختبار لطلب عذر من الطالب.",
  });

  console.log("Created excuse:", excuse._id.toString());

  // Admin responds
  excuse.response = "تمت الموافقة على طلبك. تأكد من الحضور غداً.";
  excuse.responder = admin._id;
  excuse.respondedAt = new Date();
  excuse.status = "مُجاب";
  await excuse.save();

  const populated = await Excuse.findById(excuse._id).populate("user responder");
  console.log("Excuse after admin response:");
  console.log({
    id: populated._id.toString(),
    title: populated.title,
    userEmail: populated.user.email,
    responderEmail: populated.responder.email,
    response: populated.response,
    status: populated.status,
  });

  await mongoose.connection.close();
  console.log("Done.");
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
