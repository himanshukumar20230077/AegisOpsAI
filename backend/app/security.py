import os
from datetime import UTC, datetime, timedelta
from hashlib import sha256
from secrets import token_urlsafe

from pydantic import EmailStr, TypeAdapter
from pwdlib import PasswordHash

from app.models import User

PASSWORD_MIN_LENGTH = 14
PASSWORD_MAX_LENGTH = 1024
password_hasher = PasswordHash.recommended()
dummy_password_hash = password_hasher.hash(token_urlsafe(32))
email_adapter = TypeAdapter(EmailStr)


def normalize_email(email: str) -> str:
    return str(email_adapter.validate_python(email.strip())).casefold()


def hash_password(password: str) -> str:
    if not PASSWORD_MIN_LENGTH <= len(password) <= PASSWORD_MAX_LENGTH:
        raise ValueError(
            f"Password must be between {PASSWORD_MIN_LENGTH} and "
            f"{PASSWORD_MAX_LENGTH} characters"
        )
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return password_hasher.verify(password, password_hash)
    except (ValueError, TypeError):
        return False


def verify_unknown_user_password(password: str) -> None:
    password_hasher.verify(password, dummy_password_hash)


def create_access_token() -> str:
    return token_urlsafe(32)


def hash_access_token(token: str) -> str:
    return sha256(token.encode("utf-8")).hexdigest()


def get_session_expiry(now: datetime | None = None) -> datetime:
    raw_ttl = os.getenv("AUTH_SESSION_TTL_MINUTES", "480")
    try:
        ttl_minutes = int(raw_ttl)
    except ValueError as error:
        raise RuntimeError("AUTH_SESSION_TTL_MINUTES must be an integer") from error

    if not 5 <= ttl_minutes <= 1440:
        raise RuntimeError("AUTH_SESSION_TTL_MINUTES must be between 5 and 1440")

    return (now or datetime.now(UTC)) + timedelta(minutes=ttl_minutes)


def is_session_expired(expires_at: datetime, now: datetime | None = None) -> bool:
    current_time = now or datetime.now(UTC)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)
    return expires_at <= current_time


def is_active_user(user: User) -> bool:
    return user.is_active