# HAQMS VPS Deployment: Nginx + Certbot — Design

**Date:** 2026-05-29
**Status:** Approved

## Goal

Make the whole HAQMS project (Next.js frontend, Express backend, Postgres) run on
a single Azure Ubuntu VPS, publicly accessible over HTTPS, via one
"A-to-Z" deploy script. Nginx reverse-proxies a single domain to the two app
processes; Certbot issues and auto-renews a Let's Encrypt certificate.

## Target environment

- **Host:** `haqms-assignment.eastus.cloudapp.azure.com` (Azure VM, DNS already live)
- **OS:** Ubuntu / Debian (apt-based)
- **Certbot:** registered without an email (`--register-unsafely-without-email`). No personal email or reference anywhere.
- **Process manager:** PM2 (not systemd).

## Architecture

```
Internet
   │  :80 / :443
   ▼
 Nginx (host)
   ├── /        → http://localhost:3000   (Next.js, `next start`)
   └── /api/    → http://localhost:5000   (Express, `node src/index.js`)

 Postgres → Docker container (docker-compose), localhost:5432
```

- **Single domain, single cert.** Frontend at `/`, backend under `/api/`.
- Frontend and backend run **directly on the host** under **PM2** (auto-restart,
  resurrect on reboot via `pm2 startup` + `pm2 save`).
- Postgres remains the existing `docker-compose.yml` container.

### Env files — managed by the operator, NOT the script

The frontend and backend each use **their own existing env files**. The deploy
script does **not** generate, overwrite, or template them, and app env is never
placed in any container.

- Backend: `backend/.env` (operator sets it; for public HTTPS it should contain
  `NODE_ENV=production`, `PORT=5000`, the `DATABASE_URL`, a strong `JWT_SECRET`,
  and `FRONTEND_URL=https://<domain>`).
- Frontend: `frontend/.env.local` with
  `NEXT_PUBLIC_API_BASE_URL=https://<domain>/api`.

CORS in `backend/src/index.js` reads `FRONTEND_URL`; `next build` bakes
`NEXT_PUBLIC_API_BASE_URL`, so the operator must have `frontend/.env.local` set
correctly **before** running the deploy (the script builds from whatever is there).

## Files (all under `deploy/`, entire folder gitignored)

| File | Purpose |
|---|---|
| `deploy/deploy.sh` | Idempotent A-to-Z deploy/redeploy script. Run with `sudo bash deploy/deploy.sh`. |
| `deploy/nginx.conf.template` | Nginx server block with `${DOMAIN}` placeholder; rendered via `envsubst`. |
| `deploy/ecosystem.config.js` | PM2 process file defining the `haqms-backend` and `haqms-frontend` apps. |
| `deploy/.env.deploy.example` | Template of deploy-only variables (DOMAIN, app dir). No secrets, no email. |
| `deploy/README.md` | Server-side steps: get code → set `backend/.env` + `frontend/.env.local` → fill `.env.deploy` → run script. |

`.gitignore` gains a single line: `deploy/`.

## deploy.sh steps (idempotent)

Order: **system deps → Docker (Postgres) → build apps → PM2 → Nginx → Certbot.**

1. Require root; resolve repo root; `source deploy/.env.deploy` (DOMAIN, app dir only).
2. Install missing system deps: Node 20 (NodeSource), Docker + compose plugin,
   Nginx, Certbot + `python3-certbot-nginx`, `gettext-base` (for `envsubst`),
   and **PM2** globally (`npm i -g pm2`).
3. Open host firewall (ufw) for OpenSSH, 80, 443. **Print loud warning** that the
   Azure NSG must also allow inbound 80/443 (script cannot change NSG).
4. **Docker:** `docker compose up -d` → Postgres; poll until it accepts connections.
5. Verify env files exist (`backend/.env`, `frontend/.env.local`); the script does
   **not** create or modify them — it fails fast with guidance if missing.
6. Install deps: `npm ci || npm install` in `backend/` and `frontend/`.
7. Backend DB: `npx prisma generate` + `npx prisma migrate deploy` + seed
   (seed best-effort so re-runs don't crash).
8. `npm run build` in `frontend/`.
9. **PM2:** start/reload both apps from `deploy/ecosystem.config.js`
   (`pm2 startOrReload`), then `pm2 save` and `pm2 startup` so they resurrect on
   reboot. Apps read their own env files (backend via dotenv, frontend `.env.local`).
10. **Nginx:** render config from template, write to
    `/etc/nginx/sites-available/haqms`, symlink into `sites-enabled`, remove
    `default`, `nginx -t`, reload.
11. **Certbot:** `certbot --nginx -d $DOMAIN --non-interactive --agree-tos
    --register-unsafely-without-email --redirect` (no email). On failure (e.g. NSG
    closed), keep HTTP serving and print the exact manual command to retry. Renewal
    via the certbot systemd timer installed with the package.
12. `systemctl reload nginx`. Print final URLs + `pm2 status`.

## Nginx config (template highlights)

- Port 80 server: serves ACME challenge (`/.well-known/acme-challenge/`) and
  otherwise proxies/redirects. Certbot's `--nginx` installer adds the 443 block
  and the HTTP→HTTPS redirect automatically.
- `location /api/` → `proxy_pass http://127.0.0.1:5000;` (keep the `/api` prefix,
  since Express mounts routes at `/api/...`).
- `location /` → `proxy_pass http://127.0.0.1:3000;`.
- Proxy headers: `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`,
  plus `Upgrade`/`Connection` for WebSocket safety.
- Reasonable `client_max_body_size` (e.g. 2m, matching backend's 1mb JSON + margin).

## PM2 ecosystem (deploy/ecosystem.config.js)

- **haqms-backend:** `cwd: <repo>/backend`, `script: src/index.js`,
  interpreter node. Reads `backend/.env` via the app's own dotenv. `autorestart: true`.
- **haqms-frontend:** `cwd: <repo>/frontend`, `script: npm`, `args: run start`
  (binds 3000). `next start` reads `frontend/.env.local`. `autorestart: true`.
- `pm2 save` + `pm2 startup` make both survive reboot. App env stays in the app's
  own env files — never in PM2 inline config or any container.

## Error handling / edge cases

- **NSG closed (80/443):** certbot fails; script degrades to HTTP, prints manual
  fix. Site still reachable on HTTP for debugging.
- **Re-run safety:** all steps are create-or-replace; PM2 `startOrReload` restarts
  cleanly; `migrate deploy` is a no-op when up to date; seed is best-effort.
- **Missing env files:** script fails fast and tells the operator to create
  `backend/.env` and `frontend/.env.local` first.
- **Build-time API URL:** frontend rebuilt every deploy so the baked URL is fresh.
- **Postgres readiness:** script polls before running migrations.

## Out of scope

- Azure NSG automation (portal/CLI, user-side).
- Subdomain split / separate API host (single-domain chosen).
- CI/CD pipelines, blue-green, multi-node.

## Manual operator steps (documented in deploy/README.md)

1. Ensure Azure NSG allows inbound 80 + 443.
2. Get code on the VM (`git clone` / scp the repo).
3. Create `backend/.env` and `frontend/.env.local` with production values.
4. Copy `deploy/.env.deploy.example` → `deploy/.env.deploy`, set DOMAIN + app dir.
5. `sudo bash deploy/deploy.sh`.
