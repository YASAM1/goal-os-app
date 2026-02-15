from unittest.mock import MagicMock, patch

from tests.conftest import TEST_USER_ID


def _mock_action(id="act-1", sort_order=1):
    return {
        "id": id,
        "goal_id": "goal-1",
        "user_id": TEST_USER_ID,
        "title": f"Action {sort_order}",
        "description": None,
        "sort_order": sort_order,
        "is_ai_generated": False,
        "ai_output_id": None,
        "created_at": "2026-01-01T00:00:00+00:00",
    }


@patch("app.routers.actions.supabase")
def test_list_actions(mock_sb, client):
    mock_result = MagicMock()
    mock_result.data = [_mock_action()]
    mock_sb.table.return_value.select.return_value.eq.return_value.eq.return_value.order.return_value.execute.return_value = mock_result

    response = client.get("/api/v1/goals/goal-1/actions")
    assert response.status_code == 200
    assert len(response.json()) == 1


@patch("app.routers.actions.supabase")
def test_create_action_enforces_max_5(mock_sb, client):
    # Mock count returning 5
    count_result = MagicMock()
    count_result.count = 5
    mock_sb.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = count_result

    payload = {"title": "Sixth action", "sort_order": 6}
    response = client.post("/api/v1/goals/goal-1/actions", json=payload)
    assert response.status_code == 422
    assert "Maximum" in response.json()["detail"]


@patch("app.routers.actions.supabase")
def test_create_action_success(mock_sb, client):
    # Mock count returning 3
    count_result = MagicMock()
    count_result.count = 3
    mock_sb.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = count_result

    insert_result = MagicMock()
    insert_result.data = [_mock_action(sort_order=4)]
    mock_sb.table.return_value.insert.return_value.execute.return_value = insert_result

    payload = {"title": "New action", "sort_order": 4}
    response = client.post("/api/v1/goals/goal-1/actions", json=payload)
    assert response.status_code == 201


@patch("app.routers.actions.supabase")
def test_delete_action_not_found(mock_sb, client):
    mock_result = MagicMock()
    mock_result.data = []
    mock_sb.table.return_value.delete.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result

    response = client.delete("/api/v1/actions/nonexistent")
    assert response.status_code == 404
