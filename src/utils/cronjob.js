const cron = require("node-cron");
const { subDays, startOfDay, endOfDay } = require("date-fns");
const ConnectionRequestModel = require("../models/connectionRequest");
const sendEmail = require("./sendEmail");

cron.schedule("0 8 * * *", async () => {
  try {
    const yesterday = subDays(new Date(), 1);
    const yesterdayStart = startOfDay(yesterday);
    const yesterdayEnd = endOfDay(yesterday);

    const pendingRequests = await ConnectionRequestModel.find({
      status: "interested",
      createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd },
    }).populate("fromUserId toUserId");

    const uniqueEmails = [
      ...new Set(pendingRequests.map((req) => req.toUserId.email)),
    ];

    console.log(`Sending reminder emails to ${uniqueEmails.length} users`);

    // ← ADDED: compute new accepted connections in the last 7 days, for a growth-flavored digest line
    const sevenDaysAgo = subDays(new Date(), 7);
    const recentAcceptedRequests = await ConnectionRequestModel.find({
      status: "accepted",
      updatedAt: { $gte: sevenDaysAgo },
    });

    for (const email of uniqueEmails) {
      try {
        const recipientRequest = pendingRequests.find((r) => r.toUserId.email === email);
        const recipientId = recipientRequest?.toUserId?._id?.toString();

        // ← ADDED
        const newConnectionsThisWeek = recentAcceptedRequests.filter(
          (r) =>
            r.fromUserId.toString() === recipientId ||
            r.toUserId.toString() === recipientId
        ).length;

        const weeklyLine = newConnectionsThisWeek > 0
          ? `You've also made ${newConnectionsThisWeek} new connection${newConnectionsThisWeek > 1 ? "s" : ""} this week — keep it up!`
          : "";

        await sendEmail.run(
          email,
          "New connection requests waiting for you!",
          `<h1>You have new connection requests from yesterday. Log in to DevTinder to review them!</h1><p>${weeklyLine}</p>`,
          `You have new connection requests from yesterday. Log in to DevTinder to review them! ${weeklyLine}`
        );
      } catch (err) {
        console.error(`Failed to email ${email}:`, err);
      }
    }
  } catch (err) {
    console.error("Cron job failed:", err);
  }
});