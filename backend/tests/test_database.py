from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, func, inspect, select
from sqlalchemy.orm import sessionmaker

from app import database
from app.database import Base, get_database_url
from app.models import Incident, Severity


def test_development_defaults_to_sqlite(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setenv("APP_ENV", "development")

    assert get_database_url() == "sqlite:///./aegisops.db"


def test_production_requires_database_url(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setenv("APP_ENV", "production")

    with pytest.raises(RuntimeError, match="DATABASE_URL must be configured"):
        get_database_url()


def test_production_rejects_sqlite(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("DATABASE_URL", "sqlite:///./aegisops.db")

    with pytest.raises(RuntimeError, match="SQLite is not supported"):
        get_database_url()


@pytest.mark.parametrize(
    "database_url",
    [
        "postgres://user:password@localhost:5432/aegisops",
        "postgresql://user:password@localhost:5432/aegisops",
    ],
)
def test_postgres_urls_use_psycopg_driver(
    monkeypatch: pytest.MonkeyPatch, database_url: str
) -> None:
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("DATABASE_URL", database_url)

    assert get_database_url() == database_url.replace(
        "postgres://", "postgresql+psycopg://"
    ).replace("postgresql://", "postgresql+psycopg://")


def test_initial_migration_creates_incidents_table(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    database_url = f"sqlite:///{(tmp_path / 'migration.db').as_posix()}"
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("DATABASE_URL", database_url)

    backend_dir = Path(__file__).resolve().parents[1]
    config = Config(str(backend_dir / "alembic.ini"))
    config.set_main_option("script_location", str(backend_dir / "migrations"))
    command.upgrade(config, "head")

    engine = create_engine(database_url)
    try:
        inspector = inspect(engine)
        assert {"incidents", "users", "auth_sessions"}.issubset(
            inspector.get_table_names()
        )
        assert {
            "title",
            "description",
            "severity",
            "status",
            "category",
            "assignee",
            "created_at",
            "updated_at",
        }.issubset({column["name"] for column in inspector.get_columns("incidents")})
        assert {
            "email",
            "display_name",
            "password_hash",
            "role",
            "is_active",
        }.issubset({column["name"] for column in inspector.get_columns("users")})
        assert {
            "token_hash",
            "expires_at",
            "revoked_at",
        }.issubset(
            {column["name"] for column in inspector.get_columns("auth_sessions")}
        )
        assert inspector.get_foreign_keys("auth_sessions")[0]["referred_table"] == "users"
    finally:
        engine.dispose()


def test_database_dependency_rolls_back_when_request_fails(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    engine = create_engine(f"sqlite:///{(tmp_path / 'rollback.db').as_posix()}")
    Base.metadata.create_all(engine)
    testing_session = sessionmaker(bind=engine, expire_on_commit=False)
    monkeypatch.setattr(database, "SessionLocal", testing_session)

    dependency = database.get_db()
    session = next(dependency)
    session.add(
        Incident(
            title="Uncommitted incident",
            description="This change must be rolled back.",
            severity=Severity.LOW,
            category="Test",
        )
    )

    with pytest.raises(RuntimeError, match="request failed"):
        dependency.throw(RuntimeError("request failed"))

    with testing_session() as verification_session:
        incident_count = verification_session.scalar(
            select(func.count()).select_from(Incident)
        )

    assert incident_count == 0
    assert not session.in_transaction()
    engine.dispose()