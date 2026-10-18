import asyncio
from collections.abc import Callable, Generator
from pathlib import Path
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient, Response
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.models import UserRole
from app.main import app
from app.provisioning import provision_user

TEST_SUPPORT_EMAIL = "support@example.com"
TEST_SUPPORT_PASSWORD = "Support Test Password 2026!"

@pytest.fixture
def testing_session_factory() -> Generator[sessionmaker[Session], None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session = sessionmaker(bind=engine, expire_on_commit=False)
    Base.metadata.create_all(engine)
    yield testing_session
    engine.dispose()


@pytest.fixture
def create_test_user(
    testing_session_factory: sessionmaker[Session],
) -> Callable[..., int]:
    def create_user(
        email: str,
        role: UserRole = UserRole.SUPPORT_ENGINEER,
        password: str = "Test User Password 2026!",
        display_name: str = "Test User",
    ) -> int:
        with testing_session_factory() as session:
            user = provision_user(
                session,
                email=email,
                display_name=display_name,
                role=role,
                password=password,
            )
            return user.id

    return create_user


@pytest.fixture
def api_client(
    testing_session_factory: sessionmaker[Session],
) -> Generator[Callable[..., Response], None, None]:
    with testing_session_factory() as session:
        provision_user(
            session,
            email=TEST_SUPPORT_EMAIL,
            display_name="Default Support Engineer",
            role=UserRole.SUPPORT_ENGINEER,
            password=TEST_SUPPORT_PASSWORD,
        )

    def override_get_db() -> Generator[Session, None, None]:
        with testing_session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    def raw_request(method: str, path: str, **kwargs: Any) -> Response:
        async def send_request() -> Response:
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                return await client.request(method, path, **kwargs)

        return asyncio.run(send_request())

    login_response = raw_request(
        "POST",
        "/api/v1/auth/login",
        json={"email": TEST_SUPPORT_EMAIL, "password": TEST_SUPPORT_PASSWORD},
    )
    assert login_response.status_code == 200
    support_token = login_response.json()["access_token"]

    def request(
        method: str, path: str, *, authenticated: bool = True, **kwargs: Any
    ) -> Response:
        headers = dict(kwargs.pop("headers", {}))
        if authenticated:
            headers.setdefault("Authorization", f"Bearer {support_token}")
        return raw_request(method, path, headers=headers, **kwargs)

    try:
        yield request
    finally:
        app.dependency_overrides.clear()