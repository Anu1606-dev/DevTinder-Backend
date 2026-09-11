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
    })
      .populate({
        path: "messages.senderId",
        select: "firstName lastName",
      })
      .populate("participants", "firstName lastName photoUrl"); // ← ADDED

    if (!chat) {
      chat = new Chat({ participants: [userId, targetUserId], messages: [] });
      await chat.save();
      chat = await chat.populate("participants", "firstName lastName photoUrl"); // ← ADDED
    }

    res.json(chat);
  } catch (err) {
    res.status(500).send("Error fetching chat: " + err.message);
  }
});

chatRouter.get("/chats", userAuth, async (req, res) => {
  try {
    const userId = req.user._id;

    const chats = await Chat.find({
      participants: userId,
      "messages.0": { $exists: true },
    })
      .populate("participants", "firstName lastName photoUrl")
      .sort({ updatedAt: -1 });

    const formatted = chats.map((chat) => {
      const otherUser = chat.participants.find(
        (p) => p._id.toString() !== userId.toString()
      );
      const lastMessage = chat.messages[chat.messages.length - 1];

      return {
        targetUserId: otherUser?._id,
        firstName: otherUser?.firstName,
        lastName: otherUser?.lastName,
        photoUrl: otherUser?.photoUrl,
        lastMessageText: lastMessage?.text || "",
        lastMessageSenderId: lastMessage?.senderId?.toString() || null, // ← ADDED
        lastMessageTime: lastMessage?.createdAt || chat.updatedAt,
      };
    });

    res.json({ data: formatted });
  } catch (err) {
    res.status(500).send("Error fetching chats: " + err.message);
  }
});

module.exports = chatRouter;