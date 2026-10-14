
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import hash_password
from app.db.session import get_db
from app.main import app
from app.models.base import Base
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

    tables = [
        Workspace.__table__,
        User.__table__,
        Project.__table__,
        ProjectMember.__table__,
        Task.__table__,
    ]

    Base.metadata.create_all(bind=engine, tables=tables)

    try:
        yield TestingSessionLocal
    finally:
        Base.metadata.drop_all(
            bind=engine,
            tables=list(reversed(tables)),
        )
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

        manager = User(
            workspace_id=workspace.id,
            full_name="Project Manager",
            email="manager@team-one.example",
            password_hash=hash_password("ManagerPass@123"),
            role="project_manager",
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

        outsider = User(
            workspace_id=workspace.id,
            full_name="Unassigned Employee",
            email="outsider@team-one.example",
            password_hash=hash_password("OutsiderPass@123"),
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

        db.add_all([
            admin,
            manager,
            employee,
            outsider,
            other_admin,
        ])
        db.commit()

        result = {
            "admin_id": admin.id,
            "manager_id": manager.id,
            "employee_id": employee.id,
            "outsider_id": outsider.id,
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


@pytest.fixture
def project_data(test_database, team):
    with test_database() as db:
        project = Project(
            workspace_id=team["workspace_id"],
            name="TeamSpace Project",
            description="Project for task API tests",
            status="active",
            priority="high",
            created_by_id=team["admin_id"],
            project_manager_id=team["manager_id"],
        )

        other_project = Project(
            workspace_id=team["other_workspace_id"],
            name="Other Workspace Project",
            created_by_id=team["other_admin_id"],
        )

        db.add_all([project, other_project])
        db.flush()

        db.add(
            ProjectMember(
                project_id=project.id,
                user_id=team["employee_id"],
                added_by_id=team["admin_id"],
            )
        )

        db.commit()

        result = {
            "project_id": project.id,
            "other_project_id": other_project.id,
        }

    return result


def login(client, email, password):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200, response.text


def create_task(client, project_id, assigned_to_id):
    response = client.post(
        "/api/v1/tasks",
        json={
            "project_id": project_id,
            "title": "Implement dashboard",
            "description": "Build the project dashboard",
            "priority": "high",
            "assigned_to_id": assigned_to_id,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


@pytest.fixture
def task_data(client, team, project_data):
    login(client, "manager@team-one.example", "ManagerPass@123")
    task = create_task(
        client,
        project_data["project_id"],
        team["employee_id"],
    )
    return task


def test_manager_can_create_task(client, team, project_data):
    login(client, "manager@team-one.example", "ManagerPass@123")

    response = client.post(
        "/api/v1/tasks",
        json={
            "project_id": project_data["project_id"],
            "title": "Implement authentication",
            "priority": "high",
            "assigned_to_id": team["employee_id"],
        },
    )

    assert response.status_code == 201, response.text
    data = response.json()
    assert data["title"] == "Implement authentication"
    assert data["status"] == "To Do"
    assert data["assigned_to_id"] == team["employee_id"]
    assert data["completed_at"] is None


def test_employee_cannot_create_task(client, team, project_data):
    login(client, "employee@team-one.example", "EmployeePass@123")

    response = client.post(
        "/api/v1/tasks",
        json={
            "project_id": project_data["project_id"],
            "title": "Unauthorized task",
        },
    )

    assert response.status_code == 403


def test_task_cannot_be_created_for_nonmember(
    client, team, project_data
):
    login(client, "manager@team-one.example", "ManagerPass@123")

    response = client.post(
        "/api/v1/tasks",
        json={
            "project_id": project_data["project_id"],
            "title": "Invalid assignment",
            "assigned_to_id": team["outsider_id"],
        },
    )

    assert response.status_code == 400


def test_task_cannot_be_created_for_another_workspace(
    client, team, project_data
):
    login(client, "manager@team-one.example", "ManagerPass@123")

    response = client.post(
        "/api/v1/tasks",
        json={
            "project_id": project_data["project_id"],
            "title": "Cross-workspace assignment",
            "assigned_to_id": team["other_admin_id"],
        },
    )

    assert response.status_code == 400


def test_employee_can_view_assigned_task(
    client, team, project_data, task_data
):
    login(client, "employee@team-one.example", "EmployeePass@123")

    response = client.get(f"/api/v1/tasks/{task_data['id']}")

    assert response.status_code == 200, response.text
    assert response.json()["assigned_to_id"] == team["employee_id"]


def test_employee_cannot_view_unassigned_task(
    client, team, project_data, test_database
):
    # Create a task assigned to the project member.
    with test_database() as db:
        task = Task(
            workspace_id=team["workspace_id"],
            project_id=project_data["project_id"],
            title="Assigned to another employee",
            status="To Do",
            priority="medium",
            created_by_id=team["manager_id"],
            assigned_to_id=team["employee_id"],
        )
        db.add(task)
        db.commit()
        task_id = task.id

    # The outsider is not assigned to this task.
    login(client, "outsider@team-one.example", "OutsiderPass@123")

    response = client.get(f"/api/v1/tasks/{task_id}")

    assert response.status_code == 404

def test_employee_can_start_own_task(
    client, team, project_data, task_data
):
    login(client, "employee@team-one.example", "EmployeePass@123")

    response = client.patch(
        f"/api/v1/tasks/{task_data['id']}",
        json={"status": "In Progress"},
    )

    assert response.status_code == 200, response.text
    assert response.json()["status"] == "In Progress"


def test_employee_can_submit_task_for_review(
    client, team, project_data, task_data
):
    login(client, "employee@team-one.example", "EmployeePass@123")
    task_url = f"/api/v1/tasks/{task_data['id']}"

    started = client.patch(task_url, json={"status": "In Progress"})
    assert started.status_code == 200, started.text

    response = client.patch(task_url, json={"status": "In Review"})

    assert response.status_code == 200, response.text
    assert response.json()["status"] == "In Review"


def test_employee_cannot_skip_workflow_to_done(
    client, team, project_data, task_data
):
    login(client, "employee@team-one.example", "EmployeePass@123")

    response = client.patch(
        f"/api/v1/tasks/{task_data['id']}",
        json={"status": "Done"},
    )

    assert response.status_code == 403


def test_employee_cannot_edit_task_title(
    client, team, project_data, task_data
):
    login(client, "employee@team-one.example", "EmployeePass@123")

    response = client.patch(
        f"/api/v1/tasks/{task_data['id']}",
        json={"title": "Changed without permission"},
    )

    assert response.status_code == 403


def test_manager_can_request_changes(
    client, team, project_data, task_data
):
    login(client, "employee@team-one.example", "EmployeePass@123")
    task_url = f"/api/v1/tasks/{task_data['id']}"

    assert client.patch(
        task_url, json={"status": "In Progress"}
    ).status_code == 200

    assert client.patch(
        task_url, json={"status": "In Review"}
    ).status_code == 200

    login(client, "manager@team-one.example", "ManagerPass@123")
    response = client.patch(
        task_url,
        json={"status": "Changes Required"},
    )

    assert response.status_code == 200, response.text
    assert response.json()["status"] == "Changes Required"


def test_employee_can_resubmit_after_changes_requested(
    client, team, project_data, task_data
):
    task_url = f"/api/v1/tasks/{task_data['id']}"

    login(client, "employee@team-one.example", "EmployeePass@123")
    assert client.patch(
        task_url, json={"status": "In Progress"}
    ).status_code == 200
    assert client.patch(
        task_url, json={"status": "In Review"}
    ).status_code == 200

    login(client, "manager@team-one.example", "ManagerPass@123")
    requested = client.patch(
        task_url, json={"status": "Changes Required"}
    )
    assert requested.status_code == 200, requested.text

    login(client, "employee@team-one.example", "EmployeePass@123")
    response = client.patch(
        task_url,
        json={"status": "In Progress"},
    )

    assert response.status_code == 200, response.text
    assert response.json()["status"] == "In Progress"


def test_manager_can_approve_task_and_set_completion_time(
    client, team, project_data, task_data
):
    task_url = f"/api/v1/tasks/{task_data['id']}"

    login(client, "employee@team-one.example", "EmployeePass@123")
    assert client.patch(
        task_url, json={"status": "In Progress"}
    ).status_code == 200
    assert client.patch(
        task_url, json={"status": "In Review"}
    ).status_code == 200

    login(client, "manager@team-one.example", "ManagerPass@123")
    response = client.patch(task_url, json={"status": "Done"})

    assert response.status_code == 200, response.text
    assert response.json()["status"] == "Done"
    assert response.json()["completed_at"] is not None


def test_reopening_done_task_clears_completion_time(
    client, team, project_data, task_data
):
    task_url = f"/api/v1/tasks/{task_data['id']}"

    login(client, "employee@team-one.example", "EmployeePass@123")
    assert client.patch(
        task_url, json={"status": "In Progress"}
    ).status_code == 200
    assert client.patch(
        task_url, json={"status": "In Review"}
    ).status_code == 200

    login(client, "manager@team-one.example", "ManagerPass@123")
    done = client.patch(task_url, json={"status": "Done"})
    assert done.status_code == 200, done.text
    assert done.json()["completed_at"] is not None

    reopened = client.patch(
        task_url, json={"status": "In Progress"}
    )

    assert reopened.status_code == 200, reopened.text
    assert reopened.json()["status"] == "In Progress"
    assert reopened.json()["completed_at"] is None


def test_task_from_another_workspace_is_not_visible(
    client, test_database, team, project_data
):
    with test_database() as db:
        foreign_task = Task(
            workspace_id=team["other_workspace_id"],
            project_id=project_data["other_project_id"],
            title="Private task",
            status="To Do",
            priority="medium",
            created_by_id=team["other_admin_id"],
        )
        db.add(foreign_task)
        db.commit()
        foreign_task_id = foreign_task.id

    login(client, "admin@team-one.example", "AdminPass@123")

    response = client.get(f"/api/v1/tasks/{foreign_task_id}")

    assert response.status_code == 404

def test_task_assignment_rejects_admin_and_project_manager(
    client, team, project_data
):
    login(client, "manager@team-one.example", "ManagerPass@123")

    for user_id in (team["admin_id"], team["manager_id"]):
        response = client.post(
            "/api/v1/tasks",
            json={
                "project_id": project_data["project_id"],
                "title": "Invalid privileged assignee",
                "assigned_to_id": user_id,
            },
        )
        assert response.status_code == 400, response.text
        assert "Only regular teammates" in response.json()["detail"]


def test_eligible_assignees_contains_only_active_project_employees(
    client, test_database, team, project_data
):
    with test_database() as db:
        db.add(
            ProjectMember(
                project_id=project_data["project_id"],
                user_id=team["manager_id"],
                added_by_id=team["admin_id"],
            )
        )
        db.add(
            ProjectMember(
                project_id=project_data["project_id"],
                user_id=team["admin_id"],
                added_by_id=team["admin_id"],
            )
        )
        db.commit()

    login(client, "manager@team-one.example", "ManagerPass@123")
    response = client.get(
        f"/api/v1/projects/{project_data['project_id']}/eligible-assignees"
    )

    assert response.status_code == 200, response.text
    assert [person["id"] for person in response.json()] == [team["employee_id"]]
    assert set(response.json()[0]) == {"id", "full_name", "email", "role", "is_active"}


def test_project_top_tasks_sorts_priority_then_nearest_deadline(
    client, test_database, team, project_data
):
    from datetime import date

    with test_database() as db:
        db.add_all([
            Task(
                workspace_id=team["workspace_id"],
                project_id=project_data["project_id"],
                title="High, later",
                status="To Do",
                priority="high",
                created_by_id=team["manager_id"],
                due_date=date(2026, 12, 20),
            ),
            Task(
                workspace_id=team["workspace_id"],
                project_id=project_data["project_id"],
                title="Medium, soon",
                status="In Progress",
                priority="medium",
                created_by_id=team["manager_id"],
                due_date=date(2026, 10, 20),
            ),
            Task(
                workspace_id=team["workspace_id"],
                project_id=project_data["project_id"],
                title="High, soon",
                status="To Do",
                priority="high",
                created_by_id=team["manager_id"],
                due_date=date(2026, 10, 16),
            ),
            Task(
                workspace_id=team["workspace_id"],
                project_id=project_data["project_id"],
                title="Low, soon",
                status="To Do",
                priority="low",
                created_by_id=team["manager_id"],
                due_date=date(2026, 10, 15),
            ),
        ])
        db.commit()

    login(client, "manager@team-one.example", "ManagerPass@123")
    response = client.get(
        f"/api/v1/projects/{project_data['project_id']}/top-tasks"
    )

    assert response.status_code == 200, response.text
    assert [task["title"] for task in response.json()] == [
        "High, soon",
        "High, later",
        "Medium, soon",
    ]



def test_project_response_includes_manager_name(client, team, project_data):
    login(client, "admin@team-one.example", "AdminPass@123")

    response = client.get("/api/v1/projects")
    assert response.status_code == 200, response.text
    project = next(
        item for item in response.json() if item["id"] == project_data["project_id"]
    )
    assert project["project_manager_name"] == "Project Manager"
    assert "email" not in project
