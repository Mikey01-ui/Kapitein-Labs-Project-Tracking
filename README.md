# Kapitein Labs — Project Tracking Platform

Internal web app for Kapitein Labs to track projects, teams, hours, milestones, TRL (1–9), Kanban boards, expenses, and admin/user access.

Production host: **Vercel** (frontend + API) with **Supabase** (Postgres + file storage).  
Public URL: [https://www.proj.kapiteinlabs.com](https://www.proj.kapiteinlabs.com)

## Architecture

```
Browser
   │
   ▼
Vercel  (www.proj.kapiteinlabs.com)
   ├─ static React app
   └─ /api/*  → Express (serverless)
          │
          ├─ Prisma (pooled) → Supabase Postgres
          └─ uploads bucket  → Supabase Storage
```

| Path | What it is |
| --- | --- |
| `client/` | React + Vite + Tailwind frontend |
| `server/` | Express API, Prisma, JWT auth |
| `api/` | Vercel serverless entry that exports the Express app |
| `docs/` | Hosting guide and planning docs |
| `docker-compose.yml` | Optional local stack (Postgres + API + nginx) |

## Production (Vercel + Supabase)

1. Create a Supabase project (EU region recommended). Copy the **pooled** DB URI (port 6543), **direct** DB URI (port 5432), project URL, and **service role** key.
2. Create a private Storage bucket named `uploads`.
3. From this repo, apply schema and create the first admin (once):

```bash
cp server/.env.example server/.env
# set DATABASE_URL, DIRECT_URL, JWT_SECRET, ADMIN_*
npm install
npm run db:deploy
npm run db:seed
```

4. Import `Mikey01-ui/Kapitein-Labs-Project-Tracking` into Vercel. Set the env vars listed in [docs/HOSTING.md](docs/HOSTING.md).
5. Add the custom domain `www.proj.kapiteinlabs.com` when DNS is ready.

Full steps: [docs/HOSTING.md](docs/HOSTING.md)

## Local development

Needs Node.js 20+. Use local Postgres **or** point `DATABASE_URL` at Supabase.

```bash
cp server/.env.example server/.env
# edit DATABASE_URL, DIRECT_URL, JWT_SECRET, ADMIN_*

npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

- App: http://localhost:5173
- API: http://localhost:4000/api/health

Without `SUPABASE_URL`, uploads are stored in `server/uploads/`. With it, they go to the `uploads` bucket.

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
| `npm run db:deploy` | Apply migrations (Supabase / production) |
| `npm run db:seed` | Create the initial admin if the DB is empty |
