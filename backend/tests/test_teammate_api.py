
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
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.task import Task
from app.models.user import User
from app.models.workspace import Workspace


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

    Base.metadata.create_all(bind=engine)

    try:
        yield TestingSessionLocal
    finally:
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


@pytest.fixture
def team(test_database):
    with test_database() as db:
        workspace = Workspace(name="Team One", slug="team-one")
        other_workspace = Workspace(name="Team Two", slug="team-two")
        db.add_all([workspace, other_workspace])
        db.flush()

        admin = User(
            workspace_id=workspace.id,
            full_name="Workspace Admin",
            email="admin@team-one.example",
            password_hash=hash_password("AdminPass@123"),
            role="admin",
            is_active=True,
        )

        employee = User(
            workspace_id=workspace.id,
            full_name="Team Employee",
            email="employee@team-one.example",
            password_hash=hash_password("EmployeePass@123"),
            role="employee",
            is_active=True,
        )

        other_admin = User(
            workspace_id=other_workspace.id,
            full_name="Other Admin",
            email="admin@team-two.example",
            password_hash=hash_password("OtherPass@123"),
            role="admin",
            is_active=True,
        )

        db.add_all([admin, employee, other_admin])
        db.commit()

        result = {
            "admin_id": admin.id,
            "employee_id": employee.id,
            "other_admin_id": other_admin.id,
            "workspace_id": workspace.id,
            "other_workspace_id": other_workspace.id,
        }

    return result


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


def login(client, email, password):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200, response.text


def test_admin_can_list_teammates(client, team):
    login(client, "admin@team-one.example", "AdminPass@123")

    response = client.get("/api/v1/teammates")

    assert response.status_code == 200, response.text
    emails = {user["email"] for user in response.json()}
    assert "admin@team-one.example" in emails
    assert "employee@team-one.example" in emails
    assert "admin@team-two.example" not in emails


def test_employee_cannot_list_teammates(client, team):
    login(client, "employee@team-one.example", "EmployeePass@123")

    response = client.get("/api/v1/teammates")

    assert response.status_code == 403


def test_admin_cannot_view_teammate_from_another_workspace(client, team):
    login(client, "admin@team-one.example", "AdminPass@123")

    response = client.get(
        f"/api/v1/teammates/{team['other_admin_id']}"
    )

    assert response.status_code == 404


def test_admin_can_update_teammate_role(client, team):
    login(client, "admin@team-one.example", "AdminPass@123")

    response = client.patch(
        f"/api/v1/teammates/{team['employee_id']}/role",
        json={"role": "project_manager"},
    )

    assert response.status_code == 200, response.text
    assert response.json()["role"] == "project_manager"


def test_invalid_role_is_rejected(client, team):
    login(client, "admin@team-one.example", "AdminPass@123")

    response = client.patch(
        f"/api/v1/teammates/{team['employee_id']}/role",
        json={"role": "superuser"},
    )

    assert response.status_code == 422


def test_admin_cannot_change_own_role(client, team):
    login(client, "admin@team-one.example", "AdminPass@123")

    response = client.patch(
        f"/api/v1/teammates/{team['admin_id']}/role",
        json={"role": "employee"},
    )

    assert response.status_code == 400


def test_admin_cannot_deactivate_own_account(client, team):
    login(client, "admin@team-one.example", "AdminPass@123")

    response = client.patch(
        f"/api/v1/teammates/{team['admin_id']}/deactivate"
    )

    assert response.status_code == 400


def test_admin_can_deactivate_employee(client, team):
    login(client, "admin@team-one.example", "AdminPass@123")

    response = client.patch(
        f"/api/v1/teammates/{team['employee_id']}/deactivate"
    )

    assert response.status_code == 200, response.text
    assert response.json()["is_active"] is False


def test_last_active_admin_cannot_be_demoted(client, team):
    login(client, "admin@team-one.example", "AdminPass@123")

    response = client.patch(
        f"/api/v1/teammates/{team['admin_id']}/role",
        json={"role": "employee"},
    )

    assert response.status_code == 400


def test_admin_can_view_teammate_work_details(client, team, test_database):
    with test_database() as db:
        admin = db.get(User, team["admin_id"])
        employee = db.get(User, team["employee_id"])
        project = Project(
            workspace_id=team["workspace_id"],
            name="Website Refresh",
            description="Refresh the company website",
            status="active",
            priority="high",
            created_by_id=admin.id,
            project_manager_id=admin.id,
        )
        db.add(project)
        db.flush()
        db.add(ProjectMember(project_id=project.id, user_id=employee.id, added_by_id=admin.id))
        task = Task(
            workspace_id=team["workspace_id"],
            project_id=project.id,
            title="Build responsive header",
            status="In Progress",
            priority="high",
            created_by_id=admin.id,
            assigned_to_id=employee.id,
        )
        db.add(task)
        db.commit()
        employee_id = employee.id

    login(client, "admin@team-one.example", "AdminPass@123")
    response = client.get(f"/api/v1/teammates/{employee_id}/details")

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["full_name"] == "Team Employee"
    assert body["task_stats"]["total"] == 1
    assert body["task_stats"]["pending"] == 1
    assert body["projects"][0]["name"] == "Website Refresh"
    assert body["recent_tasks"][0]["title"] == "Build responsive header"


def test_admin_cannot_view_details_from_another_workspace(client, team):
    login(client, "admin@team-one.example", "AdminPass@123")
    response = client.get(f"/api/v1/teammates/{team['other_admin_id']}/details")
    assert response.status_code == 404
