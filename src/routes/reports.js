const express = require("express");
const reportsRouter = express.Router();
const { userAuth } = require("../middlewares/auth");
const { adminAuth } = require("../middlewares/adminAuth");
const Report = require("../models/report");

// Any logged-in user can report another user
reportsRouter.post("/report/:targetUserId", userAuth, async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const { reason, details } = req.body;

    if (targetUserId === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot report yourself." });
    }

    const allowedReasons = ["spam", "harassment", "fake_profile", "inappropriate_content", "other"];
    if (!allowedReasons.includes(reason)) {
      return res.status(400).json({ message: "Invalid report reason." });
    }

    await Report.create({
      reporterId: req.user._id,
      reportedUserId: targetUserId,
      reason,
      details,
    });

    res.json({ message: "Report submitted. Our team will review it." });
  } catch (err) {
    console.error("Failed to submit report:", err);
    res.status(500).send("Failed to submit report");
  }
});

// Admin-only: list pending reports
reportsRouter.get("/admin/reports", userAuth, adminAuth, async (req, res) => {
  try {
    const reports = await Report.find({ status: "pending" })
      .populate("reporterId", "firstName lastName email")
      .populate("reportedUserId", "firstName lastName email photoUrl")
      .sort({ createdAt: -1 });

    res.json({ data: reports });
  } catch (err) {
    res.status(500).send("Failed to fetch reports");
  }
});

// Admin-only: mark a report reviewed or dismissed
reportsRouter.patch("/admin/reports/:reportId", userAuth, adminAuth, async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status } = req.body;

    if (!["reviewed", "dismissed"].includes(status)) {
      return res.status(400).json({ message: "Invalid status." });
    }

    await Report.findByIdAndUpdate(reportId, { status });
    res.json({ message: "Report updated." });
  } catch (err) {
    res.status(500).send("Failed to update report");
  }
});

module.exports = reportsRouter;