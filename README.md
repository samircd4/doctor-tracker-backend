# 🩺 Doctor Tracker — Backend API

The REST API behind **Doctor Tracker**, an admin portal for managing doctors, their patients, and clinic analytics.

| | |
|---|---|
| **Backend repo** | this repo (Express + MongoDB) |
| **Frontend repo** | [doctor-tracker-frontend](https://github.com/samircd4/doctor-tracker-frontend) (Next.js). Its README has the full project overview, architecture, technical decisions and screenshots. |
| **Demo login** | `admin@test.com` / `Admin@123` (created by `npm run seed`) |

## Description
A standalone **Node.js + Express 5** REST API on **MongoDB (Mongoose 9)**. It provides:
- cookie-based **JWT authentication**;
- **doctor** and **patient** endpoints with search, filters and pagination;
- a **dashboard statistics** endpoint built from aggregation pipelines.

Every request body is validated with **Zod**, every list query is backed by a MongoDB index, and all errors come back as one consistent JSON shape.

## Tech stack
Node.js · Express 5 · MongoDB · Mongoose 9 · Zod 4 · jsonwebtoken · bcryptjs · helmet · cookie-parser · cors

## Setup guide
**Prerequisites:** Node.js 20+ and MongoDB, for example:
```bash
docker run -d --name doctor-mongo -p 27017:27017 -v doctor-mongo-data:/data/db mongo:7
```

```bash
git clone https://github.com/samircd4/doctor-tracker-backend.git
cd doctor-tracker-backend
npm install
cp .env.example .env     # then set JWT_SECRET to a long random string
npm run seed             # admin user + 30 doctors + 500 patients (replaces existing doctors/patients)
npm run dev              # http://localhost:5000  (auto-restarts with nodemon)
```
Check it: `GET http://localhost:5000/api/health` should return `{"status":"ok","db":"up"}`.

Then start the [frontend](https://github.com/samircd4/doctor-tracker-frontend#2-setup-guide).

### Environment variables (`.env.example`)
| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `5000` | API port |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/doctor_tracker` | MongoDB connection string |
| `JWT_SECRET` | _(change it)_ | Secret used to sign login tokens |
| `CLIENT_URL` | `http://localhost:3000` | Frontend origin allowed by CORS |

### Scripts
| Command | What it does |
|---|---|
| `npm run dev` | Start with auto-restart (nodemon) |
| `npm start` | Start normally |
| `npm run seed` | Create the admin user and sample data, and sync indexes |

## Architecture
```
request → helmet → cors → JSON body → cookies → route
        → requireAuth (JWT cookie) → validate (Zod) → controller → Mongoose (lean / aggregate)
errors  → errorHandler → { "error": { "message", "details" } }
```
```
src/
├── config/db.js              # MongoDB connection
├── models/                   # User, Doctor, Patient (schemas + indexes)
├── middleware/               # auth (requireAuth), validate (Zod), errorHandler
├── validators/schemas.js     # all request body schemas
├── controllers/              # auth, doctor, patient, stats
├── routes/                   # one router per resource, mounted in routes/index.js
├── utils/listQuery.js        # pagination, date range, safe search, paginate()
├── app.js                    # Express app + middleware
└── server.js                 # connect DB, start server
scripts/seed.js               # sample data
```

## API reference
All routes except `/api/auth/login`, `/api/auth/logout` and `/api/health` require the login cookie.

**Response formats**
- **List:** `{ data: [...], meta: { page, limit, total, totalPages } }`
- **Single item:** `{ data: {...} }`
- **Error:** `{ error: { message, details: [{ field, message }] } }`

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/login` | `{ email, password }` → sets the httpOnly `token` cookie |
| POST | `/api/auth/logout` | Clears the cookie |
| GET | `/api/auth/me` | The logged-in user |
| GET | `/api/doctors` | Query: `q`, `specialization`, `hospital`, `from`, `to`, `page`, `limit`. Each doctor includes `patientCount`. |
| GET | `/api/doctors/options` | Doctor names, specializations and hospitals, for dropdowns |
| POST | `/api/doctors` | Create: `{ name, specialization, hospital, phone, email }` |
| GET | `/api/doctors/:id` | Doctor detail with `patientCount` |
| GET | `/api/doctors/:id/patients` | That doctor's patients. Query: `q`, `condition`, `from`, `to`, `page`, `limit` |
| POST | `/api/doctors/:id/patients` | Add a patient under this doctor |
| DELETE | `/api/doctors/:id/patients/:patientId` | Remove a patient from this doctor |
| GET | `/api/patients` | All patients. Query: `q`, `condition`, `doctor`, `gender`, `from`, `to`, `page`, `limit` |
| PUT | `/api/patients/:id` | Edit a patient (can move them to another doctor) |
| DELETE | `/api/patients/:id` | Delete a patient |
| GET | `/api/stats` | Dashboard: totals, new this month vs last month, average per doctor, top 10 doctors, admissions per month, condition breakdown |
| GET | `/api/health` | API and database status |

**Status codes**
- `400` validation error or invalid id
- `401` not logged in, or session expired
- `404` not found
- `409` duplicate email
- `500` unexpected error (no internal details are leaked)

## Query performance
One compound index per filter path, declared in the models:

| Collection | Index | Serves |
|---|---|---|
| doctors | `{ createdAt: -1 }` | default list, date filter |
| doctors | `{ specialization: 1, createdAt: -1 }` | specialization filter |
| doctors | `{ hospital: 1, createdAt: -1 }` | hospital filter |
| doctors / users | `{ email: 1 }` unique | duplicate check, login |
| patients | `{ doctor: 1, admittedAt: -1 }` | a doctor's patients, patient counts |
| patients | `{ condition: 1, admittedAt: -1 }` | condition filter |
| patients | `{ gender: 1, admittedAt: -1 }` | gender filter |
| patients | `{ admittedAt: -1 }` | default list, date filter, monthly stats |

`explain("executionStats")` shows each list query examining only the documents it returns (e.g. 10 → 10). The [frontend README](https://github.com/samircd4/doctor-tracker-frontend#decision-2-indexed-mongodb-queries-for-search-filters-and-pagination) explains the design and the numbers.

## Security
- Passwords are hashed with bcrypt.
- The JWT lives in an **httpOnly, SameSite=Lax** cookie (`Secure` in production) and is never visible to JavaScript.
- An invalid or expired token is cleared and answered with a 401.
- Every login failure gets the same message, so attackers can't tell which emails exist.
- `helmet` security headers, CORS limited to `CLIENT_URL`, and a 100 KB JSON body limit.
- Every request body is validated with Zod, and search input is escaped before it is used in a regex.
