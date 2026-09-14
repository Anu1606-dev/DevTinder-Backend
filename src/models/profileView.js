const mongoose = require("mongoose");

const profileViewSchema = new mongoose.Schema(
  {
    viewerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    viewedUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ProfileView", profileViewSchema);