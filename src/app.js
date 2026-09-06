require('dotenv').config();

const express = require('express');
const connectDB = require('./config/database');
const app = express();
const port = process.env.PORT || 7777;
const cookieParser = require('cookie-parser');
const cors = require('cors');

app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

const authRouter = require('./routes/auth');
const requestRouter = require('./routes/request');
const profileRouter = require('./routes/profile');
const userRouter = require('./routes/user');

app.use("/", authRouter);
app.use("/", requestRouter);
app.use("/", profileRouter);
app.use("/", userRouter);

connectDB().then(() => {
    console.log("MongoDB connected successfully!!");
    app.listen(port, () => {
        console.log(`Example app listening on port ${port}`)
    })
}).catch((err) => {
    console.log("Error while connecting to MongoDB!!");
    console.log(err);
});