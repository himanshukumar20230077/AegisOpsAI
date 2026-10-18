from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import User, UserRole
from app.security import hash_password, normalize_email


def provision_user(
    session: Session,
    email: str,
    display_name: str,
    role: UserRole,
    password: str,
) -> User:
    normalized_email = normalize_email(email)
    cleaned_name = display_name.strip()
    if not 1 <= len(cleaned_name) <= 120:
        raise ValueError("Display name must be between 1 and 120 characters")

    existing_user = session.scalar(select(User).where(User.email == normalized_email))
    if existing_user is not None:
        raise ValueError("A user with that email already exists")

    user = User(
        email=normalized_email,
        display_name=cleaned_name,
        password_hash=hash_password(password),
        role=role,
        is_active=True,
    )
    session.add(user)
    try:
        session.commit()
    except IntegrityError as error:
        session.rollback()
        raise ValueError("A user with that email already exists") from error
    session.refresh(user)
    return user