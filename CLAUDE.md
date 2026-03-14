# Tessitura — Project Conventions

## Quick Start

```bash
npm install
npm run dev          # Start dev server
npm run build        # Production build
npm run test         # Run unit + integration tests (Vitest)
npm run test:e2e     # Run e2e tests (Playwright)
npm run lint         # Lint (zero errors, zero warnings)
npx tsc --noEmit     # Type check
```

## Architecture: MCV + Director Pattern

### Backend (MCV)
- **`src/models/`** — Domain entities, business rules, Prisma queries. The heart of the app.
- **`src/controllers/`** — Request handling, input validation, orchestration. Calls models, returns via views.
- **`src/views/`** — Response serialization. Pure transforms from model data to API shapes.
- **`src/app/api/`** — Next.js route files. Thin wrappers that delegate to controllers.

### Frontend (Director Pattern)
- **`src/components/directors/`** — Smart components. State management, data fetching.
- **`src/components/presentation/`** — Dumb components. Render props only. No state, no fetch.

### Layer Rules
- Models never import controllers, views, or components
- Controllers never import Prisma directly or components
- Views are pure functions — no dependencies
- API routes only import controllers
- Directors use API calls, never import models/controllers
- Presentation components receive props only

## Database

- **ORM:** Prisma (`prisma/schema.prisma`)
- **Migrations:** `npx prisma migrate dev --name <name>`
- **Client singleton:** `src/lib/db.ts`
- **Environments:** dev=tessitura_dev, test=tessitura_test, prod=DigitalOcean

## Testing

- **Unit/Integration:** Vitest (`tests/unit/`, `tests/integration/`)
- **E2E:** Playwright (`tests/e2e/`)
- **Coverage:** 95% minimum on all code. Enforced in CI.
- **No ghost tests.** Every test must validate real behavior.
- **No skipped tests.** If a test can't pass, fix the code.
- **TDD always:** Write failing test → implement → refactor → commit.

## Commit Convention

```
<type>: <short description>
```

Types: `feat`, `fix`, `refactor`, `test`, `infra`, `docs`, `style`

All commits include: `Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>`

## PR Workflow

1. Pick task, mark `in-progress`
2. Create short-lived branch from master
3. TDD: write failing test → implement → refactor
4. PR description MUST include:
   - Acceptance criteria checklist with evidence
   - Rejection criteria checklist with evidence
   - Screenshots for UI changes
5. Willow reviews and approves
6. Merge → auto-deploy → verify → mark task `completed`

## Development Principles

- **Domain model first** — How does this change the domain?
- **No hard deletes** — Soft delete with `deleted_at` everywhere
- **Single API version** — No /v1/, /v2/ paths. Breaking changes need Willow's approval.
- **Calculate once, store** — Derived values calculated at creation, stored, not recalculated on read
- **No technical UI** — Users never see IDs, enums, ISO timestamps
- **ACID transactions** — All writes are atomic
- **REST API** — Resources are nouns, HTTP methods are verbs
