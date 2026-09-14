const express = require('express');
const userRouter = express.Router();
const { userAuth } = require('../middlewares/auth');
const ConnectionRequest = require('../models/connectionRequest');
const User = require('../models/user');
const { calculateSkillMatch } = require('../utils/matchingService'); // ← ADDED

const USER_SAFE_DATA = ["firstName", "lastName", "photoUrl", "about", "skills", "age"];

userRouter.get("/user/requests/received", userAuth, async (req, res) => {
    try {
        const loggedInUser = req.user;
        const connectionRequests = await ConnectionRequest.find({
            toUserId: loggedInUser._id,
            status: "interested",
        }).populate("fromUserId", USER_SAFE_DATA);

        res.json({
            message: "Data fetched successfully!!",
            data: connectionRequests,
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
            if (row.fromUserId._id.toString() === loggedInUser._id.toString()) {
                return row.toUserId;
            }
            return row.fromUserId;
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

        // ← CHANGED: fetch all eligible candidates first (no skip/limit yet),
        // so we can rank by match quality across the whole pool, not just one page at a time
        const candidates = await User.find({
            $and: [
                { _id: { $nin: Array.from(hideUsersFromFeed) } },
                { _id: { $ne: loggedInUser._id } }
            ]
        }).select(USER_SAFE_DATA);

        // ← ADDED: score every candidate by skill overlap, best matches first
        const scoredUsers = candidates
            .map((candidate) => {
                const matchScore = calculateSkillMatch(loggedInUser.skills, candidate.skills);
                return { ...candidate.toObject(), matchScore };
            })
            .sort((a, b) => b.matchScore - a.matchScore);

        // ← CHANGED: paginate in-memory now, after sorting by match score
        const paginatedUsers = scoredUsers.slice(skip, skip + limit);

        res.json({
            message: "Feed fetched successfully!!",
            data: paginatedUsers,
        });

    } catch (err) {
        res.status(400).send({ message: "Error!!" + err.message });
    }
})

module.exports = userRouter;