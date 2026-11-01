# EMAS — Estate Management System

A multi-tenant estate management platform driven by roles and permissions. It is a single Next.js project: server-rendered React pages and a JSON API, backed by MySQL.

**Stack:** Node 24 · Next.js 16 (App Router, React 19) · MySQL 8 with Knex · JWT (jose) · Zod. Migrations are Laravel-style and run on every production deploy.

## Features

- **Users & roles.** There are three kinds of access:
  - **System admin** (`users.is_system_admin`): every permission, in every estate. Creates estates and manages all users.
  - **Estate Admin**: a default role in each estate with root access to that estate. It is locked and always holds every permission. Estate admins create roles and grant permissions.
  - **Resident**: a default role in each estate. Residents see their own residence's inbox and account.
  - **Custom roles** per estate (Treasurer, Security…), built from 19 permissions (see `lib/permissions.ts`). A user can hold several roles in an estate and belong to several estates.
- **Estates.** Each estate has its own dashboard. A user who belongs to several estates switches between dashboards from the top bar.
- **Residences.** Each residence has a name, an address and contacts (owner, tenant, emergency…, with one marked primary). User accounts are linked to residences as residents.
- **Residence inbox.** Admins publish announcements to all residences or to selected ones. Each residence gets an inbox entry, and the system tracks who has read it.
- **Residence account.** A ledger of charges, payments and credits, with a running balance.
- **Dues.** One-time, monthly, quarterly or yearly. Charging a due posts it to each residence account once per billing period; running it again skips residences already charged.
- **Estate account.** Income and expenses with categories, filters and a running balance. A payment recorded on a residence account also appears automatically as estate income.
- **Visitor access codes.** A resident creates a visitor pass for their residence and gets a 6-digit **IN** code and a 6-digit **OUT** code to share with the visitor. Gate staff with the `visitors.validate` permission enter the code on the **Gate** page.
  - Each code works exactly once, including when two gates submit the same code at the same moment.
  - The IN code only works inside the pass's validity window (up to a week, optionally starting later).
  - The OUT code only works after check-in. It never expires, so a visitor who overstays can still leave.
  - A pass can be cancelled until the visitor checks in.
  - The Gate page shows who is expected, who is inside now, and recent activity.
  - Codes are only shown to the residence's residents and holders of `visitors.manage`, never in the gate log.

### Guard rails
- A non-admin with `roles.manage` can only grant permissions they hold themselves, and only admins can assign the admin role.
- Gate staff can validate codes but never see them; a code must be typed in to be used.
- An estate always keeps at least one estate admin. Default roles cannot be deleted, and the admin role cannot be edited.
- Tenancy is isolated: every estate-scoped query is filtered by `estate_id`. Non-members get a 404 for estates they don't belong to.

## How it fits together

```
app/
  api/…                 JSON API (route handlers). All business rules and permission checks live here.
  (app)/…               Signed-in pages (server components) and their small client components for forms
  login/                Sign-in page
lib/                    db, auth, rbac, ledger, server-side loader, client fetch helpers, shared types
database/migrations/    Laravel-style migrations     database/seeds/   seeders
scripts/artisan.mjs     migration CLI                scripts/smoke.mjs end-to-end API checks
```

- **Pages are server-rendered.** A page loads its data by calling the API route handlers in-process (`lib/server.ts`), so pages and the public API share the same validation and permission checks.
- **Forms are client components.** They call `/api/*`, then refresh the page so the server re-renders it with fresh data.
- **Authentication.** Logging in sets an httpOnly `emas_token` cookie for the web UI and also returns the token in the response body for other clients, such as a future mobile app, which send `Authorization: Bearer <token>`. Cookie-authenticated writes must come from the same origin.

## Run locally with Docker

```bash
npm run docker:up      # mysql (:3307) + app (:3000) on node:24-alpine; migrates on start
npm run docker:seed    # creates admin@emas.local / password
open http://localhost:3000
```

If port 3000 is taken, run `APP_PORT=3001 npm run docker:up`.

### Without Docker for the app
Run only MySQL in Docker and the app on the host:

```bash
docker compose up -d mysql
cp .env.example .env
npm install && npm run migrate && npm run db:seed && npm run dev
```

## Migrations (Laravel-style)

Migrations live in `database/migrations/` as `YYYY_MM_DD_HHMMSS_name.mjs` files with `up`/`down` functions. They are tracked in a `migrations` table by batch.

```bash
npm run make:migration -- add_gate_codes_table
npm run migrate                       # run pending migrations
npm run migrate -- --seed             # ...then run seeders
npm run migrate:rollback              # roll back the last batch
npm run migrate:rollback -- --step=3  # or the last 3 batches / --all
npm run migrate:status
npm run migrate:fresh -- --seed       # drop everything and rebuild (refused in production without --force)
npm run db:seed
```

To add a permission, write a new migration that inserts it into `permissions`, then add it to `lib/permissions.ts`.

## Smoke test

With the app running and seeded:

```bash
npm run smoke            # host, against http://localhost:3000 (override with APP_URL)
npm run docker:smoke     # inside the container
```

This runs 48 end-to-end checks covering estate creation, default roles, residences, the inbox, dues, both ledgers, visitor codes, custom roles, privilege escalation and cross-estate isolation.

## Deploying to Vercel

The whole app is **one Vercel project**.

1. Get a managed MySQL 8 database. Vercel doesn't host MySQL; use something like TiDB Cloud, PlanetScale, Aiven, AWS RDS or Railway.
2. Push the repo to GitHub, then in Vercel choose **Add New → Project** and import it. Leave the root directory as the repo root; `vercel.json` sets the build.
3. Add environment variables:

| Name | Value |
| --- | --- |
| `DATABASE_URL` | `mysql://user:pass@host:port/db?ssl=true` |
| `JWT_SECRET` | 32+ random characters, e.g. `openssl rand -base64 48` |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | first system admin; remove after the first deploy |
| `NEXT_PUBLIC_TIME_ZONE` | optional, defaults to `Africa/Lagos` |

4. Deploy, then sign in with the seeded admin.

**Migrations run during every production deployment.** The build command is `npm run vercel-build`, which runs:

```
artisan migrate --force --seed --deploy && next build
```

- Knex's migration lock prevents two concurrent deploys from migrating at the same time.
- A failed migration fails the build, so broken code is never promoted.
- Preview deployments skip migrations, so a PR branch can't change the production database. To migrate a preview, give it its own `DATABASE_URL` and set `MIGRATE_ON_PREVIEW=true`.
- The admin seeder only creates the system admin when `SEED_ADMIN_*` is set and that user doesn't exist yet.
- `SKIP_MIGRATIONS=true` disables deploy-time migrations entirely.

Node 24 is pinned through `engines` in `package.json`. The database pool is deliberately small (`DB_POOL_MAX`, default 5) for serverless.

## API overview

All responses are `{ data }` or `{ error: { message, details? } }`. Amounts are integers in minor units (kobo or cents).

```
POST   /api/auth/login    POST /api/auth/logout    GET /api/auth/me    PUT /api/auth/password
GET    /api/estates                        POST /api/estates (sysadmin)
GET    /api/estates/:eid                   PATCH, DELETE (sysadmin)
GET    /api/estates/:eid/dashboard
GET    /api/permissions
GET|POST          /api/estates/:eid/roles            PATCH|DELETE /roles/:rid
GET|POST          /api/estates/:eid/members          PATCH|DELETE /members/:mid
GET|POST          /api/estates/:eid/residences       GET|PATCH|DELETE /residences/:rid
POST              /residences/:rid/contacts          PATCH|DELETE /contacts/:cid
POST              /residences/:rid/residents         DELETE /residents/:uid
GET               /residences/:rid/inbox             PATCH /inbox/:mid (mark read)
GET|POST          /residences/:rid/transactions
GET|POST          /api/estates/:eid/announcements    DELETE /announcements/:aid
GET|POST          /api/estates/:eid/dues             PATCH|DELETE /dues/:did   POST /dues/:did/charge
GET|POST          /api/estates/:eid/account          DELETE /account/:tid
GET|POST          /residences/:rid/visitors          DELETE /visitors/:vid (cancel)
GET               /api/estates/:eid/visitors?status=expected|inside|recent
POST              /api/estates/:eid/visitors/validate { code }
GET|POST          /api/users (sysadmin)              PATCH /users/:uid
```
