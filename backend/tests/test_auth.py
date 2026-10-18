from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from hashlib import sha256
import sys

import pytest
from httpx import Response
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from app.models import AuthSession, User, UserRole
from app.provisioning import provision_user
from app.security import verify_password
from app import cli
from tests.conftest import TEST_SUPPORT_EMAIL, TEST_SUPPORT_PASSWORD


def _login(
    api_client: Callable[..., Response], email: str, password: str
) -> str:
    response = api_client(
        "POST",
        "/api/v1/auth/login",
        authenticated=False,
        json={"email": email, "password": password},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def _auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_valid_login_stores_only_password_and_token_hashes(
    api_client: Callable[..., Response],
    testing_session_factory: sessionmaker[Session],
) -> None:
    response = api_client(
        "POST",
        "/api/v1/auth/login",
        authenticated=False,
        json={"email": TEST_SUPPORT_EMAIL.upper(), "password": TEST_SUPPORT_PASSWORD},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["token_type"] == "bearer"
    assert payload["expires_in"] > 0
    assert response.headers["cache-control"] == "no-store"
    access_token = payload["access_token"]
    token_hash = sha256(access_token.encode()).hexdigest()

    with testing_session_factory() as session:
        auth_session = session.scalar(
            select(AuthSession).where(AuthSession.token_hash == token_hash)
        )
        assert auth_session is not None
        assert auth_session.token_hash == token_hash
        assert auth_session.token_hash != access_token

        user = session.scalar(select(User).where(User.id == auth_session.user_id))
        assert user is not None
        assert user.password_hash != TEST_SUPPORT_PASSWORD
        assert user.password_hash.startswith("$argon2")
        assert verify_password(TEST_SUPPORT_PASSWORD, user.password_hash)


@pytest.mark.parametrize(
    "email,password",
    [
        (TEST_SUPPORT_EMAIL, "Incorrect Password 2026!"),
        ("unknown@example.com", "Unknown User Password 2026!"),
    ],
)
def test_invalid_login_uses_generic_response(
    api_client: Callable[..., Response], email: str, password: str
) -> None:
    response = api_client(
        "POST",
        "/api/v1/auth/login",
        authenticated=False,
        json={"email": email, "password": password},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"
    assert response.headers["www-authenticate"] == "Bearer"


def test_inactive_user_cannot_log_in_with_generic_error(
    api_client: Callable[..., Response],
    create_test_user: Callable[..., int],
    testing_session_factory: sessionmaker[Session],
) -> None:
    user_id = create_test_user(
        "inactive@example.com", password="Inactive Account Password 2026!"
    )
    with testing_session_factory() as session:
        user = session.get(User, user_id)
        assert user is not None
        user.is_active = False
        session.commit()

    response = api_client(
        "POST",
        "/api/v1/auth/login",
        authenticated=False,
        json={
            "email": "inactive@example.com",
            "password": "Inactive Account Password 2026!",
        },
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"


@pytest.mark.parametrize(
    "method,path,payload",
    [
        ("GET", "/api/v1/incidents", None),
        (
            "POST",
            "/api/v1/incidents",
            {
                "title": "Unauthorized incident",
                "description": "This request has no bearer token.",
                "severity": "Low",
                "category": "Test",
            },
        ),
        ("GET", "/api/v1/incidents/1", None),
        ("PATCH", "/api/v1/incidents/1", {"title": "Unauthorized update"}),
        ("POST", "/api/v1/incidents/1/resolve", None),
    ],
)
def test_incident_routes_require_authentication(
    api_client: Callable[..., Response],
    method: str,
    path: str,
    payload: dict[str, str] | None,
) -> None:
    kwargs = {"json": payload} if payload is not None else {}
    response = api_client(method, path, authenticated=False, **kwargs)

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_viewer_can_read_but_cannot_change_incidents(
    api_client: Callable[..., Response],
    create_test_user: Callable[..., int],
) -> None:
    create_response = api_client(
        "POST",
        "/api/v1/incidents",
        json={
            "title": "Viewer permissions check",
            "description": "A viewer may read this record.",
            "severity": "Medium",
            "category": "Authorization",
        },
    )
    incident_id = create_response.json()["id"]
    create_test_user("viewer@example.com", UserRole.VIEWER)
    viewer_token = _login(api_client, "viewer@example.com", "Test User Password 2026!")
    headers = _auth_header(viewer_token)

    assert api_client("GET", "/api/v1/incidents", headers=headers).status_code == 200
    assert api_client(
        "GET", f"/api/v1/incidents/{incident_id}", headers=headers
    ).status_code == 200
    assert api_client(
        "POST",
        "/api/v1/incidents",
        headers=headers,
        json={
            "title": "Viewer cannot create",
            "description": "This should be forbidden.",
            "severity": "Low",
            "category": "Authorization",
        },
    ).status_code == 403
    assert api_client(
        "PATCH",
        f"/api/v1/incidents/{incident_id}",
        headers=headers,
        json={"title": "Viewer cannot update"},
    ).status_code == 403
    assert api_client(
        "POST", f"/api/v1/incidents/{incident_id}/resolve", headers=headers
    ).status_code == 403


@pytest.mark.parametrize("role", [UserRole.ADMIN, UserRole.SUPPORT_ENGINEER])
def test_admin_and_support_engineer_can_manage_incidents(
    api_client: Callable[..., Response],
    create_test_user: Callable[..., int],
    role: UserRole,
) -> None:
    email = f"{role.name.lower().replace('_', '-')}@example.com"
    create_test_user(email, role)
    token = _login(api_client, email, "Test User Password 2026!")
    headers = _auth_header(token)

    create_response = api_client(
        "POST",
        "/api/v1/incidents",
        headers=headers,
        json={
            "title": f"{role.value} create permission",
            "description": "This role can manage incidents.",
            "severity": "High",
            "category": "Authorization",
        },
    )
    assert create_response.status_code == 201
    incident_id = create_response.json()["id"]
    assert api_client(
        "PATCH",
        f"/api/v1/incidents/{incident_id}",
        headers=headers,
        json={"status": "In Progress"},
    ).status_code == 200
    assert api_client(
        "POST", f"/api/v1/incidents/{incident_id}/resolve", headers=headers
    ).status_code == 200


def test_logout_revokes_bearer_token(
    api_client: Callable[..., Response],
) -> None:
    token = _login(api_client, TEST_SUPPORT_EMAIL, TEST_SUPPORT_PASSWORD)
    headers = _auth_header(token)

    logout_response = api_client(
        "POST", "/api/v1/auth/logout", authenticated=False, headers=headers
    )

    assert logout_response.status_code == 204
    assert api_client(
        "GET", "/api/v1/auth/me", authenticated=False, headers=headers
    ).status_code == 401


def test_expired_session_is_rejected(
    api_client: Callable[..., Response],
    testing_session_factory: sessionmaker[Session],
) -> None:
    token = _login(api_client, TEST_SUPPORT_EMAIL, TEST_SUPPORT_PASSWORD)
    token_hash = sha256(token.encode()).hexdigest()
    with testing_session_factory() as session:
        auth_session = session.scalar(
            select(AuthSession).where(AuthSession.token_hash == token_hash)
        )
        assert auth_session is not None
        auth_session.expires_at = datetime.now(UTC) - timedelta(minutes=1)
        session.commit()

    response = api_client(
        "GET", "/api/v1/auth/me", authenticated=False, headers=_auth_header(token)
    )

    assert response.status_code == 401


def test_public_registration_is_not_available(
    api_client: Callable[..., Response],
    testing_session_factory: sessionmaker[Session],
) -> None:
    response = api_client(
        "POST",
        "/api/v1/auth/register",
        authenticated=False,
        json={
            "email": "self-register@example.com",
            "password": "Self Register Password 2026!",
            "role": "Admin",
        },
    )

    assert response.status_code == 404
    with testing_session_factory() as session:
        assert session.scalar(
            select(User).where(User.email == "self-register@example.com")
        ) is None


def test_provisioning_rejects_duplicate_email(
    testing_session_factory: sessionmaker[Session],
) -> None:
    with testing_session_factory() as session:
        provision_user(
            session,
            email="duplicate@example.com",
            display_name="First Account",
            role=UserRole.VIEWER,
            password="First Account Password 2026!",
        )

        with pytest.raises(ValueError, match="A user with that email already exists"):
            provision_user(
                session,
                email="DUPLICATE@example.com",
                display_name="Duplicate Account",
                role=UserRole.ADMIN,
                password="Duplicate Account Password 2026!",
            )

        assert session.scalar(
            select(User).where(User.email == "duplicate@example.com")
        ).role == UserRole.VIEWER


@pytest.mark.parametrize(
    "password",
    ["short", "x" * 1025],
)
def test_provisioning_rejects_password_outside_allowed_length(
    testing_session_factory: sessionmaker[Session], password: str
) -> None:
    with testing_session_factory() as session:
        with pytest.raises(ValueError, match="Password must be between 14 and 1024 characters"):
            provision_user(
                session,
                email="invalid-password@example.com",
                display_name="Invalid Password",
                role=UserRole.ADMIN,
                password=password,
            )

        assert session.scalar(
            select(User).where(User.email == "invalid-password@example.com")
        ) is None


def test_provisioning_cli_creates_admin_without_plaintext_password(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
    testing_session_factory: sessionmaker[Session],
) -> None:
    password = "Bootstrap Admin Password 2026!"
    monkeypatch.setattr(
        sys,
        "argv",
        [
            "aegisops-ai",
            "create-user",
            "--email",
            "admin@example.com",
            "--name",
            "Initial Administrator",
            "--role",
            "Admin",
        ],
    )
    prompts: list[str] = []

    def hidden_password(prompt: str) -> str:
        prompts.append(prompt)
        return password

    monkeypatch.setattr(cli, "getpass", hidden_password)
    monkeypatch.setattr(cli, "SessionLocal", testing_session_factory)

    assert cli.main() == 0
    assert prompts == ["New password: ", "Confirm password: "]
    assert password not in capsys.readouterr().out

    with testing_session_factory() as session:
        user = session.scalar(select(User).where(User.email == "admin@example.com"))
        assert user is not None
        assert user.role == UserRole.ADMIN
        assert user.password_hash != password
        assert verify_password(password, user.password_hash)