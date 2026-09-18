# JOB\_BOARD



```markdown

\# JobPulse



\*\*AI-Powered Job Board with Semantic Vector Matching\*\*



JobPulse is a full-stack job board platform that connects job seekers with employers using AI-driven semantic search and skill-gap analysis — instead of relying purely on keyword matching. Built as part of Smart India Hackathon 2026 by Team \*\*404 The Optimists\*\*.



\---



\## Features



\- \*\*AI Semantic Search\*\* — Natural language job search powered by vector embeddings (Google Gemini) and MongoDB Atlas Vector Search, so a search for "frontend developer" also surfaces relevant "React Engineer" listings.

\- \*\*Skill-Gap Analysis\*\* — Compares a candidate's profile skills against a job's required skills and shows exactly what's missing, in real time.

\- \*\*Role-Based Dashboards\*\* — Separate tailored experiences for Job Seekers, Employers, and Admins.

\- \*\*Secure, Verified Auth\*\* — JWT-based authentication with mandatory email verification (real emails sent via Gmail SMTP).

\- \*\*Resume Upload \& One-Click Apply\*\* — Upload a PDF resume once, apply to jobs instantly.

\- \*\*Saved Jobs \& Application Tracking\*\* — Bookmark jobs and track application status.

\- \*\*Dark / Light / System Theme\*\* — Full theming support across the entire app.

\- \*\*Standard Browse + Pagination\*\* — Traditional filterable job search (role, location, type, level) alongside AI search.



\---



\## Tech Stack



\*\*Frontend:\*\* React, Vite, React Query, React Router, JWT auth, CSS custom properties for theming



\*\*Backend:\*\* Node.js, Express, MongoDB Atlas + Mongoose, MongoDB Atlas Vector Search, Google Gemini API (embeddings), JWT, Nodemailer (Gmail SMTP), Multer (file uploads)



\---



\## Project Structure



```

JOB\_BOARD/

├── job-board-client/     # React frontend

│   └── src/

│       ├── api/          # API call functions

│       ├── components/   # Reusable UI + feature components

│       ├── context/      # Auth, Theme, Toast providers

│       ├── hooks/        # React Query hooks

│       ├── pages/        # Route-level pages (seeker/employer/admin)

│       └── styles/       # Theme \& global CSS

│

└── job-board-server/     # Express backend

&#x20;   ├── config/           # DB connection, vector search index config

&#x20;   ├── middleware/       # Auth, upload, rate limiting, error handling

&#x20;   ├── models/           # Mongoose schemas

&#x20;   ├── routes/           # API route definitions

&#x20;   ├── services/         # Business logic (auth, jobs, embeddings, etc.)

&#x20;   ├── scripts/          # One-off scripts (seeding, embedding regen)

&#x20;   └── test/             # Test suite

```



\---



\## Getting Started



\*\*Prerequisites:\*\* Node.js v18+, a MongoDB Atlas cluster with Vector Search enabled, a Google Gemini API key, a Gmail account with an \[App Password](https://myaccount.google.com/apppasswords)



\### 1. Clone the repo

```bash

git clone https://github.com/BharatH2056/JOB\_BOARD.git

cd JOB\_BOARD

```



\### 2. Backend setup

```bash

cd job-board-server

npm install

cp .env.example .env

```

Fill in `.env`:

```

MONGODB\_URI=your\_mongodb\_atlas\_connection\_string

JWT\_SECRET=your\_jwt\_secret

PORT=5000

CLIENT\_URL=http://localhost:5173

EMAIL\_USER=your\_gmail\_address@gmail.com

EMAIL\_APP\_PASSWORD=your\_16\_character\_app\_password

GEMINI\_API\_KEY=your\_gemini\_api\_key

```

Start it:

```bash

npm run dev

```



\### 3. Frontend setup

```bash

cd ../job-board-client

npm install

cp .env.example .env

```

Confirm `.env`:

```

VITE\_API\_BASE\_URL=http://localhost:5000/api

```

Start it:

```bash

npm run dev

```

App runs at `http://localhost:5173`.



\### 4. (Optional) Seed fake job data

```bash

cd job-board-server

npm run seed:jobs

```



\---



\## Running Tests

```bash

cd job-board-server

npm test

```



\---



\## Team



\*\*404 The Optimists\*\* — Smart India Hackathon 2026



\---



\## License



This project was built for educational/hackathon purposes.

```

