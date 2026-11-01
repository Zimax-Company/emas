# EMAS — Estate Management System

A multi-tenant estate management platform driven by roles and permissions.

| Part | Path | Stack |
| --- | --- | --- |
| API | [`apps/api`](apps/api) | Node 24, Next.js 16 route handlers, Knex + MySQL, JWT (jose), Zod |
| Web | [`apps/web`](apps/web) | Node 24, Nuxt 4 (Vue 3), server-side rendered |
| DB | MySQL 8 | Laravel-style migrations that run on every production deploy |

## Features

- **Users & roles.** There are three kinds of access:
  - **System admin** (`users.is_system_admin`): every permission, in every estate. Creates estates and manages all users.
  - **Estate Admin**: a default role in each estate with root access to that estate. It is locked and always holds every permission. Estate admins create roles and grant permissions.
  - **Resident**: a default role in each estate. Residents see their own residence's inbox and account.
  - **Custom roles** per estate (Treasurer, Security…), built from 16 permissions (see `lib/permissions.ts`). A user can hold several roles in an estate and belong to several estates.
- **Estates.** Each estate has its own dashboard. A user who belongs to several estates switches between dashboards from the top bar.
- **Residences.** Each residence has a name, an address and contacts (owner, tenant, emergency…, with one marked primary). User accounts are linked to residences as residents.
- **Residence inbox.** Admins publish announcements to all residences or to selected ones. Each residence gets an inbox entry, and the system tracks who has read it.
- **Residence account.** A ledger of charges, payments and credits, with a running balance.
- **Dues.** One-time, monthly, quarterly or yearly. Charging a due posts it to each residence account once per billing period; running it again skips residences already charged.
- **Estate account.** Income and expenses with categories, filters and a running balance. A payment recorded on a residence account also appears automatically as estate income.

### Guard rails
- A non-admin with `roles.manage` can only grant permissions they hold themselves, and only admins can assign the admin role.
- An estate always keeps at least one estate admin. Default roles cannot be deleted, and the admin role cannot be edited.
- Tenancy is isolated: every estate-scoped query is filtered by `estate_id`. Non-members get a 404 for estates they don't belong to.

## Architecture

```
Browser ──► Nuxt (SSR, apps/web) ──/api/proxy/*──► Next.js API (apps/api) ──► MySQL
            httpOnly cookie holds JWT     adds Authorization: Bearer
```

Nuxt renders pages on the server. The JWT is stored in an httpOnly cookie, and requests reach the API through `server/api/proxy/[...path].ts`, so browser JavaScript never sees the token.

## Run locally with Docker

```bash
npm run up          # mysql (:3307), api (:4000), web (:3000) on node:24-alpine
npm run migrate     # runs automatically on api start too
npm run seed        # creates admin@emas.local / password
open http://localhost:3000
```

### Without Docker for the apps
Run only MySQL in Docker and the apps on the host:

```bash
docker compose up -d mysql
cd apps/api && cp .env.example .env && npm install && npm run migrate && npm run db:seed && npm run dev
cd apps/web && cp .env.example .env && npm install && npm run dev
```

## Migrations (Laravel-style)

Migrations live in `apps/api/database/migrations/` as `YYYY_MM_DD_HHMMSS_name.mjs` files with `up`/`down` functions. They are tracked in a `migrations` table by batch.

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

With the API running and seeded:

```bash
cd apps/api && npm run smoke
```

This runs 34 end-to-end checks covering estate creation, default roles, residences, the inbox, dues, both ledgers, custom roles, privilege escalation and cross-estate isolation.

## Deploying to Vercel

Create **two Vercel projects** from this repo:

| Project | Root directory | Env vars |
| --- | --- | --- |
| `emas-api` | `apps/api` | `DATABASE_URL` (add `?ssl=true` for hosted MySQL), `JWT_SECRET` (32+ chars), optional `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` |
| `emas-web` | `apps/web` | `NUXT_API_URL=https://<emas-api domain>` |

Both pin Node 24 through `engines` in `package.json`.

**Migrations run during every API deployment.** `apps/api/vercel.json` uses `npm run vercel-build`, which runs:

```
artisan migrate --force --seed --deploy && next build
```

- Knex's migration lock prevents two concurrent deploys from migrating at the same time.
- A failed migration fails the build, so broken code is never promoted.
- Preview deployments skip migrations, so a PR branch can't change the production database. To migrate a preview, give it its own `DATABASE_URL` and set `MIGRATE_ON_PREVIEW=true`.
- The admin seeder only creates the system admin when `SEED_ADMIN_*` is set and that user doesn't exist yet. Remove those env vars after the first deploy.
- `SKIP_MIGRATIONS=true` disables deploy-time migrations entirely.

Vercel does not host MySQL. Use a managed MySQL service such as PlanetScale, Aiven, TiDB Cloud, AWS RDS or Railway. The connection pool is deliberately small (`DB_POOL_MAX`, default 5) for serverless.

## API overview

All responses are `{ data }` or `{ error: { message, details? } }`. Amounts are integers in minor units (kobo or cents).

```
POST   /api/auth/login                     GET  /api/auth/me           PUT /api/auth/password
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
GET|POST          /api/users (sysadmin)              PATCH /users/:uid
```

> Ports clash? `WEB_PORT=3001 API_PORT=4001 npm run up`.
