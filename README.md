# Kapitein Labs — Project Tracking Platform

Internal web app for Kapitein Labs to track projects, teams, hours, milestones, TRL (1–9), Kanban boards, expenses, and admin/user access.

This repository is set up so a host can run the full stack with Docker.

## Architecture

```
Browser
   │
   ▼
nginx (web)  :8080
   ├─ static React app
   ├─ /api/*      → Express API
   └─ /uploads/*  → Express API
          │
          ▼
     Node API :4000
          │
          ▼
     PostgreSQL 15
```

| Path | What it is |
| --- | --- |
| `client/` | React + Vite + Tailwind frontend |
| `server/` | Express API, Prisma, PostgreSQL |
| `deploy/` | Dockerfiles and nginx config |
| `docs/` | Product decisions and planning docs |
| `docker-compose.yml` | Production-style local/hosting stack |

## Quick start (hosting)

1. Copy environment variables:

```bash
cp .env.example .env
```

2. Change these values in `.env` before going live:

- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `ADMIN_EMAIL` / `ADMIN_PASSWORD`
- `CLIENT_ORIGIN` (the public URL, e.g. `https://tracker.example.com`)

3. Start:

```bash
docker compose up --build -d
```

4. Open `http://localhost:8080` and log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

Change the admin password after first login. Then set `RUN_SEED=false` so later restarts do not try to reseed.

Full hosting notes: [docs/HOSTING.md](docs/HOSTING.md)

## Local development

Needs Node.js 20+ and PostgreSQL 15.

```bash
cp server/.env.example server/.env
# edit DATABASE_URL, JWT_SECRET, ADMIN_* 

npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

- App: http://localhost:5173
- API: http://localhost:4000/api/health

## Roles

- **Employee** — sees only assigned projects; can log hours and expenses
- **Manager** — manages assigned projects, hours, milestones, and TRL
- **Admin** — full access, user approval, settings

Hour logs do not require manager approval.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Client + API in watch mode |
| `npm run build` | Production build of API and client |
| `npm run db:migrate` | Create/apply a development migration |
| `npm run db:deploy` | Apply migrations (production) |
| `npm run db:seed` | Create the initial admin if the DB is empty |
