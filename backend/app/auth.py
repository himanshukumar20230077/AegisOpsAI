from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AuthSession, User, UserRole
from app.security import hash_access_token, is_session_expired

bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class AuthenticatedPrincipal:
    user: User
    auth_session: AuthSession


def authentication_required() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="A valid bearer token is required",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_principal(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    session: Session = Depends(get_db),
) -> AuthenticatedPrincipal:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise authentication_required()

    token_hash = hash_access_token(credentials.credentials)
    auth_session = session.scalar(
        select(AuthSession).where(AuthSession.token_hash == token_hash)
    )
    if (
        auth_session is None
        or auth_session.revoked_at is not None
        or is_session_expired(auth_session.expires_at)
    ):
        raise authentication_required()

    user = session.get(User, auth_session.user_id)
    if user is None or not user.is_active:
        raise authentication_required()

    return AuthenticatedPrincipal(user=user, auth_session=auth_session)


def require_roles(*allowed_roles: UserRole) -> Callable[..., AuthenticatedPrincipal]:
    def check_role(
        principal: AuthenticatedPrincipal = Depends(get_current_principal),
    ) -> AuthenticatedPrincipal:
        if principal.user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your role does not have permission to perform this action",
            )
        return principal

    return check_role