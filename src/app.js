require('dotenv').config();

const express = require('express');
const http = require('http'); // ← ADDED
const connectDB = require('./config/database');
const app = express();
const port = process.env.PORT || 7777;
const cookieParser = require('cookie-parser');
const cors = require('cors');
const initializeSocket = require('./utils/socket'); // ← ADDED

app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
}));
app.use(cookieParser());

app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));

const authRouter = require('./routes/auth');
const requestRouter = require('./routes/request');
const profileRouter = require('./routes/profile');
const userRouter = require('./routes/user');
const paymentRouter = require('./routes/payment');
const chatRouter = require('./routes/chat'); // ← ADDED

require('./utils/cronjob');

app.use("/", authRouter);
app.use("/", requestRouter);
app.use("/", profileRouter);
app.use("/", userRouter);
app.use("/", paymentRouter);
app.use("/", chatRouter); // ← ADDED

const server = http.createServer(app); // ← ADDED
initializeSocket(server); // ← ADDED

connectDB().then(() => {
    console.log("MongoDB connected successfully!!");
    server.listen(port, () => { // ← CHANGED from app.listen to server.listen
        console.log(`Example app listening on port ${port}`)
    })
}).catch((err) => {
    console.log("Error while connecting to MongoDB!!");
    console.log(err);
});