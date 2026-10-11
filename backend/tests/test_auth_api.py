import pytest

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.base import Base
from app.models.user import User
from app.models.workspace import Workspace
from app.core.security import hash_password


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
        ],
    )

    try:
        yield TestingSessionLocal
    finally:
        Base.metadata.drop_all(
            bind=engine,
            tables=[
                User.__table__,
                Workspace.__table__,
            ],
        )
        engine.dispose()


@pytest.fixture
def test_user(test_database):
    with test_database() as db:
        workspace = Workspace(
            name="Test Workspace",
            slug="test-workspace",
        )
        db.add(workspace)
        db.flush()

        user = User(
            workspace_id=workspace.id,
            full_name="Test Admin",
            email="admin-test@example.com",
            password_hash=hash_password("TestPassword@123"),
            role="admin",
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        user_id = user.id

    return user_id


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


def test_login_success(client, test_user):
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "admin-test@example.com",
            "password": "TestPassword@123",
        },
    )

    assert response.status_code == 200
    assert response.json()["email"] == "admin-test@example.com"
    assert "password_hash" not in response.json()

    cookie_header = response.headers.get("set-cookie", "")
    assert "access_token=" in cookie_header
    assert "httponly" in cookie_header.lower()


def test_login_rejects_wrong_password(client, test_user):
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "admin-test@example.com",
            "password": "WrongPassword@123",
        },
    )

    assert response.status_code == 401


def test_me_requires_authentication(client):
    response = client.get("/api/v1/auth/me")

    assert response.status_code == 401


def test_me_rejects_invalid_token(client):
    client.cookies.set("access_token", "invalid-token")

    response = client.get("/api/v1/auth/me")

    assert response.status_code == 401


def test_me_returns_authenticated_user(client, test_user):
    login_response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "admin-test@example.com",
            "password": "TestPassword@123",
        },
    )

    assert login_response.status_code == 200

    response = client.get("/api/v1/auth/me")

    assert response.status_code == 200
    assert response.json()["id"] == test_user
    assert response.json()["role"] == "admin"


def test_logout_clears_authentication_cookie(client, test_user):
    login_response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "admin-test@example.com",
            "password": "TestPassword@123",
        },
    )

    assert login_response.status_code == 200

    logout_response = client.post("/api/v1/auth/logout")

    assert logout_response.status_code == 204, (
    f"Expected 204, got {logout_response.status_code}. "
    f"Response body: {logout_response.text!r}"
)

    response = client.get("/api/v1/auth/me")

    assert response.status_code == 401