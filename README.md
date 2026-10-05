# Yorsys Web (Next.js)

Web front end for Yorsys. The first module is **HR**, built from the screens in
`yorsys_pos_prototype_v135.html`. It talks to the Go API in `../backend`.

## Run locally

```bash
cp .env.example .env.local    # set API_BASE_URL to the Go API (default http://localhost:8081)
npm install
npm run dev                   # http://localhost:3000
```

| Variable                | Purpose                                                      |
| ----------------------- | ------------------------------------------------------------ |
| `API_BASE_URL`          | Go API base URL, server-side only (never sent to the browser) |
| `DEFAULT_BUSINESS_SLUG` | Used at login when the "Business code" field is left empty    |

Checks: `npx tsc --noEmit`, `npm run lint`, `npm run build`.

## Deploy on the VPS (fr-group.yorlapa.com)

The app runs as one Docker container next to the superproject stack and is
reached through the superproject's Kong gateway, which owns ports 80/443.

```
Internet ─► Kong (superproject) ─┬─ uat.superproject.yorlapa.com ─► coffeeshop_api:8081 (Go API)
                                 └─ fr-group.yorlapa.com         ─► hr_frontend:3000 (this app)
hr_frontend ──server-side──► coffeeshop_api:8081   (same Docker network, no CORS, no public hop)
```

1. **DNS**: add an `A` record `fr-group.yorlapa.com` → the VPS IP.
2. **Superproject first** (it holds the Kong route and creates the Docker network):
   back up the database, then pull and restart — the Go server applies the new
   migrations on start.
   ```bash
   cd /opt/superproject
   docker exec coffeeshop_db pg_dump -U postgres coffeeshop_db > ~/backup-$(date +%F).sql
   git pull
   docker compose up -d --build backend
   docker logs coffeeshop_api | grep migrate     # expect "applied 033…043"
   ```
3. **This app**:
   ```bash
   git clone https://github.com/Souk159/frontend-HR.git /opt/frontend-HR
   cd /opt/frontend-HR
   cp .env.example .env
   docker network ls | grep coffeeshop_net       # put that name in SUPERPROJECT_NETWORK if different
   docker compose up -d --build
   curl -I http://localhost:3000/login           # expect 200
   ```
4. **Kong route + SSL** (back in the superproject):
   ```bash
   cd /opt/superproject
   sudo bash scripts/kong-upload-cert.sh         # loads the new route (HTTP)
   docker compose stop kong
   sudo certbot certonly --standalone -d fr-group.yorlapa.com --agree-tos -m your@email.com
   docker compose start kong && sleep 10
   sudo bash scripts/kong-upload-cert.sh         # adds SSL for both domains
   ```
   Open https://fr-group.yorlapa.com — sign in with a Yorsys account.

Update later: `git pull && docker compose up -d --build`.

## How it fits together

```
Browser ──► Next.js (this app) ──► Go API /v1/*
            │  /api/auth/login   sets httpOnly cookies (access + refresh JWT)
            │  /api/auth/logout  revokes the refresh token, clears cookies
            │  /api/v1/*         authenticated proxy; refreshes an expired access token once
            └─ src/proxy.ts      redirects to /login when there is no session
```

The browser never handles JWTs. Authorization is enforced by the Go API on every
request; the UI only hides tabs the user can't use (`GET /v1/hr/me`).

## Structure

```
src/
  app/
    login/                  sign-in screen
    (app)/hr/               HR module — one folder per tab
      HRShell.tsx           topbar + sub-tab bar, filtered by role / coordinator grants
    api/                    BFF route handlers (auth + /v1 proxy)
    globals.css             design tokens + components ported from the prototype
  components/ui/            Modal, success/error dialogs, Field, Table, Tag, Kpi …
  features/hr/
    api.ts                  TanStack Query hooks + query keys
    types.ts                API response shapes
    utils.ts, nav.ts        labels, status warnings, tab config
    components/             EmployeeFormModal, ApprovalDetailModal, NewDepartmentForm
  lib/                      api client, formatting (₭, dates, Vientiane time), EN/ລາວ i18n
  proxy.ts                  Next 16 "proxy" (formerly middleware)
```

## HR rules carried over from the prototype

- Adding an employee is immediate; every other change (profile, salary, quota,
  work rules, meal quota, resignation, leave, part-time days, activities bonus %)
  goes to **GM/COO approval** and is applied by the API only when approved.
- HR Coordinators see only the tabs granted in *Manage HR Access*; payroll,
  approvals and access management are never delegable.
- Payroll and part-time costs go to the Accountant as one cost message per
  department, never individual salaries.

Additions not in the prototype: **Property** per employee, **Scanner PIN** (links
SmartAC/ZKTeco attendance to the employee) and the **Scanners** tab (which resort each
scanner is at; attendance shows the scanner and resort of every scan).
