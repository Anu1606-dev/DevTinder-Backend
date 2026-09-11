const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
  },
  { timestamps: true }
);

const chatSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    messages: [messageSchema],
    lastSeen: {
      type: Map,
      of: Date,
      default: {},
    }, // ← ADDED — tracks, per user, when they last opened this conversation
  },
  { timestamps: true }
);

module.exports = mongoose.model("Chat", chatSchema);