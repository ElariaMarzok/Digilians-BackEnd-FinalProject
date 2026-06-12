import mongoose from "mongoose";

const conversationMessageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    senderType: {
      type: String,
      enum: ["admin", "student"],
      required: true,
    },
    senderAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    senderUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    readByAdmin: {
      type: Boolean,
      default: false,
    },
    readByStudent: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

const ConversationMessage = mongoose.model(
  "ConversationMessage",
  conversationMessageSchema,
  "conversation_messages",
);

export default ConversationMessage;
