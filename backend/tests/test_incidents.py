from collections.abc import Callable

import pytest
from httpx import Response


def test_incident_create_list_read_update_and_resolve(
    api_client: Callable[..., Response],
) -> None:
    create_response = api_client(
        "POST",
        "/api/v1/incidents",
        json={
            "title": "Database connection failure",
            "description": "The reporting service cannot connect to PostgreSQL.",
            "severity": "High",
            "category": "Database",
            "assignee": "alex@example.com",
        },
    )

    assert create_response.status_code == 201
    created = create_response.json()
    assert created["id"] == 1
    assert created["status"] == "Open"
    assert created["severity"] == "High"
    assert created["assignee"] == "alex@example.com"
    assert created["created_at"]
    incident_id = created["id"]

    list_response = api_client("GET", "/api/v1/incidents")
    assert list_response.status_code == 200
    assert [item["id"] for item in list_response.json()] == [incident_id]

    read_response = api_client("GET", f"/api/v1/incidents/{incident_id}")
    assert read_response.status_code == 200
    assert read_response.json()["title"] == "Database connection failure"

    update_response = api_client(
        "PATCH",
        f"/api/v1/incidents/{incident_id}",
        json={"status": "In Progress", "assignee": "sam@example.com"},
    )
    assert update_response.status_code == 200
    assert update_response.json()["status"] == "In Progress"
    assert update_response.json()["assignee"] == "sam@example.com"

    resolve_response = api_client(
        "POST", f"/api/v1/incidents/{incident_id}/resolve"
    )
    assert resolve_response.status_code == 200
    assert resolve_response.json()["status"] == "Resolved"


@pytest.mark.parametrize(
    "payload",
    [
        {
            "description": "Missing a title.",
            "severity": "Low",
            "category": "Service",
        },
        {
            "title": "Invalid severity",
            "description": "This severity is not supported.",
            "severity": "Urgent",
            "category": "Service",
        },
        {
            "title": "  ",
            "description": "Title is blank after trimming.",
            "severity": "Low",
            "category": "Service",
        },
        {
            "title": "Unknown input",
            "description": "Extra fields must not be silently ignored.",
            "severity": "Low",
            "category": "Service",
            "assignee_email": "typo@example.com",
        },
    ],
)
def test_create_rejects_invalid_payload(
    api_client: Callable[..., Response], payload: dict[str, object]
) -> None:
    response = api_client("POST", "/api/v1/incidents", json=payload)

    assert response.status_code == 422
    assert "detail" in response.json()


def test_update_rejects_empty_payload(api_client: Callable[..., Response]) -> None:
    create_response = api_client(
        "POST",
        "/api/v1/incidents",
        json={
            "title": "Application outage",
            "description": "Users cannot sign in.",
            "severity": "Critical",
            "category": "Application",
        },
    )
    incident_id = create_response.json()["id"]

    response = api_client("PATCH", f"/api/v1/incidents/{incident_id}", json={})

    assert response.status_code == 422
    assert "At least one incident field must be provided" in response.text


@pytest.mark.parametrize(
    "method,path",
    [
        ("GET", "/api/v1/incidents/999"),
        ("PATCH", "/api/v1/incidents/999"),
        ("POST", "/api/v1/incidents/999/resolve"),
    ],
)
def test_missing_incident_returns_useful_404(
    api_client: Callable[..., Response], method: str, path: str
) -> None:
    response = api_client(
        method,
        path,
        json={"title": "Updated incident"} if method == "PATCH" else None,
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Incident 999 not found"


def test_list_filters_and_bounds_results(
    api_client: Callable[..., Response],
) -> None:
    for title, severity in (
        ("Low priority issue", "Low"),
        ("Critical service outage", "Critical"),
    ):
        api_client(
            "POST",
            "/api/v1/incidents",
            json={
                "title": title,
                "description": "An incident for filtering tests.",
                "severity": severity,
                "category": "Test",
            },
        )

    response = api_client("GET", "/api/v1/incidents?severity=Critical&limit=1")

    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["severity"] == "Critical"

    invalid_limit = api_client("GET", "/api/v1/incidents?limit=101")
    assert invalid_limit.status_code == 422


def test_closed_incident_cannot_be_resolved(
    api_client: Callable[..., Response],
) -> None:
    create_response = api_client(
        "POST",
        "/api/v1/incidents",
        json={
            "title": "Closed incident",
            "description": "This incident is already closed.",
            "severity": "Low",
            "category": "Test",
            "status": "Closed",
        },
    )
    incident_id = create_response.json()["id"]

    response = api_client("POST", f"/api/v1/incidents/{incident_id}/resolve")

    assert response.status_code == 409
    assert response.json()["detail"] == f"Closed incident {incident_id} cannot be resolved"