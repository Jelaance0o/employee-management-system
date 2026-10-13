
from urllib.parse import parse_qs, urlparse

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import hash_password
from app.db.session import get_db
from app.main import app
from app.models.base import Base
from app.models.invitation import Invitation
from app.models.user import User
from app.models.workspace import Workspace
from app.services.invitation_service import hash_invitation_token
from datetime import datetime, timedelta, timezone


@pytest.fixture
def test_database():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    TestingSessionLocal = sessionmaker(
        bind=engine,
        autoflush=False,
        expire_on_commit=False,
    )

    Base.metadata.create_all(
        bind=engine,
        tables=[
            Workspace.__table__,
            User.__table__,
            Invitation.__table__,
        ],
    )

    try:
        yield TestingSessionLocal
    finally:
        Base.metadata.drop_all(
            bind=engine,
            tables=[
                Invitation.__table__,
                User.__table__,
                Workspace.__table__,
            ],
        )
        engine.dispose()


@pytest.fixture
def test_admin(test_database):
    with test_database() as db:
        workspace = Workspace(
            name="Test Workspace",
            slug="test-workspace",
        )
        db.add(workspace)
        db.flush()

        admin = User(
            workspace_id=workspace.id,
            full_name="Test Admin",
            email="admin-test@example.com",
            password_hash=hash_password("TestPassword@123"),
            role="admin",
            is_active=True,
        )
        db.add(admin)
        db.commit()

        admin_id = admin.id

    return admin_id


@pytest.fixture
def client(test_database):
    def override_get_db():
        with test_database() as db:
            yield db

    app.dependency_overrides[get_db] = override_get_db

    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()


def login_admin(client):
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "admin-test@example.com",
            "password": "TestPassword@123",
        },
    )
    assert response.status_code == 200


def create_invitation(client, email="teammate@example.com", role="employee"):
    response = client.post(
        "/api/v1/invitations",
        json={
            "email": email,
            "role": role,
        },
    )

    assert response.status_code == 201, response.text

    invitation_url = response.json()["invitation_url"]
    token = parse_qs(urlparse(invitation_url).query)["token"][0]

    return response, token


def test_invitation_creation_requires_authentication(client):
    response = client.post(
        "/api/v1/invitations",
        json={
            "email": "teammate@example.com",
            "role": "employee",
        },
    )

    assert response.status_code == 401


def test_admin_can_create_invitation_and_token_is_hashed(
    client,
    test_admin,
    test_database,
):
    login_admin(client)

    response, token = create_invitation(
        client,
        email="new-teammate@example.com",
        role="employee",
    )

    assert response.json()["email"] == "new-teammate@example.com"
    assert response.json()["role"] == "employee"
    assert token
    assert token != hash_invitation_token(token)

    with test_database() as db:
        invitation = db.scalar(
            select(Invitation).where(
                Invitation.token_hash == hash_invitation_token(token)
            )
        )

        assert invitation is not None
        assert invitation.email == "new-teammate@example.com"
        assert invitation.token_hash != token


def test_invitation_can_be_validated_and_accepted_only_once(
    client,
    test_admin,
):
    login_admin(client)

    _, token = create_invitation(
        client,
        email="accepted-teammate@example.com",
        role="project_manager",
    )

    validation_response = client.get(
        "/api/v1/invitations/validate",
        params={"token": token},
    )

    assert validation_response.status_code == 200
    assert validation_response.json()["valid"] is True
    assert validation_response.json()["email"] == "accepted-teammate@example.com"
    assert validation_response.json()["role"] == "project_manager"

    acceptance_payload = {
        "token": token,
        "full_name": "Accepted Teammate",
        "password": "StrongPass@123",
    }

    acceptance_response = client.post(
        "/api/v1/invitations/accept",
        json=acceptance_payload,
    )

    assert acceptance_response.status_code == 201
    assert acceptance_response.json()["email"] == "accepted-teammate@example.com"
    assert acceptance_response.json()["role"] == "project_manager"
    assert "password_hash" not in acceptance_response.json()

    repeated_response = client.post(
        "/api/v1/invitations/accept",
        json=acceptance_payload,
    )

    assert repeated_response.status_code == 400


def test_invalid_invitation_token_is_rejected(client):
    invalid_token = "x" * 43

    validation_response = client.get(
        "/api/v1/invitations/validate",
        params={"token": invalid_token},
    )

    assert validation_response.status_code == 400

    acceptance_response = client.post(
        "/api/v1/invitations/accept",
        json={
            "token": invalid_token,
            "full_name": "Test Teammate",
            "password": "StrongPass@123",
        },
    )

    assert acceptance_response.status_code == 400


def test_admin_role_cannot_be_assigned_through_invitation(
    client,
    test_admin,
):
    login_admin(client)

    response = client.post(
        "/api/v1/invitations",
        json={
            "email": "another-admin@example.com",
            "role": "admin",
        },
    )

    # The service explicitly disallows invitations with the admin role.
    assert response.status_code == 409


def test_expired_invitation_is_rejected(
    client,
    test_admin,
    test_database,
):
    from app.models.invitation import Invitation

    raw_token = "expired-invitation-token-for-testing-123456"
    now = datetime.now(timezone.utc)

    with test_database() as db:
        admin = db.get(User, test_admin)

        invitation = Invitation(
            workspace_id=admin.workspace_id,
            invited_by_id=admin.id,
            email="expired-teammate@example.com",
            role="employee",
            token_hash=hash_invitation_token(raw_token),
            expires_at=now - timedelta(hours=1),
        )
        db.add(invitation)
        db.commit()

    response = client.get(
        "/api/v1/invitations/validate",
        params={"token": raw_token},
    )

    assert response.status_code == 400
    assert "expired" in response.json()["detail"].lower()


def test_revoked_invitation_is_rejected(
    client,
    test_admin,
    test_database,
):
    from app.models.invitation import Invitation

    raw_token = "revoked-invitation-token-for-testing-123456"
    now = datetime.now(timezone.utc)

    with test_database() as db:
        admin = db.get(User, test_admin)

        invitation = Invitation(
            workspace_id=admin.workspace_id,
            invited_by_id=admin.id,
            email="revoked-teammate@example.com",
            role="employee",
            token_hash=hash_invitation_token(raw_token),
            expires_at=now + timedelta(hours=12),
            revoked_at=now,
        )
        db.add(invitation)
        db.commit()

    response = client.get(
        "/api/v1/invitations/validate",
        params={"token": raw_token},
    )

    assert response.status_code == 400
    assert "revoked" in response.json()["detail"].lower()
