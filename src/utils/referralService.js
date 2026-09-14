const crypto = require("crypto");

const generateReferralCode = () => {
  return crypto.randomBytes(4).toString("hex").toUpperCase(); // e.g. "A1B2C3D4"
};

module.exports = { generateReferralCode };