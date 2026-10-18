# AegisOps AI Deployment Plan

## Status

Deployment proposal only. Nothing has been deployed, and no hosting provider or account has been selected.

## Target topology

- One web service runs a production FastAPI process and serves the built React static files from the same origin.
- One separately managed PostgreSQL database stores application data.
- GitHub Actions runs checks on pull requests and the default branch. A deployment workflow may be added only after a provider is chosen and credentials are configured outside the repository.
- Alembic migrations run once as a controlled release action before new application code depends on the schema.

## Release path

1. Run backend tests, frontend tests, formatting/lint and type checks in GitHub Actions.
2. Build the frontend assets and production container; scan dependencies and image where practical.
3. Provision PostgreSQL, TLS connection settings, backups, and application secrets in the chosen platform.
4. Apply a reviewed Alembic migration as a single release step.
5. Deploy the immutable image and verify liveness, readiness, login, and a basic incident workflow using non-production data.
6. Monitor errors and resource use; document rollback and database restore procedures.

## Configuration and security

Expected runtime settings include an environment-specific database URL, signing key, allowed origins if needed, AI-provider selection and credentials if enabled, and log level. Only non-secret defaults belong in code. Provide a placeholder `.env.example`; ignore real `.env` files. Require strong unique production secrets and rotate them through the provider's secret manager.

Run as a non-root user. Terminate public HTTPS at the platform ingress, enforce secure cookie/token transport assumptions, configure request/body limits and health-check timeouts, and avoid exposing database or provider diagnostics publicly. Keep AI disabled unless a provider is deliberately configured and reviewed.

## Free-tier considerations

Free plans are useful for a portfolio demonstration but may sleep, cap connections/storage, remove data, lack backups, restrict regions, or change pricing. Verify current provider terms and PostgreSQL compatibility at deployment time. Keep the container and database connection configuration portable so a paid tier or another vendor is feasible. Do not promise continuous availability from a free tier.

## Items requiring a later user decision

- Hosting provider and region, after comparing current free/paid limits and data location.
- Managed PostgreSQL provider and backup/retention tier.
- Whether a real AI provider is desired, plus its privacy and cost implications.
- Public demo versus private portfolio access and the appropriate account-provisioning approach.

These choices do not block local implementation. No account creation, secret entry, or deployment is part of the current work.