# AegisOps AI Requirements Traceability

## Status

Initial traceability baseline. “Planned” means neither implemented nor verified. Update status only with evidence from implementation and tests.

| ID | Requirement | Planned implementation | Verification evidence | Status |
| --- | --- | --- | --- | --- |
| R-01 | Create incidents | SQLAlchemy model and validated API create endpoint | `tests/test_incidents.py::test_incident_create_list_read_update_and_resolve` passed | Complete for backend API |
| R-02 | Assign incidents | Optional assignee field supported on create and update | Assignment persistence assertions in incident workflow test passed | Complete for backend API; role enforcement remains future work |
| R-03 | Track status and resolve | Status enum, update endpoint, explicit resolve endpoint | Status update, resolution, and closed-incident conflict tests passed | Complete for current backend scope |
| R-04 | Search and filter | Bounded pagination and severity/status filters; text search remains planned | Severity filter and page limit tests passed | In progress |
| R-05 | Analytics use real records | Aggregation queries over persisted incident records | Tests compare aggregates against seeded database rows | Planned |
| R-06 | Authentication | Argon2id password hashing, opaque expiring bearer sessions, logout revocation, and local CLI provisioning only | Valid/invalid/inactive login, token-digest storage, CLI provisioning, duplicate email, password bounds, logout, expiry, and public Admin-registration rejection covered; backend suite 38 passed | Complete for local backend scope |
| R-07 | Server-enforced roles | FastAPI dependencies enforce Admin, Support Engineer, and Viewer permissions on incident routes | Unauthenticated requests and all three role permissions tested; full suite passed | Complete for current incident API |
| R-08 | Optional AI classification | Disabled-by-default provider adapter and validated response model | Provider-mocked classification tests; disabled-provider tests | Planned |
| R-09 | Evidence-grounded troubleshooting | Suggestions cite supplied incident/evidence sources; unsupported statements are rejected or marked unknown | Tests for cited support, missing evidence, prompt injection, and output schema | Planned |
| R-10 | Deterministic labelled fallback | Rule-based fallback with visible provenance and rationale | Repeated-input determinism and fallback-label tests | Planned |
| R-11 | Audit logging | Transaction-aware audit events for sensitive and incident-changing actions | Success, denial, rollback, and sensitive-data exclusion tests | Planned |
| R-12 | Input validation | Strict Pydantic schemas, field limits, enums, and bounded query parameters | Invalid payload, extra-field, empty-update, and limit tests passed | Complete for current endpoints |
| R-13 | Error handling | FastAPI 422 validation, useful 404 details, and 409 closed-resolution response | Invalid input, missing incident, and closed-incident tests passed | In progress; database-failure handling remains |
| R-14 | Health checks | Liveness and future database-backed readiness endpoints | Existing liveness regression test passes; readiness remains unimplemented | In progress |
| R-15 | Backend automated tests | pytest + HTTPX; PostgreSQL integration coverage in CI | Local backend suite: 19 passed, no warnings; live PostgreSQL/CI run remains | In progress |
| R-16 | Frontend automated tests | Vitest + React Testing Library for auth, API errors, incident list/create/detail, dashboard and role-aware UI | 17 frontend tests passed; lint and typecheck passed | Complete for current UI scope |
| R-17 | Responsive enterprise dashboard | React/TypeScript login, scoped metrics, incident list/detail/create workflows and mobile shell | Responsive styles and production build verified; browser/device visual smoke test remains | Complete for implemented UI scope |
| R-18 | Clear documentation | Setup, architecture, operations, security, and deployment guidance | PowerShell backend/frontend setup, auth provisioning, proxy configuration and API scope documented; deployment operations remain | In progress |
| R-19 | Deployable container configuration | Multi-stage build and non-root single-service runtime | Docker build and health/migration smoke test | Planned; Docker unavailable locally |
| R-20 | GitHub Actions automation | CI workflow for backend/frontend checks and builds | Workflow review and successful CI run | Planned |
| R-21 | Keep secrets out of source control | Environment-based configuration, `.env.example` placeholders, and ignored real `.env` | Example contains only local defaults; password input is hidden and tokens/passwords are not stored in plaintext | In progress |
| R-22 | Do not deploy during initial build | Deployment stays a documented future procedure | No provider resources or deployment actions created | In progress |

## Evidence policy

Link each completed requirement to a code location and a focused test or workflow result. A passing unit test alone does not establish production readiness. Record skipped checks, environment limitations, and known gaps instead of inferring success.