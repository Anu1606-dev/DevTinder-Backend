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
      .populate({ path: "messages.senderId", select: "firstName lastName" })
      .populate("participants", "firstName lastName photoUrl skills");

    if (!chat) {
      chat = new Chat({ participants: [userId, targetUserId], messages: [] });
      await chat.save();
      chat = await chat.populate("participants", "firstName lastName photoUrl skills");
    }

    chat.lastSeen.set(userId.toString(), new Date());
    await chat.save();

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
      .populate("participants", "firstName lastName photoUrl skills") // ← FIXED: was missing skills
      .sort({ updatedAt: -1 });

    const formatted = chats.map((chat) => {
      const otherUser = chat.participants.find(
        (p) => p._id.toString() !== userId.toString()
      );
      const lastMessage = chat.messages[chat.messages.length - 1];

      const lastSeenTime = chat.lastSeen.get(userId.toString()) || new Date(0);
      const unreadCount = chat.messages.filter(
        (m) =>
          m.senderId.toString() !== userId.toString() &&
          new Date(m.createdAt) > lastSeenTime
      ).length;

      return {
        targetUserId: otherUser?._id,
        firstName: otherUser?.firstName,
        lastName: otherUser?.lastName,
        photoUrl: otherUser?.photoUrl,
        lastMessageText: lastMessage?.text || "",
        lastMessageSenderId: lastMessage?.senderId?.toString() || null,
        lastMessageTime: lastMessage?.createdAt || chat.updatedAt,
        unreadCount,
        skills: otherUser?.skills || [],
      };
    });

    res.json({ data: formatted });
  } catch (err) {
    res.status(500).send("Error fetching chats: " + err.message);
  }
});

module.exports = chatRouter;