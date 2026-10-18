from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import AuthenticatedPrincipal, get_current_principal
from app.database import get_db
from app.models import AuthSession, User
from app.schemas import AuthLogin, AuthToken, UserRead
from app.security import (
    create_access_token,
    get_session_expiry,
    hash_access_token,
    is_active_user,
    normalize_email,
    verify_password,
    verify_unknown_user_password,
)

router = APIRouter(prefix="/api/v1/auth", tags=["authentication"])


def invalid_credentials() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password",
        headers={"WWW-Authenticate": "Bearer"},
    )


@router.post("/login", response_model=AuthToken)
def login(
    credentials: AuthLogin,
    response: Response,
    session: Session = Depends(get_db),
) -> AuthToken:
    normalized_email = normalize_email(str(credentials.email))
    user = session.scalar(select(User).where(User.email == normalized_email))
    password = credentials.password.get_secret_value()

    if user is None:
        verify_unknown_user_password(password)
        raise invalid_credentials()
    password_is_valid = verify_password(password, user.password_hash)
    if not is_active_user(user) or not password_is_valid:
        raise invalid_credentials()

    token = create_access_token()
    expires_at = get_session_expiry()
    auth_session = AuthSession(
        user_id=user.id,
        token_hash=hash_access_token(token),
        expires_at=expires_at,
    )
    session.add(auth_session)
    session.commit()

    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"
    expires_in = int((expires_at - datetime.now(UTC)).total_seconds())
    return AuthToken(access_token=token, expires_in=expires_in)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    principal: AuthenticatedPrincipal = Depends(get_current_principal),
    session: Session = Depends(get_db),
) -> Response:
    principal.auth_session.revoked_at = datetime.now(UTC)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=UserRead)
def read_current_user(
    principal: AuthenticatedPrincipal = Depends(get_current_principal),
) -> User:
    return principal.user