# AegisOps AI Architecture

## Status

Architecture with the incident API, authentication, and React dashboard implemented and tested locally; PostgreSQL integration and deployment remain unverified.

## Goals and boundaries

AegisOps AI is a portfolio-grade incident-management application for a single organization. It should demonstrate reliable API and UI design, relational data modeling, access control, auditability, automated checks, and a practical deployment path. It is not intended to replace a mature IT service-management platform or provide emergency response.

## Proposed architecture

Use a modular monolith: one FastAPI application owns business rules and the REST API, and a React + TypeScript application provides the browser UI. In production, build the UI into static assets and have FastAPI serve them from the same web service. Keep PostgreSQL as a separate managed service. This meets the preference for a single application service without coupling the application to a hosting vendor.

```text
Browser
  | HTTPS, same-origin UI and /api/v1 requests
  v
FastAPI web service
  |-- API routers -> validation -> authorization -> service layer
  |-- SQLAlchemy 2.x -> PostgreSQL
  |-- optional AI provider adapter; deterministic local fallback
  |-- /health/live and /health/ready
  `-- built React static assets (production)

GitHub Actions: lint/type checks + tests + build
Alembic: versioned database schema migrations
```

## Technology choices

- **Frontend:** React, TypeScript, Vite, React Router, and a small typed API client. Use Vitest and React Testing Library for component and behavior tests; use Playwright for a small end-to-end smoke test if its browser dependencies can be installed in CI.
- **Backend:** Python, FastAPI, Pydantic v2, SQLAlchemy 2.x, and Alembic. Use pytest and HTTPX for API tests. Keep HTTP routing thin and place business decisions in explicit service functions.
- **Database:** PostgreSQL in production. Use migrations for every schema change. Tests may use SQLite for fast isolated checks only when behavior is portable; use PostgreSQL service containers in CI for database-specific integration coverage.
- **Authentication:** Argon2id password hashes and short-lived opaque bearer tokens. Store only token digests in revocable database sessions; serve login/logout/current-user endpoints and enforce `Admin`, `Support Engineer`, and `Viewer` permissions in the API. No token signing secret is required. Keep database credentials in environment configuration, never source control.
- **AI assistance:** A provider interface behind a feature setting. AI output is advisory, never silently changes incident state or assignments. The deterministic fallback is explicitly labelled as rule-based, returns its rationale, and does not pretend to be an AI result. Suggestions must cite incident fields or supplied evidence; unsupported claims are rejected or shown as unknown. Do not send secrets or unnecessary personal data to a provider.
- **Operations:** JSON logs without credentials or raw tokens, structured error responses, request validation, audit events for security-sensitive and incident-changing actions, readiness/liveness health endpoints, Docker multi-stage build, non-root runtime, and GitHub Actions CI.

## Initial domain model

- **User:** unique normalized email, display name, password hash, role, enabled flag, timestamps.
- **AuthSession:** user reference, token digest, creation/expiry/revocation timestamps. Never persist the bearer token itself.
- **Incident:** stable ID, title, description, priority, status, category, reporter, optional assignee, timestamps, and resolution details.
- **AuditEvent:** actor (nullable for system events), action, target type/ID, timestamp, and carefully limited structured metadata. Never store passwords, tokens, or full sensitive evidence in audit metadata.
- **Evidence:** initially incident-linked text or references with source and timestamp. Define size, type, retention, and access rules before supporting uploads.

Use UTC timestamps, database constraints for invariants, pagination for list endpoints, and explicit allowed status transitions. Analytics and search must query persisted records, apply the caller's authorization scope, and use bounded date ranges and result sizes.

## Security and reliability controls

- Enforce authentication and role authorization in the API, not only in the UI.
- Hash passwords with a maintained Argon2 implementation; compare secrets safely and use generic login errors.
- Validate and normalize user input; constrain pagination, filters, and evidence sizes.
- Use SQLAlchemy parameter binding, transaction boundaries, foreign keys, and Alembic migrations.
- Restrict CORS to configured origins when cross-origin access is needed; production same-origin hosting avoids broad CORS.
- Separate liveness from readiness; readiness checks database connectivity with a short timeout and must not disclose connection details.
- Avoid logging request bodies, credentials, and AI-provider secrets. Add audit writes in the same transaction as the action where practical.
- Apply least privilege to roles and make initial administrator provisioning an explicit, documented operation rather than a committed default credential.
- AI prompts and outputs are untrusted. Treat incident text as data, constrain provider output to a schema, show source-grounded citations, and do not execute recommendations.

## Deployment shape

Build the frontend and backend into one production image with a non-root runtime user, run FastAPI behind the platform's HTTPS ingress, and connect to a separate managed PostgreSQL database using TLS where supported. Apply Alembic migrations as an explicit release step, not concurrently in every web worker. Keep secrets in the hosting provider's secret manager. Configure backups, restore testing, resource limits, logs, and a health-check path before calling the deployment production-ready.

Free tiers are an experiment, not an architectural guarantee. Provider quotas, sleep behavior, database limits, egress, region compatibility, and pricing can change; confirm current terms before selecting a vendor. No provider or account action is assumed in this proposal.

## Key risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Role checks implemented only in React | Central API dependencies and negative authorization tests for every protected role boundary. |
| Lost or inconsistent audit history | Transactional audit writes, database constraints, and tests covering failed and successful mutations. |
| AI makes unsupported or unsafe recommendations | Optional adapter, grounded inputs and citations, schema validation, visible provenance, and deterministic labelled fallback. |
| Schema drift between environments | Alembic-only schema evolution and migration checks against PostgreSQL in CI. |
| SQLite tests hide PostgreSQL behavior | PostgreSQL-backed integration tests in CI for migrations, constraints, and queries. |
| Single service becomes difficult to operate | Keep module boundaries clear; extract components only when real operational needs justify it. |
| Free hosting becomes unavailable or costly | Vendor-neutral Docker image and environment configuration; document non-free fallbacks and data export. |
| Sensitive incident evidence leaks | Defer uploads until access, size, retention, malware scanning, and storage rules are defined; minimize logs and provider payloads. |

## Architecture decision record

**Decision:** Start with a modular monolith and same-origin static frontend/API deployment.

**Reason:** It keeps the portfolio understandable and inexpensive to operate while allowing independent modules, migrations, tests, and future extraction. A separate frontend host and microservices would add network and deployment complexity without an established need.

**Revisit when:** independent scaling, separate team ownership, provider-specific compliance, or measured operational constraints require a different boundary.