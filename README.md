# DevTinder — Backend

A production-deployed REST + real-time API powering **DevTinder**, a Tinder-style networking platform built for developers to discover, connect, and chat with each other based on real skills — with AI-flavored matching, payments, moderation, and growth mechanics layered on top of the base course project.

🔗 **Live App:** [http://3.26.26.82](http://3.26.26.82)
🔗 **Frontend Repo:** [DevTinder-Frontend](https://github.com/Anu1606-dev/DevTinder-Frontend)

---

## Screenshots

> Add screenshots below as you take them. Recommended shots for the backend README specifically (things that show *architecture and behavior*, not just UI):

- [ ] Terminal output showing a successful cron job run (the "Sending reminder emails to N users" log line)
- [ ] MongoDB Compass view of a `User` document showing the `github`, `isPremium`, and `referralCode` fields populated
- [ ] Postman/Thunder Client screenshot hitting `/user/feed` and showing the `matchScore` field in the JSON response
- [ ] Razorpay Dashboard screenshot showing a successful test webhook delivery
- [ ] A simple architecture diagram (Nginx → Express → MongoDB/Socket.io/Razorpay/GitHub OAuth) — even a hand-drawn one photographed works

```
![Cron job digest email running](./screenshots/cron-job-log.png)
![Feed API response with match scores](./screenshots/feed-match-score.png)
![Razorpay webhook delivery log](./screenshots/webhook-delivery.png)
```

---

## What This Is

Most "Tinder clone" tutorial projects stop at authentication and a swipe feed. This one goes considerably further — a fully deployed backend handling GitHub-verified developer identity, skill-based match scoring, real payments with webhook verification, live chat with content moderation, and referral-driven growth mechanics, all running on a self-managed AWS EC2 instance behind Nginx.

Built on top of the [Namaste Node.js](https://namastedev.com/) course architecture, then extended well beyond its curriculum with production-grade fixes, security hardening, and five additional features designed around real product and monetization thinking.

---

## Features

### Core Platform
- JWT-based authentication with HTTP-only cookies (signup, login, logout)
- Profile management (bio, skills, photo, age, gender)
- Developer discovery feed with connection request flow (interested / ignored)
- Connection request review (accept / reject)
- Connections & pending requests management

### Developer Identity Verification
- GitHub OAuth 2.0 integration with CSRF-protected state validation
- Pulls real public repo count and top languages directly from the GitHub API
- Verified badge surfaced across Feed, Requests, and Connections

### Skill-Based Matching & Icebreakers
- Jaccard similarity scoring between users' skill sets, computed live (no external AI API, no cost)
- Feed results ranked by match quality, not just recency
- Template-based icebreaker generation referencing genuinely shared skills

### Trust, Safety & Moderation
- User-to-user reporting system with categorized reasons
- Admin-only review dashboard (role-gated via a dedicated `adminAuth` middleware)
- Real-time chat message filtering against a banned-word list before messages are ever persisted

### Monetization
- Razorpay-powered Premium membership, now actually granting `isPremium` status on both client-side verification *and* webhook confirmation (the webhook is treated as the authoritative source of truth)
- "Boost" mechanic — temporarily surfaces a premium user's profile at the top of every feed
- Profile view analytics (7-day / 30-day / all-time), logged automatically as users appear in others' feeds

### Growth & Engagement
- Unique referral links; both parties receive 7 days of Premium when a referral is applied
- Real-time Socket.io notification to the referrer the moment their link is used
- Gamified connection-count badges (First Connection → DevTinder Legend), computed live

### Email & Automation
- Transactional email via **AWS SES** on new connection requests
- Daily cron digest (**node-cron**) summarizing the previous day's requests, now including a weekly growth line

### Real-Time Chat
- **Socket.io**-powered live messaging, authenticated at the handshake level via JWT (never trusting client-claimed identity)
- Server-side enforcement: messages only flow between users with an accepted connection
- Persistent history with per-user "last seen" tracking for accurate unread counts

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js, Express |
| Database | MongoDB, Mongoose |
| Auth | JWT, bcrypt, HTTP-only cookies, GitHub OAuth 2.0 |
| Real-time | Socket.io |
| Email | AWS SES (`@aws-sdk/client-ses`) |
| Payments | Razorpay |
| Scheduling | node-cron, date-fns |
| Deployment | AWS EC2, Nginx (reverse proxy), PM2 (process manager) |

---

## Architecture Notes

- Nginx routes `/api/*` to the Express server and `/socket.io/*` separately with WebSocket upgrade headers, while serving the built React frontend as static files at `/`.
- Razorpay webhooks are verified against the **raw, unparsed** request body, since signature validation fails silently on an already-JSON-parsed body.
- Socket connections are authenticated at the handshake level by decoding the JWT from the cookie header — client-sent user IDs are never trusted for identity, only for addressing which room to join.
- Skill matching uses Jaccard similarity computed in application code rather than a paid embeddings API — a deliberate cost/complexity trade-off appropriate at this project's scale, with a documented upgrade path to vector search noted in code comments.
- A shared `getIO()` accessor lets any route emit real-time events (e.g. referral notifications) without those routes needing direct access to the HTTP server or Socket.io setup.

---

## API Overview

| Method | Route | Description |
|---|---|---|
| POST | `/signup` | Register a new user |
| POST | `/login` | Authenticate and receive JWT cookie |
| POST | `/logout` | Clear auth cookie |
| GET | `/profile` | Get logged-in user's profile |
| PATCH | `/profile/edit` | Update profile fields |
| GET | `/user/feed` | Get discoverable, match-ranked user feed |
| GET | `/user/connections` | List accepted connections, with match scores |
| GET | `/user/requests/received` | List pending incoming requests, with match scores |
| GET | `/user/badges` | Get gamification badge progress |
| POST | `/request/send/:status/:toUserId` | Send a connection request (interested/ignored) |
| POST | `/request/review/:status/:requestId` | Accept/reject a received request |
| GET | `/auth/github` | Start GitHub OAuth flow |
| GET | `/auth/github/callback` | GitHub OAuth callback handler |
| GET | `/matching/icebreaker/:targetUserId` | Generate a skill-based icebreaker |
| POST | `/report/:targetUserId` | Report a user |
| GET | `/admin/reports` | (Admin only) List pending reports |
| PATCH | `/admin/reports/:reportId` | (Admin only) Update a report's status |
| POST | `/payment/create` | Create a Razorpay order |
| POST | `/payment/verify` | Verify payment signature, grant Premium |
| POST | `/payment/webhook` | Razorpay webhook receiver |
| POST | `/premium/boost` | (Premium only) Activate a 24-hour feed boost |
| GET | `/premium/analytics` | (Premium only) Get profile view stats |
| GET | `/referral/my-link` | Get/generate the user's referral link |
| POST | `/referral/apply` | Apply a referral code on signup |
| GET | `/chat/:targetUserId` | Fetch chat history with a user |
| GET | `/chats` | List all conversations with previews & unread counts |

---

## Getting Started Locally

```bash
git clone https://github.com/Anu1606-dev/DevTinder-Backend.git
cd DevTinder-Backend
npm install
```

Create a `.env` file (see `.env.example` for the full list — never commit real values):

```
PORT=7777
CLIENT_URL=http://localhost:5173
MONGO_URI=
JWT_SECRET=
AWS_ACCESS_KEY=
AWS_SECRET_KEY=
AWS_REGION=
SES_FROM_EMAIL=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=http://localhost:7777/auth/github/callback
```

Run the dev server:

```bash
npm run dev
```

---

## Roadmap

- [ ] Search by name/skill
- [ ] Vector-embedding-based semantic matching (upgrade path from current Jaccard similarity)
- [ ] Pagination for chat message history
- [ ] Presence indicators ("online now")

---

## Author

**Anushka Sarkar**
[GitHub](https://github.com/Anu1606-dev) · [LinkedIn](https://www.linkedin.com/in/anushka-sarkar-07b2502b9/) · [X/Twitter](https://x.com/Anu35473)