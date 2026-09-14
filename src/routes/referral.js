const express = require("express");
const referralRouter = express.Router();
const { userAuth } = require("../middlewares/auth");
const User = require("../models/user");
const { generateReferralCode } = require("../utils/referralService");

const REFERRAL_BONUS_DAYS = 7;

// Get (or lazily create) the logged-in user's own referral link
referralRouter.get("/referral/my-link", userAuth, async (req, res) => {
  try {
    let user = req.user;

    if (!user.referralCode) {
      let code;
      let isUnique = false;
      while (!isUnique) {
        code = generateReferralCode();
        const existing = await User.findOne({ referralCode: code });
        if (!existing) isUnique = true;
      }
      user = await User.findByIdAndUpdate(user._id, { referralCode: code }, { new: true });
    }

    const referralLink = `${process.env.CLIENT_URL}/signup?ref=${user.referralCode}`;

    res.json({
      referralCode: user.referralCode,
      referralLink,
      referralCount: user.referralCount,
    });
  } catch (err) {
    console.error("Failed to get referral link:", err);
    res.status(500).send("Failed to get referral link");
  }
});

// Called once, right after a brand-new user's first login, if they signed up via a referral link
referralRouter.post("/referral/apply", userAuth, async (req, res) => {
  try {
    const { code } = req.body;
    const currentUser = req.user;

    if (!code) {
      return res.status(400).json({ message: "No referral code provided." });
    }
    if (currentUser.referredBy || currentUser.hasReceivedReferralBonus) {
      return res.status(400).json({ message: "Referral already applied to this account." });
    }

    const referrer = await User.findOne({ referralCode: code.toUpperCase() });
    if (!referrer) {
      return res.status(404).json({ message: "Invalid referral code." });
    }
    if (referrer._id.toString() === currentUser._id.toString()) {
      return res.status(400).json({ message: "You cannot refer yourself." });
    }

    const bonusExpiry = new Date();
    bonusExpiry.setDate(bonusExpiry.getDate() + REFERRAL_BONUS_DAYS);

    await User.findByIdAndUpdate(currentUser._id, {
      referredBy: referrer._id,
      hasReceivedReferralBonus: true,
      isPremium: true,
      premiumExpiresAt: bonusExpiry,
    });

    // Extend the referrer's existing premium if active, otherwise grant fresh
    const referrerNewExpiry =
      referrer.isPremium && referrer.premiumExpiresAt && new Date(referrer.premiumExpiresAt) > new Date()
        ? new Date(new Date(referrer.premiumExpiresAt).getTime() + REFERRAL_BONUS_DAYS * 24 * 60 * 60 * 1000)
        : bonusExpiry;

    await User.findByIdAndUpdate(referrer._id, {
      isPremium: true,
      premiumExpiresAt: referrerNewExpiry,
      $inc: { referralCount: 1 },
    });

    res.json({ message: `Referral applied! You both received ${REFERRAL_BONUS_DAYS} days of Premium.` });
  } catch (err) {
    console.error("Failed to apply referral:", err);
    res.status(500).send("Failed to apply referral");
  }
});

module.exports = referralRouter;