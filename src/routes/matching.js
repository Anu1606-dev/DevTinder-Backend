const express = require("express");
const matchingRouter = express.Router();
const { userAuth } = require("../middlewares/auth");
const User = require("../models/user");
const { generateIcebreaker } = require("../utils/matchingService");

// Generate a skill-based icebreaker suggestion for a specific chat — instant, no external API
matchingRouter.get("/matching/icebreaker/:targetUserId", userAuth, async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const icebreaker = generateIcebreaker(req.user, targetUser);
    res.json({ icebreaker });
  } catch (err) {
    console.error("Failed to generate icebreaker:", err);
    res.status(500).send("Failed to generate icebreaker");
  }
});

module.exports = matchingRouter;