import pytest
from fastapi.testclient import TestClient

from app.auth import get_current_user
from app.main import app

TEST_USER_ID = "00000000-0000-0000-0000-000000000001"


async def _mock_user():
    return TEST_USER_ID


@pytest.fixture
def client():
    """Create a test client with auth bypassed."""
    app.dependency_overrides[get_current_user] = _mock_user
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
