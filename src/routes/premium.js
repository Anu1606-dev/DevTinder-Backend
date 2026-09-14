const express = require("express");
const premiumRouter = express.Router();
const { userAuth } = require("../middlewares/auth");
const { premiumAuth } = require("../middlewares/premiumAuth");
const User = require("../models/user");
const ProfileView = require("../models/profileView");

// Activate a 24-hour feed boost — premium only
premiumRouter.post("/premium/boost", userAuth, premiumAuth, async (req, res) => {
  try {
    const boostedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await User.findByIdAndUpdate(req.user._id, { boostedUntil });
    res.json({ message: "Profile boosted for 24 hours!", boostedUntil });
  } catch (err) {
    console.error("Failed to activate boost:", err);
    res.status(500).send("Failed to activate boost");
  }
});

// View analytics — premium only
premiumRouter.get("/premium/analytics", userAuth, premiumAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [viewsLast7Days, viewsLast30Days, totalViews] = await Promise.all([
      ProfileView.countDocuments({ viewedUserId: userId, createdAt: { $gte: sevenDaysAgo } }),
      ProfileView.countDocuments({ viewedUserId: userId, createdAt: { $gte: thirtyDaysAgo } }),
      ProfileView.countDocuments({ viewedUserId: userId }),
    ]);

    res.json({ viewsLast7Days, viewsLast30Days, totalViews });
  } catch (err) {
    console.error("Failed to fetch analytics:", err);
    res.status(500).send("Failed to fetch analytics");
  }
});

module.exports = premiumRouter;