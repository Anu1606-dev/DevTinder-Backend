const premiumAuth = (req, res, next) => {
  const isActive = req.user.isPremium && req.user.premiumExpiresAt && new Date(req.user.premiumExpiresAt) > new Date();

  if (!isActive) {
    return res.status(403).json({ message: "This feature requires an active Premium membership." });
  }
  next();
};

module.exports = { premiumAuth };