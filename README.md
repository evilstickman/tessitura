# Tessitura

Practice grid platform for musicians. Structured practice tracking with tempo progression.

**Domain:** practicegrids.com
**Stack:** Next.js 16 (App Router) · TypeScript · Prisma · PostgreSQL

## Architecture

Backend follows **MCV (Model-Controller-View)** pattern:

```
src/
  models/        Domain logic, Prisma queries
  controllers/   Request handling, orchestration
  views/         Response serialization (pure functions)
  app/api/       Next.js route handlers (thin delegation to controllers)
  lib/           Shared utilities (auth, db, errors, helpers)
```

Frontend follows **Director pattern** (not yet implemented):

```
src/components/
  directors/       Smart components (state, data fetching)
  presentation/    Dumb components (props only)
```

Layer rules: models never import controllers/views. Controllers never import Prisma directly. Views have no dependencies. API routes only import controllers.

## Setup

```bash
# Prerequisites: Node.js 22+, PostgreSQL 16+

# Install dependencies (also generates Prisma client via postinstall)
npm install

# Create dev and test databases
createdb tessitura_dev
createdb tessitura_test

# Set DATABASE_URL (dev)
export DATABASE_URL=postgresql://localhost:5432/tessitura_dev

# Run migrations
npx prisma migrate dev

# Seed dev user (required for pre-auth placeholder)
npx prisma db seed
```

## Authentication (pre-M1.8)

Before the NextAuth milestone, a placeholder in `src/lib/auth.ts` returns a hardcoded dev seed user (`dev-placeholder@tessitura.local`). All API endpoints use this user. Run `npx prisma db seed` to create it.

Auth failure returns `401 AUTHENTICATION_ERROR` (intentional contract, not accidental).

## Commands

```bash
npm run dev              # Start dev server
npm run build            # Production build
npm run lint             # ESLint (zero errors, zero warnings)
npx tsc --noEmit         # Type check

npm run test             # Unit + integration tests (Vitest)
npm run test:watch       # Watch mode
npm run test:coverage    # Tests with 95% threshold enforcement
npm run test:e2e         # Playwright e2e tests

# Full verification (run before every PR)
npm run lint && npx tsc --noEmit && npm run test:coverage && npm run build
```

## Database

- **ORM:** Prisma with PostgreSQL adapter (`prisma/schema.prisma`)
- **Migrations:** `npx prisma migrate dev --name <name>`
- **Environments:** dev=`tessitura_dev`, test=`tessitura_test`, prod=DigitalOcean
- **Soft deletes everywhere** — no hard deletes. All tables have `deleted_at`.

## Testing

- **Unit/Integration:** Vitest (`tests/unit/`, `tests/integration/`)
- **E2E:** Playwright (`tests/e2e/`)
- **Coverage:** 95% minimum on statements, branches, functions, and lines. Enforced in CI via `npm run test:coverage`.
- **TDD:** Write failing test, implement, refactor, commit.

## Milestone Status

| Milestone | Description | Status |
|-----------|-------------|--------|
| M1.1 | Project Bootstrap | Done |
| M1.2 | Domain Model — Grid, Row, Cell, Completion | Done |
| M1.3 | Grid CRUD API | Done (PR #13) |
| M1.4 | Row & Cell Operations + Piece Normalization | In Review (PR #14) |
| M1.5 | Cell Completion & Freshness API | Not started |
| M1.6 | Grid View UI | Not started |
| M1.7 | Dashboard UI | Not started |
| M1.8 | Authentication (NextAuth) | Not started |

## Deployment

- **Host:** DigitalOcean (159.223.198.58)
- **CI/CD:** GitHub Actions — every merged PR to `master` auto-deploys
- **Pipeline:** lint → type-check → test with coverage → build → e2e → deploy

## Full Spec

See `docs/PRODUCT_SPEC.md` for the complete product specification (75+ use cases, 29 domain entities, V1-V11 roadmap).
