# DevTinder — Backend

A production-deployed REST + real-time API powering **DevTinder**, a Tinder-style networking platform built specifically for developers to discover, connect, and chat with each other based on skills and interests.

🔗 **Live App:** [http://3.26.26.82](http://3.26.26.82)
🔗 **Frontend Repo:** [DevTinder-Frontend](https://github.com/Anu1606-dev/DevTinder-Frontend)

---

## What This Is

Most "Tinder clone" tutorial projects stop at authentication and a swipe feed. This one goes further — it's a fully deployed backend handling real user-to-user matching, transactional email, scheduled jobs, live payments, and real-time bidirectional communication, running on a self-managed AWS EC2 instance behind Nginx.

Built while extending the [Namaste Node.js](https://namastedev.com/) course architecture with production-grade fixes, security hardening, and features beyond the base curriculum.

---

## Features

### Core Platform
- JWT-based authentication with HTTP-only cookies (signup, login, logout)
- Profile management (bio, skills, photo, age, gender)
- Developer discovery feed with connection request flow (interested / ignored)
- Connection request review (accept / reject)
- Connections & pending requests management

### Email & Automation
- Transactional email notifications via **AWS SES** on new connection requests
- Daily scheduled job (**node-cron**) that emails users a digest of connection requests received in the last 24 hours

### Payments
- **Razorpay** integration for a Premium membership tier
- Server-side order creation and payment signature verification (HMAC-SHA256)
- Razorpay webhook handling with raw-body signature validation for asynchronous payment confirmation — independent of client-side callback reliability

### Real-Time Chat
- **Socket.io**-powered live messaging between connected users
- Authenticated socket handshake (JWT verified from cookie, not trusted from client payload)
- **Security enforcement:** users can only exchange messages if an accepted connection exists between them — validated server-side on every message, not just at the UI level
- Persistent chat history with per-user "last seen" tracking for accurate unread message counts

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js, Express |
| Database | MongoDB, Mongoose |
| Auth | JWT, bcrypt, HTTP-only cookies |
| Real-time | Socket.io |
| Email | AWS SES (`@aws-sdk/client-ses`) |
| Payments | Razorpay |
| Scheduling | node-cron, date-fns |
| Deployment | AWS EC2, Nginx (reverse proxy), PM2 (process manager) |

---

## Architecture Notes

- Nginx routes `/api/*` to the Express server and `/socket.io/*` separately with WebSocket upgrade headers, while serving the built React frontend as static files at `/`.
- Razorpay webhooks are verified against the **raw, unparsed** request body (captured via an Express `verify` hook), since signature validation fails silently if the body has already been JSON-parsed.
- Socket connections are authenticated at the handshake level by decoding the JWT from the cookie header — the server never trusts a `userId` sent from the client for identity, only for addressing which chat room to join.

---

## API Overview

| Method | Route | Description |
|---|---|---|
| POST | `/signup` | Register a new user |
| POST | `/login` | Authenticate and receive JWT cookie |
| POST | `/logout` | Clear auth cookie |
| GET | `/profile` | Get logged-in user's profile |
| PATCH | `/profile/edit` | Update profile fields |
| GET | `/feed` | Get discoverable user feed |
| POST | `/request/send/:status/:toUserId` | Send a connection request (interested/ignored) |
| POST | `/request/review/:status/:requestId` | Accept/reject a received request |
| GET | `/user/connections` | List accepted connections |
| GET | `/user/requests` | List pending incoming requests |
| POST | `/payment/create` | Create a Razorpay order |
| POST | `/payment/verify` | Verify payment signature |
| POST | `/payment/webhook` | Razorpay webhook receiver |
| GET | `/chat/:targetUserId` | Fetch chat history with a user |
| GET | `/chats` | List all conversations with previews & unread counts |

---

## Getting Started Locally

```bash
git clone https://github.com/Anu1606-dev/DevTinder-Backend.git
cd DevTinder-Backend
npm install
```

Create a `.env` file (see `.env.example` for the full list of required variables — never commit real values):

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
```

Run the dev server:

```bash
npm run dev
```

---

## Roadmap

Actively being extended beyond the base course curriculum:

- [ ] AI-powered skill-matching & auto-generated chat icebreakers
- [ ] GitHub OAuth-based developer identity verification
- [ ] Search by name/skill
- [ ] Report & moderation system
- [ ] Profile "Boost" and analytics for premium users
- [ ] Referral & engagement mechanics

---

## Author

**Anushka Sarkar**
[GitHub](https://github.com/Anu1606-dev) · [LinkedIn](https://www.linkedin.com/in/anushka-sarkar-07b2502b9/) · [X/Twitter](https://x.com/Anu35473)