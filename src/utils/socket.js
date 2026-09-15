const socketIo = require("socket.io");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const Chat = require("../models/chat");
const ConnectionRequestModel = require("../models/connectionRequest");
const { containsProfanity } = require("../utils/contentModeration");

let ioInstance; // ← ADDED

const getSecretRoomId = (userId, targetUserId) => {
  return crypto
    .createHash("sha256")
    .update([userId, targetUserId].sort().join("_"))
    .digest("hex");
};

const initializeSocket = (server) => {
  const io = socketIo(server, {
    cors: {
      origin: process.env.CLIENT_URL,
      credentials: true,
    },
  });

  ioInstance = io; // ← ADDED

  io.on("connection", (socket) => {
    let userId;
    try {
      const cookies = socket.handshake.headers.cookie || "";
      const tokenMatch = cookies.match(/token=([^;]+)/);
      const token = tokenMatch ? tokenMatch[1] : null;
      if (!token) throw new Error("No token found in socket handshake");

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded._id;
    } catch (err) {
      console.log("Socket auth failed:", err.message);
      socket.disconnect();
      return;
    }

    socket.join(userId.toString());

    socket.on("joinChat", ({ targetUserId }) => {
      const roomId = getSecretRoomId(userId, targetUserId);
      socket.join(roomId);
    });

    socket.on("sendMessage", async ({ firstName, targetUserId, text }) => {
      try {
        const isConnected = await ConnectionRequestModel.findOne({
          $or: [
            { fromUserId: userId, toUserId: targetUserId, status: "accepted" },
            { fromUserId: targetUserId, toUserId: userId, status: "accepted" },
          ],
        });

        if (!isConnected) {
          socket.emit("errorMessage", "You are not connected with this user.");
          return;
        }

        if (containsProfanity(text)) {
          socket.emit("errorMessage", "Your message contains inappropriate language and wasn't sent.");
          return;
        }

        const roomId = getSecretRoomId(userId, targetUserId);

        let chat = await Chat.findOne({
          participants: { $all: [userId, targetUserId] },
        });

        if (!chat) {
          chat = new Chat({ participants: [userId, targetUserId], messages: [] });
        }

        chat.messages.push({ senderId: userId, text });
        await chat.save();

        io.to(roomId).emit("messageReceived", { firstName, text, senderId: userId });

        io.to(targetUserId.toString()).emit("newMessageNotification", {
          fromUserId: userId.toString(),
        });
      } catch (err) {
        console.error("Error sending message:", err);
      }
    });

    socket.on("disconnect", () => {});
  });
};

const getIO = () => ioInstance; 

module.exports = initializeSocket;
module.exports.getIO = getIO; 