const cron = require("node-cron");
const { subDays, startOfDay, endOfDay } = require("date-fns");
const ConnectionRequestModel = require("../models/connectionRequest");
const sendEmail = require("./sendEmail");

// Runs every day at 8:00 AM server time
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

        for (const email of uniqueEmails) {
            try {
                await sendEmail.run(
                    email,
                    "New connection requests waiting for you!",
                    `<h1>You have new connection requests from yesterday. Log in to DevTinder to review them!</h1>`,
                    `You have new connection requests from yesterday. Log in to DevTinder to review them!`
                );
            } catch (err) {
                console.error(`Failed to email ${email}:`, err);
            }
        }
    } catch (err) {
        console.error("Cron job failed:", err);
    }
});