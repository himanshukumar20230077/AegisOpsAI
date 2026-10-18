import os
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


def get_database_url() -> str:
    database_url = os.getenv("DATABASE_URL")
    environment = os.getenv("APP_ENV", "development").lower()

    if not database_url:
        if environment == "production":
            raise RuntimeError("DATABASE_URL must be configured in production")
        return "sqlite:///./aegisops.db"

    if environment == "production" and database_url.startswith("sqlite:"):
        raise RuntimeError("SQLite is not supported as the production database")

    if database_url.startswith(("postgres://", "postgresql://")):
        return database_url.replace("postgres://", "postgresql+psycopg://", 1).replace(
            "postgresql://", "postgresql+psycopg://", 1
        )

    return database_url


class Base(DeclarativeBase):
    pass


database_url = get_database_url()
engine_options: dict[str, object] = {"pool_pre_ping": True}
if database_url.startswith("sqlite:"):
    engine_options["connect_args"] = {"check_same_thread": False}

engine = create_engine(database_url, **engine_options)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    with SessionLocal() as session:
        try:
            yield session
        except Exception:
            session.rollback()
            raise