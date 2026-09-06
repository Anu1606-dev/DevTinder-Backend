const express = require("express");
const authRouter = express.Router();
const { validateSignupData } = require('../utils/validate');
const User = require('../models/user');
const bcrypt = require('bcrypt');

authRouter.post("/signup", async (req, res) => {

    try {
        validateSignupData(req);

        const { firstName, lastName, emailId, password, age, gender, photoUrl } = req.body;

        const passwordHash = await bcrypt.hash(password, 10);

        const user = new User({
            firstName,
            lastName,
            email: emailId,
            password: passwordHash,
            age,
            gender,
            photoUrl,
        });

        await user.save();

        res.send("User created successfully!!");

    } catch (err) {
        console.log(err);
        if (err.code === 11000) {
            return res.status(400).send("An account with this email already exists!!");
        }
        res.status(400).send(err.message || "Error while creating user!!");
    }
});

authRouter.post("/login", async (req, res) => {
    try {
        const { emailId, password } = req.body;

        if (typeof emailId !== "string" || typeof password !== "string" || !emailId.trim() || !password) {
            return res.status(400).send("Email and password are required!!");
        }

        const user = await User.findOne({ email: emailId.trim().toLowerCase() });
        if (!user) {
            return res.status(401).send("Invalid credentials!!");
        }

        const isPasswordValid = await user.validatePassword(password);
        if (isPasswordValid) {
            const token = await user.getJWT();

            const isProduction = process.env.NODE_ENV === "production";
            res.cookie("token", token, {
                expires: new Date(Date.now() + 7 * 24 * 3600000),
                httpOnly: true,
                secure: isProduction,
                sameSite: isProduction ? "None" : "Lax",
            });

            res.send(user);
        } else {
            return res.status(401).send("Invalid credentials!!");
        }

    } catch (err) {
        console.log("Error while logging in user!!");
        console.log(err);
        res.status(500).send("Error while logging in user!!");
    }
});

authRouter.post("/logout", async (req, res) => {
    try {
        res.cookie("token", null, {
            expires: new Date(Date.now()),
        });
        res.end("User logged out successfully!!");

    } catch (err) {
        res.status(500).send("Error while logging out user!!")
    }
})

module.exports = authRouter;