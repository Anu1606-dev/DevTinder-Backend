const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

const exchangeCodeForToken = async (code) => {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error_description || "Failed to exchange GitHub code for token");
  }
  return data.access_token;
};

const fetchGithubProfile = async (accessToken) => {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `token ${accessToken}`,
      Accept: "application/vnd.github+json",
    },
  });
  if (!response.ok) throw new Error("Failed to fetch GitHub profile");
  return response.json();
};

const fetchTopLanguages = async (accessToken, username) => {
  const response = await fetch(
    `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`,
    {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: "application/vnd.github+json",
      },
    }
  );
  if (!response.ok) return [];

  const repos = await response.json();
  const languageCounts = {};

  repos.forEach((repo) => {
    if (repo.language) {
      languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
    }
  });

  return Object.entries(languageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([language]) => language);
};

module.exports = { exchangeCodeForToken, fetchGithubProfile, fetchTopLanguages };