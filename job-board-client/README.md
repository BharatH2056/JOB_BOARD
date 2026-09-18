# Job Board Client

React + Vite frontend for the Job Board platform.

## Setup

```bash
cd job-board-client
npm install
cp .env.example .env   # edit if backend runs on a different port
npm run dev
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:5000/api` | Base URL of the job-board-server API |

## Requirements

- Node 18+
- job-board-server must be running on port 5000 (or configure `VITE_API_BASE_URL`)

## Routes

| Path | Access | Description |
|---|---|---|
| `/` | Public | Landing page |
| `/login` | Public | Login |
| `/register` | Public | Register |
| `/verify-email` | Public | Email verification |
| `/jobs` | Public | Browse jobs (split-view) |
| `/jobs/:id` | Public | Single job detail |
| `/seeker/saved-jobs` | Seeker | Bookmarked jobs |
| `/seeker/applications` | Seeker | My applications |
| `/seeker/profile` | Seeker | Edit profile |
| `/employer/dashboard` | Employer | Metrics overview |
| `/employer/jobs` | Employer | Manage job listings |
| `/employer/jobs/new` | Employer | Post new job |
| `/employer/jobs/:id/edit` | Employer | Edit job |
| `/employer/jobs/:id/applications` | Employer | View applicants |
| `/admin` | Admin | Admin dashboard (jobs + users) |
