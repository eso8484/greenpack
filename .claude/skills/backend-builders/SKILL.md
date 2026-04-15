---
name: backend-builders
description: Use when someone asks to build the backend, implement backend functionality for a feature, create API endpoints, set up database schema, or harden backend security for GreenPack.
disable-model-invocation: true
argument-hint: "feature scope or backend module"
---

# Backend Builder Skill

## What This Skill Does

Builds or upgrades GreenPack backend features in a controlled, production-safe way using the project conventions in [CLAUDE.md](../../../CLAUDE.md).

This skill is implementation-focused and handles:

- Supabase schema and migrations
- Next.js App Router API route handlers
- Authentication and role-aware authorization
- Validation, error handling, and backend security hardening
- Notifications integration and backend observability

## Inputs and Scope

- Primary input: user request or $ARGUMENTS
- Optional input: specific endpoint/table/module paths from the user
- Default scope when unspecified: implement the smallest viable backend slice for the requested feature and make it testable

If the request is broad, first break it into a phased implementation plan and execute phase 1 end-to-end before expanding.

## Required Context

Before coding, read these sources:

1. [CLAUDE.md](../../../CLAUDE.md) for architecture, auth, route, and stack rules.
2. [src/types/index.ts](../../../src/types/index.ts) for shared domain types.
3. [src/lib/db.ts](../../../src/lib/db.ts) and [src/lib/supabase/server.ts](../../../src/lib/supabase/server.ts) for existing data access and Supabase patterns.
4. Target API route handlers under [src/app/api/](../../../src/app/api/) related to the requested module.
5. Existing migrations under [supabase/migrations/](../../../supabase/migrations/) before creating new schema changes.

## Workflow

1. Clarify the backend slice
   - Restate requested outcome, affected roles, and required endpoints/tables.
   - If requirements are ambiguous, ask only the minimum blocking question.

2. Audit current implementation
   - Identify existing handlers, data-layer functions, types, and migrations that overlap.
   - Reuse existing conventions; do not introduce a parallel architecture.

3. Design the change
   - Define contract first: request payload, response shape, auth requirements, and failure modes.
   - Keep response format consistent:
     - success: true with data payload
     - success: false with stable error message

4. Implement database layer changes
   - For schema updates, add a new migration in [supabase/migrations/](../../../supabase/migrations/) with forward-only SQL.
   - Add or update data-access logic in [src/lib/db.ts](../../../src/lib/db.ts) when shared queries are needed.
   - Preserve snake_case to camelCase mapping conventions.

5. Implement API routes
   - Add/update route handlers in [src/app/api/](../../../src/app/api/) using role checks and Supabase server client patterns.
   - Validate payloads and query params.
   - Return deterministic status codes and error bodies.

6. Add security and correctness checks
   - Enforce auth and role boundaries.
   - Ensure RLS-compatible query patterns.
   - Add rate limiting and idempotency only when endpoint risk requires it.

7. Verify
   - Run lint and relevant build/test checks.
   - Manually sanity-check happy path and one failure path per endpoint changed.
   - Confirm no regression in existing routes.

8. Document deltas
   - Summarize files changed, new env vars, migration names, and API behavior updates.
   - If skill behavior changed materially, update skill notes in [CLAUDE.md](../../../CLAUDE.md).

## Output Format

When this skill runs, respond in this structure:

1. Scope implemented
   - Feature/module implemented
   - Roles and endpoints affected

2. Changes made
   - File-by-file summary
   - Migration(s) added
   - Validation/auth/security changes

3. Verification
   - Commands run
   - Result summary (pass/fail)
   - Any skipped checks and why

4. Follow-up actions
   - Required env vars
   - Deployment/migration steps
   - Suggested next backend increment

## Guardrails

- Prefer the existing Supabase architecture. Do not switch to Firebase unless the user explicitly asks for a stack migration.
- Do not expose service-role secrets or move server-only logic to client code.
- Do not bypass middleware or role checks for convenience.
- Do not perform destructive schema rewrites when additive migration is sufficient.
- Do not silently change API contracts used by existing UI without documenting impact.
- Do not hardcode credentials, keys, or webhook secrets.

## Edge Cases

- If Supabase env is missing, keep mock fallback behavior intact where the project already supports it.
- If a requested endpoint overlaps existing behavior, extend existing handlers rather than creating duplicates.
- If request includes payments, isolate payment actions behind server-side verification and webhook reconciliation.
- If the user asks for a full backend rebuild, execute in phases and deliver one verified phase at a time.

## Notes

- Keep implementations TypeScript strict-mode friendly.
- Match project naming, route layout, and auth patterns already used in GreenPack.
- Keep edits minimal and scoped to the requested backend outcome.
