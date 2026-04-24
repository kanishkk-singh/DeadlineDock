# ⚓ DeadlineDock — Full-Stack Edition

A production-ready, full-stack task & deadline management app for students.
Built with **Node.js + Express** backend, **JWT authentication**, **JSON file database**, and the exact same gorgeous UI/UX as the original HTML prototype.

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start
# → http://localhost:3000
```

That's it. Open `http://localhost:3000` in your browser.

---

## 🏗️ Project Structure

```
DeadlineDock/
├── server/
│   ├── index.js                  # Express app entry point
│   ├── config/
│   │   └── database.js           # JSON file DB (no native deps)
│   ├── controllers/
│   │   ├── authController.js     # Register, login, /me
│   │   ├── tasksController.js    # Full CRUD + AI suggest
│   │   └── statsController.js    # Points, badges, analytics
│   ├── middleware/
│   │   └── auth.js               # JWT verification middleware
│   └── routes/
│       ├── auth.js               # POST /api/auth/register, /login, GET /me
│       ├── tasks.js              # GET/POST/PATCH/DELETE /api/tasks
│       └── stats.js              # GET/POST/PATCH /api/stats
├── client/
│   └── index.html                # Complete SPA — exact same UI as prototype
├── data/
│   └── db.json                   # Auto-created on first run (gitignore this)
├── .env                          # Environment variables
└── package.json
```

---

## 🔌 REST API Reference

### Auth
| Method | Endpoint              | Body                        | Auth |
|--------|-----------------------|-----------------------------|------|
| POST   | /api/auth/register    | `{name, email, password}`   | ✗    |
| POST   | /api/auth/login       | `{email, password}`         | ✗    |
| GET    | /api/auth/me          | —                           | ✓    |

### Tasks
| Method | Endpoint              | Body / Query                | Auth |
|--------|-----------------------|-----------------------------|------|
| GET    | /api/tasks            | —                           | ✓    |
| POST   | /api/tasks            | `{name, dueDate, subject?, priority?, enableReminder?}` | ✓ |
| PATCH  | /api/tasks/:id        | `{name?, priority?, status?, dueDate?}` | ✓ |
| DELETE | /api/tasks/:id        | —                           | ✓    |
| POST   | /api/tasks/reorder    | `{orderedIds: [...]}`       | ✓    |
| GET    | /api/tasks/ai-suggest | `?dueDate=YYYY-MM-DD`       | ✓    |

### Stats
| Method | Endpoint              | Body                        | Auth |
|--------|-----------------------|-----------------------------|------|
| GET    | /api/stats            | —                           | ✓    |
| POST   | /api/stats/award      | `{points, reason}`          | ✓    |
| PATCH  | /api/stats            | `{notifDismissed?}`         | ✓    |
| GET    | /api/stats/analytics  | —                           | ✓    |

---

## ✨ Features

| Feature | Details |
|---------|---------|
| 🔐 Auth | JWT tokens (7-day expiry), bcrypt password hashing (cost 12) |
| 🤖 AI Priority | Server-side engine: `<6h → High`, `<72h → Medium`, `else → Low` |
| 🔔 Notifications | Browser Notification API — 24h & 1h before deadline |
| 🎯 Focus Mode | Full Pomodoro: 25min work + 5min break × 4 sessions |
| 🎮 Gamification | +10 pts task done, +20 pts on-time, 6 badge types, level system |
| 📊 Analytics | Chart.js line + doughnut charts, server-computed week data |
| 📅 Calendar | FullCalendar.js, color-coded by priority, event click details |
| ↕️ Drag & Drop | Reorder persisted to server via POST /api/tasks/reorder |
| 🛡️ Security | helmet, cors, rate-limiting (200 req/15min, 20 auth/15min) |
| ⚡ Performance | compression middleware, static file serving |

---

## 🔧 Environment Variables (.env)

```env
PORT=3000
JWT_SECRET=your_super_secret_key_here
CLIENT_ORIGIN=*
NODE_ENV=development
```

**Important:** Change `JWT_SECRET` to a long random string in production!

---

## 📦 Tech Stack

**Backend:** Node.js, Express 4, bcryptjs, jsonwebtoken, helmet, cors, compression, express-rate-limit  
**Database:** JSON file (data/db.json) — no native dependencies, works everywhere  
**Frontend:** Vanilla JS ES6+, Chart.js 4, FullCalendar 6, custom cursor, particle canvas  
**Auth:** JWT Bearer tokens stored in localStorage  

---

## 🔄 Upgrading to PostgreSQL

The `server/config/database.js` file exposes a clean ORM-like interface.
To switch to PostgreSQL, replace the implementation in `database.js` — all controllers will work unchanged.

```js
// Just replace the body of database.js with pg/knex queries
// The interface (db.tasks.create, db.users.findByEmail, etc.) stays the same
```

---

## 📁 Data Storage

All data is stored in `data/db.json`. Structure:
```json
{
  "users": [{ "id", "name", "email", "password" (hashed), "avatar", "createdAt" }],
  "tasks": [{ "id", "userId", "name", "subject", "dueDate", "priority", "status", "position", ... }],
  "stats": [{ "userId", "points", "level", "badges", "notifDismissed" }]
}
```

Add `data/` to your `.gitignore` to avoid committing user data.
