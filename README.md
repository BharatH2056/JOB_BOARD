# JobPulse

**AI-Powered Job Board with Semantic Vector Matching**

JobPulse is a full-stack job board platform that connects job seekers with employers using AI-driven semantic search and skill-gap analysis — instead of relying purely on keyword matching.

---

## Features

- **AI Semantic Search** — Natural language job search powered by vector embeddings (Google Gemini) and MongoDB Atlas Vector Search, so a search for "frontend developer" also surfaces relevant "React Engineer" listings.
- **Skill-Gap Analysis** — Compares a candidate's profile skills against a job's required skills and shows exactly what's missing, in real time.
- **Role-Based Dashboards** — Separate tailored experiences for Job Seekers, Employers, and Admins.
- **Secure, Verified Auth** — JWT-based authentication with mandatory email verification.
- **Resume Upload & One-Click Apply** — Upload a PDF resume once, apply to jobs instantly.
- **Saved Jobs & Application Tracking** — Bookmark jobs and track application status.
- **Dark / Light / System Theme** — Full theming support across the entire app.
- **Standard Browse + Pagination** — Traditional filterable job search (role, location, type, level) alongside AI search.

---

## Tech Stack

**Frontend:** React, Vite, React Query, React Router, JWT auth, CSS custom properties for theming

**Backend:** Node.js, Express, MongoDB Atlas + Mongoose, MongoDB Atlas Vector Search, Google Gemini API (embeddings), JWT, Nodemailer, Multer (file uploads)

---

## Project Structure

```
JOB_BOARD/
├── job-board-client/     # React frontend
│   └── src/
│       ├── api/          # API call functions
│       ├── components/   # Reusable UI + feature components
│       ├── context/      # Auth, Theme, Toast providers
│       ├── hooks/        # React Query hooks
│       ├── pages/        # Route-level pages (seeker/employer/admin)
│       └── styles/       # Theme & global CSS
│
└── job-board-server/     # Express backend
    ├── config/           # DB connection, vector search index config
    ├── middleware/       # Auth, upload, rate limiting, error handling
    ├── models/           # Mongoose schemas
    ├── routes/           # API route definitions
    ├── services/         # Business logic (auth, jobs, embeddings, etc.)
    ├── scripts/          # One-off scripts (seeding, embedding regen)
    └── test/             # Test suite
```
