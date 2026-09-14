const BANNED_WORDS = ["idiot", "stupid", "shutup", "dumb"];

const containsProfanity = (text) => {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return BANNED_WORDS.some((word) => lowerText.includes(word));
};

module.exports = { containsProfanity };