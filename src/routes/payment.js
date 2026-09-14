const express = require("express");
const crypto = require("crypto");
const paymentRouter = express.Router();
const { userAuth } = require("../middlewares/auth");
const { razorpayInstance } = require("../utils/razorpayClient");
const Payment = require("../models/payment");
const User = require("../models/user"); // ← ADDED

const PREMIUM_DURATION_DAYS = 30; // ← ADDED

paymentRouter.post("/payment/create", userAuth, async (req, res) => {
  try {
    const { amount } = req.body;

    const order = await razorpayInstance.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: "receipt_" + Date.now(),
      notes: { userId: req.user._id.toString() },
    });

    await Payment.create({
      userId: req.user._id,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      status: "created",
    });

    res.json({ order });
  } catch (err) {
    console.error("Razorpay order creation failed:", err);
    res.status(500).send("Error creating order");
  }
});

paymentRouter.post("/payment/verify", userAuth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    await Payment.findOneAndUpdate(
      { orderId: razorpay_order_id },
      { paymentId: razorpay_payment_id, status: "paid" }
    );

    // ← ADDED: actually grant premium status
    const premiumExpiresAt = new Date();
    premiumExpiresAt.setDate(premiumExpiresAt.getDate() + PREMIUM_DURATION_DAYS);

    await User.findByIdAndUpdate(req.user._id, {
      isPremium: true,
      premiumExpiresAt,
    });

    res.json({ success: true, message: "Payment verified!", premiumExpiresAt });
  } catch (err) {
    console.error("Payment verification failed:", err);
    res.status(500).send("Error verifying payment");
  }
});

paymentRouter.post("/payment/webhook", async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(req.rawBody)
      .digest("hex");

    if (generatedSignature !== signature) {
      return res.status(400).send("Invalid webhook signature");
    }

    const event = req.body.event;
    console.log("Webhook received:", event);

    if (event === "payment.captured") {
      const payment = req.body.payload.payment.entity;

      const updatedPayment = await Payment.findOneAndUpdate(
        { orderId: payment.order_id },
        { paymentId: payment.id, status: "paid" }
      );

      if (updatedPayment) {
        const premiumExpiresAt = new Date();
        premiumExpiresAt.setDate(premiumExpiresAt.getDate() + PREMIUM_DURATION_DAYS);

        await User.findByIdAndUpdate(updatedPayment.userId, {
          isPremium: true,
          premiumExpiresAt,
        });
      }
    }

    res.status(200).send();
  } catch (err) {
    console.error("Webhook processing failed:", err);
    res.status(500).send();
  }
});

module.exports = paymentRouter;