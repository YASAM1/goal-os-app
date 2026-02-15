from unittest.mock import MagicMock, patch

from tests.conftest import TEST_USER_ID


def _mock_goal(overrides=None):
    base = {
        "id": "goal-1",
        "user_id": TEST_USER_ID,
        "title": "Run a marathon",
        "description": "Fitness",
        "metric_name": "5K time",
        "metric_unit": "minutes",
        "direction": "decrease",
        "baseline_value": 30.0,
        "baseline_date": "2026-01-01",
        "target_value": 24.0,
        "target_date": "2026-06-01",
        "is_active": True,
        "created_at": "2026-01-01T00:00:00+00:00",
        "updated_at": "2026-01-01T00:00:00+00:00",
    }
    if overrides:
        base.update(overrides)
    return base


@patch("app.routers.goals.supabase")
def test_get_active_goal_returns_goal(mock_sb, client):
    mock_result = MagicMock()
    mock_result.data = _mock_goal()
    mock_sb.table.return_value.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value = mock_result

    response = client.get("/api/v1/goals/active")
    assert response.status_code == 200
    assert response.json()["title"] == "Run a marathon"


@patch("app.routers.goals.supabase")
def test_get_active_goal_returns_null(mock_sb, client):
    mock_result = MagicMock()
    mock_result.data = None
    mock_sb.table.return_value.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value = mock_result

    response = client.get("/api/v1/goals/active")
    assert response.status_code == 200
    assert response.json() is None


@patch("app.routers.goals.supabase")
def test_create_goal_success(mock_sb, client):
    mock_result = MagicMock()
    mock_result.data = [_mock_goal()]
    mock_sb.table.return_value.insert.return_value.execute.return_value = mock_result

    payload = {
        "title": "Run a marathon",
        "metric_name": "5K time",
        "metric_unit": "minutes",
        "direction": "decrease",
        "baseline_value": 30.0,
        "baseline_date": "2026-01-01",
        "target_value": 24.0,
    }
    response = client.post("/api/v1/goals", json=payload)
    assert response.status_code == 201
    assert response.json()["title"] == "Run a marathon"


def test_create_goal_invalid_direction(client):
    payload = {
        "title": "Test",
        "metric_name": "Weight",
        "metric_unit": "kg",
        "direction": "sideways",
        "baseline_value": 80.0,
        "baseline_date": "2026-01-01",
        "target_value": 70.0,
    }
    response = client.post("/api/v1/goals", json=payload)
    assert response.status_code == 422


def test_create_goal_empty_title(client):
    payload = {
        "title": "   ",
        "metric_name": "Weight",
        "metric_unit": "kg",
        "direction": "decrease",
        "baseline_value": 80.0,
        "baseline_date": "2026-01-01",
        "target_value": 70.0,
    }
    response = client.post("/api/v1/goals", json=payload)
    assert response.status_code == 422


@patch("app.routers.goals.supabase")
def test_archive_goal_success(mock_sb, client):
    mock_result = MagicMock()
    mock_result.data = [_mock_goal({"is_active": False})]
    mock_sb.table.return_value.update.return_value.eq.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result

    response = client.post("/api/v1/goals/goal-1/archive")
    assert response.status_code == 200
    assert response.json()["is_active"] is False


@patch("app.routers.goals.supabase")
def test_archive_goal_not_found(mock_sb, client):
    mock_result = MagicMock()
    mock_result.data = []
    mock_sb.table.return_value.update.return_value.eq.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result

    response = client.post("/api/v1/goals/nonexistent/archive")
    assert response.status_code == 404
