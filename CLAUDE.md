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

## MANDATORY WORKFLOW — NO EXCEPTIONS

**NEVER commit implementation code directly to master.**
**NEVER skip the PR and review process.**
**NEVER mark work as done without Willow's approval.**

### For every task:

1. **Pick task** from task list, mark `in-progress`
2. **Create feature branch** from master: `git checkout -b <type>/<short-name>`
3. **TDD:** Write failing test → implement minimal code → refactor → repeat
4. **Self-verify:** `npm run lint && npx tsc --noEmit && npm run test && npm run build`
5. **Push branch** and create PR via `gh pr create`
6. **PR description MUST include:**
   - Acceptance criteria checklist: for every AC in the relevant UC, state how the PR addresses it with evidence (test names, code refs)
   - Rejection criteria checklist: for every RC, state that it is NOT violated with evidence
   - Screenshots for UI changes
   - If any criterion cannot be addressed, the PR is NOT ready
7. **Mark task `ready-for-review`** — wait for Willow
8. **Willow reviews** — expect back-and-forth, address every comment
9. **Willow approves** → merge to master
10. **Verify deploy**, mark task `completed`, move to next task

## Development Principles

- **Domain model first** — How does this change the domain?
- **No hard deletes** — Soft delete with `deleted_at` everywhere
- **Single API version** — No /v1/, /v2/ paths. Breaking changes need Willow's approval.
- **Calculate once, store** — Derived values calculated at creation, stored, not recalculated on read
- **No technical UI** — Users never see IDs, enums, ISO timestamps
- **ACID transactions** — All writes are atomic
- **REST API** — Resources are nouns, HTTP methods are verbs

## Migration Safety — Mandatory

- Never submit a migration that drops or rewrites existing user data without an explicit backfill plan.
- Every destructive schema change (column drop, type change, table rename) must include SQL that preserves existing data.
- If Prisma generates a destructive migration, rewrite it by hand.
- Add migration-verification tests for any migration that moves data.
- The `prisma/migrations/20260316004308_normalize_piece_entity/migration.sql` rewrite is the reference example.

## CI Truthfulness

- CI must run `npm run test:coverage`, not `npm run test`.
- Vitest coverage config must not exclude files that contain application logic (e.g., route handlers, controllers).
- If coverage drops below 95%, add tests — never widen exclude patterns.
- The coverage number in CI must match what a developer sees locally.

### Coverage Exclusions (justified)

The following are excluded from coverage in `vitest.config.ts`. Each must have a reason here — no silent excludes.

| Path | Reason |
|------|--------|
| `src/generated/**` | Prisma auto-generated client. Not our code; regenerated on every build. |
| `src/app/globals.css` | CSS file, not executable code. |
| `src/lib/auth.config.ts` | Auth.js v5 config — pure wiring, no custom logic. Tested via integration tests. |
| `src/lib/auth.edge.ts` | Auth.js edge-safe config — providers + callbacks only, used by middleware. |
| `src/app/api/auth/**` | Auth.js route handler — re-exports handlers, zero custom code. |
| `src/middleware.ts` | Auth.js middleware wiring. Tested via E2E redirect tests. |

**Rule:** When any excluded file gains application logic, it must be removed from the exclusion list and tested.

## Auth Contract (M1.8+)

- `getCurrentUserId()` in `src/lib/auth.ts` resolves the current user.
- **Production** (`AUTH_SECRET` set): reads Auth.js v5 JWT via `auth()` helper.
- **Development** (no `AUTH_SECRET`): falls back to dev seed user.
- Auth failure throws `AuthenticationError` (from `src/lib/errors.ts`), which controllers catch and return as `401 AUTHENTICATION_ERROR`.
- This contract is permanent — the mechanism may change, the behavior never does.
- Google OAuth is the only provider in V1. Apple + email/password planned for future milestones.

## Soft Delete Visibility Rules

- **Rows, Cells, Completions:** Hidden when soft-deleted (`WHERE deleted_at IS NULL`).
- **Pieces on Rows:** ALWAYS shown, even if the piece itself is soft-deleted. A row's piece reference is historical context — deleting a piece from the library must not erase what a user was practicing.
- Every query that touches soft-deletable data must document which rule it follows.

## Spec Mismatch Rule

- If you notice the implementation differs from `docs/PRODUCT_SPEC.md`, flag it — do not silently conform and do not silently diverge. Willow decides.
