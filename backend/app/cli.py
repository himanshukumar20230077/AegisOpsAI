import argparse
from getpass import getpass

from app.database import SessionLocal
from app.models import UserRole
from app.provisioning import provision_user
from app.security import PASSWORD_MIN_LENGTH


def main() -> int:
    parser = argparse.ArgumentParser(description="Manage AegisOps AI users")
    commands = parser.add_subparsers(dest="command", required=True)
    create_user = commands.add_parser(
        "create-user", help="Provision a user without opening public registration"
    )
    create_user.add_argument("--email", required=True)
    create_user.add_argument("--name", required=True)
    create_user.add_argument(
        "--role",
        choices=[role.value for role in UserRole],
        default=UserRole.ADMIN.value,
    )
    arguments = parser.parse_args()

    password = getpass("New password: ")
    confirmation = getpass("Confirm password: ")
    if password != confirmation:
        parser.error("Passwords do not match")
    if len(password) < PASSWORD_MIN_LENGTH:
        parser.error(f"Password must be at least {PASSWORD_MIN_LENGTH} characters")

    try:
        with SessionLocal() as session:
            user = provision_user(
                session,
                email=arguments.email,
                display_name=arguments.name,
                role=UserRole(arguments.role),
                password=password,
            )
    except ValueError as error:
        parser.error(str(error))

    print(f"Created {user.role.value} user {user.email} (id={user.id}).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())