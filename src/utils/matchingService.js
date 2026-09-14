// Calculates a 0-100 "match score" based on how much two skill lists overlap.
// This is Jaccard similarity: (shared skills) / (total unique skills between both people).
const calculateSkillMatch = (skillsA = [], skillsB = []) => {
  const setA = new Set(skillsA.map((s) => s.toLowerCase().trim()));
  const setB = new Set(skillsB.map((s) => s.toLowerCase().trim()));

  if (setA.size === 0 || setB.size === 0) return 0;

  const sharedSkills = [...setA].filter((skill) => setB.has(skill));
  const allSkills = new Set([...setA, ...setB]);

  return Math.round((sharedSkills.length / allSkills.size) * 100);
};

const getSharedSkills = (skillsA = [], skillsB = []) => {
  const setA = new Set(skillsA.map((s) => s.toLowerCase().trim()));
  const setB = new Set(skillsB.map((s) => s.toLowerCase().trim()));
  return [...setA].filter((skill) => setB.has(skill));
};

// Template-based icebreaker — fully deterministic, no external API
const generateIcebreaker = (userA, userB) => {
  const shared = getSharedSkills(userA.skills, userB.skills);

  const templates = shared.length > 0
    ? [
        `Hey ${userB.firstName}! Noticed we both work with ${shared[0]} — what have you been building with it lately?`,
        `Hi ${userB.firstName}! Fellow ${shared[0]} developer here 👋 Would love to hear what you're working on.`,
        `Hey! Saw you're into ${shared[0]} too — always good to connect with someone on the same stack.`,
      ]
    : [
        `Hey ${userB.firstName}! Your profile caught my eye — what are you currently working on?`,
        `Hi ${userB.firstName}! Would love to hear more about what you're building.`,
      ];

  return templates[Math.floor(Math.random() * templates.length)];
};

module.exports = { calculateSkillMatch, getSharedSkills, generateIcebreaker };