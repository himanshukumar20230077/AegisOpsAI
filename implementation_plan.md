# AegisOps AI Implementation Plan

## Status

Planning baseline only. Implementation and test results will be recorded here as phases are completed; no feature is considered complete until its focused tests pass.

## Phase sequence

| Phase | Scope | Verification gate | Status |
| --- | --- | --- | --- |
| 0. Project baseline | Repository conventions, architecture and plans, ignore rules, Python/Node project skeleton, local setup instructions | Clean status checks, dependency install, backend/frontend baseline tests | In progress |
| 1. API foundation | FastAPI app factory, configuration, structured errors, liveness/readiness checks | API tests including ready response and database-unavailable behavior | In progress |
| 2. Persistence | SQLAlchemy models, environment-based PostgreSQL configuration, Alembic initial migration, isolated test database fixtures | SQLite migration upgrade/schema test passed; live PostgreSQL integration remains | In progress |
| 3. Identity and authorization | User model, Argon2id password hashing, revocable bearer sessions, role dependencies, safe CLI provisioning | Login, invalid credentials/inactive user, session expiry/logout, admin provisioning, and role-denial tests | Complete for local backend scope |
| 4. Incident workflow | Create/list/detail/update/assign/resolve API, validation, pagination and basic filters; audit events and richer transition rules remain | CRUD, validation, missing-record, filter and resolution tests passed; audit/transition hardening remains | In progress |
| 5. Search and analytics | Database-backed filters and bounded aggregate endpoints | Seeded-record tests proving results derive from persisted rows and honor access scope | Planned |
| 6. Frontend foundation | Responsive application shell, typed API client, memory-only login, protected routes, accessible loading/error states | Typecheck, lint, and Vitest tests passed | Complete for local frontend scope |
| 7. Incident dashboard | Incident list/detail and create/edit/assign/resolve workflows, filters and API-backed scoped metrics | 15 frontend tests and production build passed; manual browser/device smoke check remains | Complete for implemented frontend workflows |
| 8. Optional assistance | Provider adapter, deterministic labelled fallback, evidence-grounding and output schema | Provider-free deterministic tests and mocked-provider grounding/security tests | Planned |
| 9. Delivery hardening | Docker multi-stage image, non-root runtime, CI workflows, deployment and operations docs | CI-equivalent checks, image build when Docker is available, migration/health smoke test | Planned |

## Working rules

1. Implement one phase or small vertical slice at a time.
2. For each slice, state its behavior and a focused check before editing; run that check immediately after the first substantive edit.
3. Do not report a feature as working until its relevant automated checks have passed. Report unavailable tooling and failed checks plainly.
4. Keep configuration and secrets out of source control. Commit only safe examples such as `.env.example` with placeholders.
5. Do not deploy or create hosting accounts as part of local implementation.
6. Keep beginner-facing setup steps in Windows PowerShell, and explain important architecture and security choices in concise terms.

## Current verification record

- Workspace inspection: empty directory; no existing Git repository.
- Tool check: Python 3.13.5, Node 22.18.0, npm 10.9.3, and Git 2.54.0 available; Docker unavailable in the current terminal.
- Full backend suite before Phase 3: 19 tests passed with no warnings using Python 3.13.5, FastAPI 0.143.3, SQLAlchemy 2.1.5, Alembic 1.20.0, and pytest 9.1.1.
- Persistence: the documented Alembic CLI upgraded fresh SQLite files, created all expected columns, and recorded revision `0001_create_incidents`; model/schema comparison reports no drift. PostgreSQL URL configuration is covered, but a live PostgreSQL integration test has not run.
- Session lifecycle: sessions close after each dependency scope; request exceptions explicitly roll back, verified by asserting the uncommitted row is absent from a separate session.
- Dependency checks: `pip check` reported no broken requirements. `pip-audit --local` initially found advisories in pip 25.1.1; upgrading the virtual-environment installer to pip 26.2.1 resulted in no known vulnerabilities.
- Incident API: create, list/filter, detail, partial update, resolution, validation, 404, and closed-incident conflict tests passed.
- Authentication: Argon2id hashes, opaque revocable sessions, closed public registration, CLI provisioning, no-store login responses, and server-enforced incident roles are implemented; final backend suite: 38 tests passed with no warnings.
- Account onboarding: login links users to the administrator; provisioning tests cover duplicate normalized emails and password bounds, while a public registration attempt requesting Admin remains 404 and creates no user.
- Frontend: React/TypeScript login, memory-only token state, API client, role-aware shell, dashboard, incident list/create/detail actions, 17 Vitest tests, lint, typecheck, and production build passed; npm audit reported no vulnerabilities.
- Final backend regression suite after frontend work: 38 tests passed.
- Local Vite development uses a configurable proxy. Production cross-origin hosting still requires same-origin integration or explicit backend CORS configuration; no deployment or browser/device smoke test was performed.
- Database readiness, audit events, and other roadmap features remain unimplemented.