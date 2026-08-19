# Hosting guide

Recommended path: **Docker Compose**. That gives you PostgreSQL, the API, and an nginx frontend that proxies `/api` and `/uploads`.

## What you need

- Docker and Docker Compose v2
- A domain (optional, but use HTTPS in production)
- 1 vCPU / 1 GB RAM is enough to start

## 1. Configure environment

```bash
cp .env.example .env
```

Required:

| Variable | Notes |
| --- | --- |
| `POSTGRES_PASSWORD` | Strong password — also used by the API to connect |
| `JWT_SECRET` | Long random string |
| `CLIENT_ORIGIN` | Public site origin, comma-separated if needed. Example: `https://tracker.example.com` |
| `ADMIN_EMAIL` | First admin login |
| `ADMIN_PASSWORD` | First admin password — change after login |
| `RUN_SEED` | `true` on first boot, then `false` |

Optional: SMTP / Resend / Novu / Anthropic keys for email, inbox, and AI onboarding.

If the public URL is `https://tracker.example.com`, set:

```env
CLIENT_ORIGIN=https://tracker.example.com
```

Leave `VITE_API_BASE_URL=/api` (the nginx container already proxies that path).

## 2. Start the stack

```bash
docker compose up --build -d
docker compose ps
docker compose logs -f api
```

The app is on port **8080** by default. Override with `WEB_PORT` in `.env`.

Health check: `http://localhost:8080/api/health` should return `{ "ok": true }`.

## 3. First login

Use `ADMIN_EMAIL` and `ADMIN_PASSWORD`. Create other users from the admin panel, or let people register and approve them.

After that:

```env
RUN_SEED=false
```

The seed script does **not** wipe data unless `SEED_RESET=true`.

## 4. Put it on a domain

Point DNS at the host, then put TLS in front of port 8080 (Caddy, nginx, Traefik, or a cloud load balancer).

Example Caddyfile:

```
tracker.example.com {
  reverse_proxy 127.0.0.1:8080
}
```

Set `CLIENT_ORIGIN` to that HTTPS origin and recreate the API container:

```bash
docker compose up -d api
```

## Data and backups

Docker volumes:

- `postgres_data` — database
- `uploads_data` — uploaded files (receipts, attachments)

Postgres dump:

```bash
docker compose exec postgres pg_dump -U kapitein project_tracking > backup.sql
```

Restore:

```bash
docker compose exec -T postgres psql -U kapitein project_tracking < backup.sql
```

## Updates

```bash
git pull
docker compose up --build -d
```

Startup always runs `prisma migrate deploy`, so schema changes in `server/prisma/migrations` are applied automatically.

## Alternative: Node + PM2 (no Docker for the app)

1. Install Node 20 and PostgreSQL 15.
2. Create the database and copy `server/.env.example` to `server/.env`.
3. Install and build:

```bash
npm install
npm run db:generate
npm run db:deploy
npm run db:seed
npm run build
pm2 start ecosystem.config.cjs
```

Put nginx in front of:

- frontend: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:4000`

Or keep using the Docker `web` image even if the API runs on the host.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Login fails after first boot | Seed skipped because users already exist, or `ADMIN_*` does not match |
| CORS error in the browser | `CLIENT_ORIGIN` does not match the exact public origin (scheme + host + port) |
| `/api` 502 | API container is not healthy — `docker compose logs api` |
| Empty site on refresh of a deep URL | nginx `try_files` missing — use the bundled `deploy/nginx.conf` |
