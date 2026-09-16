const express = require("express");
const searchRouter = express.Router();
const { userAuth } = require("../middlewares/auth");
const User = require("../models/user");
const ConnectionRequest = require("../models/connectionRequest");
const { calculateSkillMatch } = require("../utils/matchingService");

const USER_SAFE_DATA = ["firstName", "lastName", "photoUrl", "about", "skills", "age", "isGithubVerified"];

searchRouter.get("/user/search", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;
    const query = (req.query.q || "").trim();

    if (!query) {
      return res.json({ data: [] });
    }

    const regex = new RegExp(query, "i"); // case-insensitive partial match

    const candidates = await User.find({
      _id: { $ne: loggedInUser._id },
      $or: [
        { firstName: regex },
        { lastName: regex },
        { skills: regex }, // MongoDB matches regex against array elements automatically
      ],
    }).select(USER_SAFE_DATA);

    // Determine connection status with each candidate in one query, not one-per-candidate
    const candidateIds = candidates.map((c) => c._id);
    const existingRequests = await ConnectionRequest.find({
      $or: [
        { fromUserId: loggedInUser._id, toUserId: { $in: candidateIds } },
        { toUserId: loggedInUser._id, fromUserId: { $in: candidateIds } },
      ],
    });

    const statusMap = {};
    existingRequests.forEach((r) => {
      const otherId = r.fromUserId.toString() === loggedInUser._id.toString()
        ? r.toUserId.toString()
        : r.fromUserId.toString();
      statusMap[otherId] = r.status === "accepted" ? "connected" : "pending";
    });

    const results = candidates
      .map((candidate) => {
        const matchScore = calculateSkillMatch(loggedInUser.skills, candidate.skills);
        const connectionStatus = statusMap[candidate._id.toString()] || "none";
        return { ...candidate.toObject(), matchScore, connectionStatus };
      })
      .sort((a, b) => b.matchScore - a.matchScore);

    res.json({ data: results });
  } catch (err) {
    console.error("Search failed:", err);
    res.status(500).send("Search failed: " + err.message);
  }
});

module.exports = searchRouter;