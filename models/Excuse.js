import mongoose from "mongoose";

const { Schema, model } = mongoose;

const AttachmentSchema = new Schema(
  {
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    url: String,
  },
  { _id: false },
);

const ExcuseSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    studentName: String,
    studentEmail: String,
    militaryId: String,
    attachments: [AttachmentSchema],
    response: String,
    responder: { type: Schema.Types.ObjectId, ref: "User" },
    respondedAt: Date,
    status: { type: String, default: "قيد المراجعة" },
  },
  { timestamps: true },
);

export default model("Excuse", ExcuseSchema);
