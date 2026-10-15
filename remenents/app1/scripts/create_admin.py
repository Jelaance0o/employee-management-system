
from getpass import getpass

from sqlalchemy import func, select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import User, Workspace


def main():
    workspace_name = input("Company/workspace name: ").strip()
    admin_name = input("Administrator full name: ").strip()
    email = input("Administrator email: ").strip().lower()
    password = getpass("Administrator password (12+ characters): ")
    confirmation = getpass("Confirm password: ")

    if not workspace_name or not admin_name or "@" not in email:
        raise SystemExit("Please enter valid, non-empty details.")

    if len(password) < 12:
        raise SystemExit("Use a password with at least 12 characters.")

    if password != confirmation:
        raise SystemExit("Passwords do not match.")

    db = SessionLocal()

    try:
        existing_users = db.scalar(
            select(func.count()).select_from(User)
        )

        if existing_users:
            raise SystemExit(
                "Bootstrap stopped: users already exist. "
                "Do not use this script to create additional admins."
            )

        workspace = Workspace(
            name=workspace_name,
            slug="teamspace",
        )
        db.add(workspace)
        db.flush()

        admin = User(
            workspace_id=workspace.id,
            full_name=admin_name,
            email=email,
            password_hash=hash_password(password),
            role="admin",
            is_active=True,
        )
        db.add(admin)
        db.commit()

        print("Initial administrator and workspace created successfully.")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    main()
