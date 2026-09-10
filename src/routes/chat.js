const express = require("express");
const chatRouter = express.Router();
const { userAuth } = require("../middlewares/auth");
const Chat = require("../models/chat");

chatRouter.get("/chat/:targetUserId", userAuth, async (req, res) => {
  const { targetUserId } = req.params;
  const userId = req.user._id;

  try {
    let chat = await Chat.findOne({
      participants: { $all: [userId, targetUserId] },
    }).populate({
      path: "messages.senderId",
      select: "firstName lastName",
    });

    if (!chat) {
      chat = new Chat({ participants: [userId, targetUserId], messages: [] });
      await chat.save();
    }

    res.json(chat);
  } catch (err) {
    res.status(500).send("Error fetching chat: " + err.message);
  }
});

module.exports = chatRouter;