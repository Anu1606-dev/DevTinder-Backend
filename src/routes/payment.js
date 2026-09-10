const express = require("express");
const crypto = require("crypto");
const paymentRouter = express.Router();
const { userAuth } = require("../middlewares/auth");
const { razorpayInstance } = require("../utils/razorpayClient");
const Payment = require("../models/payment");

// STEP 6: Create a Razorpay order when user clicks "Buy Premium"
paymentRouter.post("/payment/create", userAuth, async (req, res) => {
  try {
    const { amount } = req.body;

    const order = await razorpayInstance.orders.create({
      amount: amount * 100, // Razorpay needs paise, not rupees
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

// STEP 8: Verify the payment signature after checkout popup closes
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

    res.json({ success: true, message: "Payment verified!" });
  } catch (err) {
    console.error("Payment verification failed:", err);
    res.status(500).send("Error verifying payment");
  }
});

// STEP 9: Webhook - Razorpay's server calls this independently to confirm payment
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
      await Payment.findOneAndUpdate(
        { orderId: payment.order_id },
        { paymentId: payment.id, status: "paid" }
      );
    }

    res.status(200).send();
  } catch (err) {
    console.error("Webhook processing failed:", err);
    res.status(500).send();
  }
});

module.exports = paymentRouter;