# AegisOps AI

A portfolio project for enterprise IT incident management. The architecture and delivery approach are documented in [architecture.md](architecture.md), [implementation_plan.md](implementation_plan.md), [deployment_plan.md](deployment_plan.md), and [requirements_traceability.md](requirements_traceability.md).

## Project status

This project is being implemented in tested phases. Only behavior covered by completed checks is described as implemented. Nothing has been deployed.

## Backend quick start (Windows PowerShell)

Python 3.12 or newer is required. From the repository root:

```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -e "backend[dev]"
Push-Location backend
python -m alembic upgrade head
python -m pytest
Pop-Location
```

If PowerShell blocks activation, use `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` in that terminal, then activate the environment again. This changes policy only for the current PowerShell process.

To start the API locally after installing dependencies and applying the migration, run these commands from the repository root:

```powershell
Push-Location backend
python -m alembic upgrade head
python -m uvicorn app.main:app --reload
```

For local development, the API defaults to `sqlite:///./aegisops.db` relative to the `backend` directory. Set `DATABASE_URL` in the process environment to use PostgreSQL. `APP_ENV=production` requires `DATABASE_URL` and rejects SQLite. Never put real credentials in source control.

Backend tests use an isolated in-memory SQLite database, and an automated test applies the Alembic migration to a temporary SQLite database. PostgreSQL URL normalization is tested, but a live PostgreSQL service has not yet been used for integration testing.

The API exposes liveness at `http://127.0.0.1:8000/health/live`. The endpoint reports that the process is running; database readiness is not implied by liveness.

## Frontend

The React application has not been scaffolded yet. Its setup and commands will be added when that implementation phase begins.