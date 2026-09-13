const express = require("express");
const crypto = require("crypto");
const githubAuthRouter = express.Router();
const { userAuth } = require("../middlewares/auth");
const User = require("../models/user");
const {
  exchangeCodeForToken,
  fetchGithubProfile,
  fetchTopLanguages,
} = require("../utils/githubService");

// Step 1: redirect the logged-in user to GitHub's authorization screen
githubAuthRouter.get("/auth/github", userAuth, (req, res) => {
  const state = crypto.randomBytes(16).toString("hex");

  res.cookie("github_oauth_state", state, {
    httpOnly: true,
    maxAge: 5 * 60 * 1000, // 5 minutes — just long enough to complete the flow
  });

  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: process.env.GITHUB_CALLBACK_URL,
    scope: "read:user",
    state,
  });

  res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
});

// Step 2: GitHub redirects back here after the user approves access
githubAuthRouter.get("/auth/github/callback", userAuth, async (req, res) => {
  try {
    const { code, state } = req.query;
    const savedState = req.cookies.github_oauth_state;

    if (!state || state !== savedState) {
      return res.status(400).send("Invalid OAuth state — possible CSRF attempt.");
    }
    res.clearCookie("github_oauth_state");

    const accessToken = await exchangeCodeForToken(code);
    const profile = await fetchGithubProfile(accessToken);
    const topLanguages = await fetchTopLanguages(accessToken, profile.login);

    await User.findByIdAndUpdate(req.user._id, {
      github: {
        username: profile.login,
        profileUrl: profile.html_url,
        avatarUrl: profile.avatar_url,
        publicRepos: profile.public_repos,
        topLanguages,
        connectedAt: new Date(),
      },
      isGithubVerified: true,
    });

    res.redirect(`${process.env.CLIENT_URL}/profile?github=connected`);
  } catch (err) {
    console.error("GitHub OAuth callback failed:", err);
    res.redirect(`${process.env.CLIENT_URL}/profile?github=error`);
  }
});

module.exports = githubAuthRouter;