# EMAS — Build TODO

- [x] 1. Monorepo scaffold (independent app packages, Node 24, docker-compose with MySQL on :3307)
- [x] 2. API: Next.js app skeleton (route handlers, DB pool, error/response helpers)
- [x] 3. Migrations (Knex, Laravel-style `migrate`, `migrate:rollback`, `make:migration`) + seeders
- [x] 4. API: Auth (login, me, JWT) + RBAC (system admin, per-estate roles & permissions)
- [x] 5. API: Estates (create/list/update) — auto-create default roles `estate-admin` & `resident`
- [x] 6. API: Users & estate members, roles & permissions management
- [x] 7. API: Residences (address, name, contacts) + residents
- [x] 8. API: Announcements → residence inboxes (read tracking)
- [x] 9. API: Dues (create, apply to residences) + residence account ledger (charges/payments)
- [x] 10. API: Estate account (income & expenses) + estate dashboard stats
- [x] 11. Web: Nuxt (Vue, SSR) scaffold, auth via httpOnly cookie + server proxy
- [x] 12. Web: Estate switcher / multi-dashboard, estate dashboard
- [x] 13. Web: Residences, contacts, residence inbox & account pages
- [x] 14. Web: Announcements, dues, estate account pages
- [x] 15. Web: Members, roles & permissions pages; system admin (estates, users)
- [x] 16. Verified in Docker (node:24-alpine + mysql:8.0): migrations on start, seed, 34/34 API smoke checks, all web pages SSR 200 via cookie session; also both prod builds
- [x] 17. Vercel config (migrations on deploy) + README

## Phase 2 — single Next.js project (React UI replaces Nuxt)

- [x] 18. API accepts httpOnly session cookie (+ CSRF origin check), login sets / logout clears it
- [x] 19. Server data loader (calls route handlers in-process), session/estate helpers, client fetch helpers
- [x] 20. Root layout, global CSS, login, app shell (topbar + estate switcher), estate sidebar
- [x] 21. Pages: estates list, profile, admin users, new estate
- [x] 22. Pages: estate dashboard, residences list, residence detail (overview / inbox / account)
- [x] 23. Pages: announcements, dues, estate account, members, roles, settings
- [x] 24. Move app to repo root, single docker-compose service, single vercel.json, remove apps/web
- [x] 25. Verified: typecheck, prod build, 34/34 smoke (Docker + prod), all pages SSR, 12/12 headless-Chrome UI flows (no hydration errors); README updated

## Phase 3 — visitor access codes

- [x] 26. Migration: visitor_passes + visitor_codes (live-code uniqueness per estate), visitors.view / visitors.manage / visitors.validate permissions
- [x] 27. API: residents issue / list / cancel passes; gate validates single-use IN then OUT codes (row lock, expiry window, no code reuse)
- [x] 28. UI: residence Visitors tab (generate, copy, cancel), estate Gate page (validate, expected / inside / recent)
- [x] 29. Verified: 48/48 smoke, concurrent-use test (1 of 10 succeeds), expiry + overstay checks, headless-Chrome flow, prod build; README updated
