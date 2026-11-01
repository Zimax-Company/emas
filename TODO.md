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
