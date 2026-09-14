const express = require('express');
const userRouter = express.Router();
const { userAuth } = require('../middlewares/auth');
const ConnectionRequest = require('../models/connectionRequest');
const User = require('../models/user');
const ProfileView = require('../models/profileView');
const { calculateSkillMatch } = require('../utils/matchingService');
const { BADGES } = require('../utils/badgesConfig'); // ← ADDED

const USER_SAFE_DATA = ["firstName", "lastName", "photoUrl", "about", "skills", "age"];

userRouter.get("/user/requests/received", userAuth, async (req, res) => {
    try {
        const loggedInUser = req.user;
        const connectionRequests = await ConnectionRequest.find({
            toUserId: loggedInUser._id,
            status: "interested",
        }).populate("fromUserId", USER_SAFE_DATA);

        const dataWithScores = connectionRequests.map((row) => {
            const fromUserObj = row.toObject().fromUserId;
            const matchScore = calculateSkillMatch(loggedInUser.skills, fromUserObj.skills);
            return {
                ...row.toObject(),
                fromUserId: { ...fromUserObj, matchScore },
            };
        });

        res.json({
            message: "Data fetched successfully!!",
            data: dataWithScores,
        });

    } catch (err) {
        res.status(500).send("Error!!" + err.message);
    }
});

userRouter.get("/user/connections", userAuth, async (req, res) => {
    try {
        const loggedInUser = req.user;
        const connectionRequests = await ConnectionRequest.find({
            $or: [
                { fromUserId: loggedInUser._id, status: "accepted" },
                { toUserId: loggedInUser._id, status: "accepted" }
            ]
        }).populate("fromUserId", USER_SAFE_DATA).populate("toUserId", USER_SAFE_DATA);

        const data = connectionRequests.map((row) => {
            const otherUser = row.fromUserId._id.toString() === loggedInUser._id.toString()
                ? row.toUserId
                : row.fromUserId;

            const matchScore = calculateSkillMatch(loggedInUser.skills, otherUser.skills);
            return { ...otherUser.toObject(), matchScore };
        });

        res.json({
            message: "Connections fetched successfully!!",
            data,
        });

    } catch (err) {
        res.status(400).send({ message: "Error!!" + err.message })
    }
});

userRouter.get("/user/feed", userAuth, async (req, res) => {
    try {
        const loggedInUser = req.user;
        const page = parseInt(req.query.page) || 1;
        let limit = parseInt(req.query.limit) || 10;
        limit = limit > 50 ? 50 : limit;
        const skip = (page - 1) * limit;

        const connectionRequests = await ConnectionRequest.find({
            $or: [
                { fromUserId: loggedInUser._id },
                { toUserId: loggedInUser._id }
            ]
        }).select("fromUserId  toUserId");

        const hideUsersFromFeed = new Set();
        connectionRequests.forEach((req) => {
            hideUsersFromFeed.add(req.fromUserId.toString());
            hideUsersFromFeed.add(req.toUserId.toString());
        });

        const candidates = await User.find({
            $and: [
                { _id: { $nin: Array.from(hideUsersFromFeed) } },
                { _id: { $ne: loggedInUser._id } }
            ]
        }).select([...USER_SAFE_DATA, "boostedUntil"]);

        const now = new Date();

        const scoredUsers = candidates
            .map((candidate) => {
                const matchScore = calculateSkillMatch(loggedInUser.skills, candidate.skills);
                const isBoosted = candidate.boostedUntil && new Date(candidate.boostedUntil) > now;
                const { boostedUntil, ...safeCandidate } = candidate.toObject();
                return { ...safeCandidate, matchScore, isBoosted };
            })
            .sort((a, b) => {
                if (a.isBoosted && !b.isBoosted) return -1;
                if (!a.isBoosted && b.isBoosted) return 1;
                return b.matchScore - a.matchScore;
            });

        const paginatedUsers = scoredUsers.slice(skip, skip + limit);

        if (paginatedUsers.length > 0) {
            const viewDocs = paginatedUsers.map((u) => ({
                viewerId: loggedInUser._id,
                viewedUserId: u._id,
            }));
            ProfileView.insertMany(viewDocs).catch((err) =>
                console.error("Failed to log profile views:", err)
            );
        }

        res.json({
            message: "Feed fetched successfully!!",
            data: paginatedUsers,
        });

    } catch (err) {
        res.status(400).send({ message: "Error!!" + err.message });
    }
})

// ← ADDED: gamification badges, computed live from actual connection count
userRouter.get("/user/badges", userAuth, async (req, res) => {
    try {
        const loggedInUser = req.user;
        const connectionCount = await ConnectionRequest.countDocuments({
            $or: [
                { fromUserId: loggedInUser._id, status: "accepted" },
                { toUserId: loggedInUser._id, status: "accepted" },
            ],
        });

        const badgesWithStatus = BADGES.map((badge) => ({
            ...badge,
            achieved: connectionCount >= badge.threshold,
        }));

        res.json({ connectionCount, badges: badgesWithStatus });
    } catch (err) {
        res.status(500).send("Failed to fetch badges: " + err.message);
    }
});

module.exports = userRouter;