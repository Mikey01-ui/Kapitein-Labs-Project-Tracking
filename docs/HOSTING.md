# Hosting guide

Production path: **Vercel** for the web app and API, **Supabase** for Postgres and file storage.

Target URL: `https://www.proj.kapiteinlabs.com`

Docker Compose remains available for local-only use.

## 1. Create the Supabase project

1. Sign up at [supabase.com](https://supabase.com) and create a project (region e.g. `eu-central-1`).
2. **Settings → Database → Connection string**
   - **Session pooler / Transaction pooler** (port `6543`) → `DATABASE_URL`. Append `?pgbouncer=true` if it is not already there.
   - **Direct connection** (port `5432`) → `DIRECT_URL`. Used only for `prisma migrate`.
   - If `db.<project>.supabase.co:5432` is unreachable (IPv6), use the **Session pooler** on port `5432` as `DIRECT_URL` instead. Do **not** add `pgbouncer=true` to that URI.
3. **Settings → API**
   - Project URL → `SUPABASE_URL`
   - Secret / `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server only, never a `VITE_` variable). The newer `sb_secret_...` key works here.
4. **Storage → New bucket**
   - Name: `uploads`
   - Public: **off** (private). The API creates long-lived signed URLs.

## 2. Apply the database schema (once, from your laptop)

```bash
cp server/.env.example server/.env
```

Set `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`, then:

```bash
npm install
npm run db:deploy
npm run db:seed
```

Log in later with `ADMIN_EMAIL` / `ADMIN_PASSWORD`, then change that password. The seed does **not** wipe data unless `SEED_RESET=true`.

## 3. Deploy on Vercel

1. Import GitHub repo `Mikey01-ui/Kapitein-Labs-Project-Tracking`.
2. Root directory: repository root. Framework: Other (this repo sets `vercel.json`).
3. Project environment variables:

| Name | Value |
| --- | --- |
| `DATABASE_URL` | Supabase pooled URI (`6543`, `pgbouncer=true`) |
| `DIRECT_URL` | Supabase direct URI (`5432`) |
| `JWT_SECRET` | Long random string |
| `CLIENT_ORIGIN` | `https://www.proj.kapiteinlabs.com,https://proj.kapiteinlabs.com` plus the `*.vercel.app` URL until DNS is live |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key |
| `SUPABASE_STORAGE_BUCKET` | `uploads` |
| Optional | `ANTHROPIC_API_KEY`, SMTP / Resend |

`*.vercel.app` preview URLs are allowed by CORS automatically.

4. Deploy. Health check: `https://<project>.vercel.app/api/health` should return `{ "ok": true }`.

Uploads go through `POST /api/upload` as base64 JSON. Vercel caps that body at about **4.5 MB**.

## 4. Custom domain

When DNS for `kapiteinlabs.com` is ready:

1. Vercel → Project → Domains → add `www.proj.kapiteinlabs.com`.
2. Optionally add `proj.kapiteinlabs.com` and redirect it to `www`.
3. At the DNS host, create the CNAME Vercel shows (usually `cname.vercel-dns.com`).
4. Set `CLIENT_ORIGIN` to the HTTPS origins and redeploy.

## Local Docker (optional)

```bash
cp .env.example .env
docker compose up --build -d
```

Opens at `http://localhost:8080`. This uses a local Postgres container, not Supabase, unless you point `DATABASE_URL` / `DIRECT_URL` at Supabase and set the Storage keys.

## Updates

Push to `main`. Vercel rebuilds automatically. Schema changes: add a Prisma migration, run `npm run db:deploy` against Supabase, then deploy.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Prisma connection errors / `prepared statement` | Using the direct `5432` URI as `DATABASE_URL` instead of the pooled `6543` URI |
| Login fails after first seed | Users already exist, or `ADMIN_*` does not match |
| CORS error | Add the exact origin (scheme + host) to `CLIENT_ORIGIN` |
| Uploads 413 / fail | File larger than ~4.5 MB, or Storage bucket `uploads` missing |
| Empty site on a deep URL | SPA rewrite missing — `vercel.json` must rewrite non-`/api` routes to `index.html` |
