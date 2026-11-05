from __future__ import annotations

from unittest.mock import Mock
from uuid import UUID

import httpx

from app.mcp import server


def test_search_transactions_caps_page_size(monkeypatch):
    response = Mock()
    response.json.return_value = {"items": [], "total": 0}
    response.raise_for_status.return_value = None
    get = Mock(return_value=response)
    monkeypatch.setattr(server.httpx, "get", get)

    result = server.search_transactions(page=2, page_size=500)

    assert result == {"items": [], "total": 0}
    assert get.call_args.kwargs["params"] == {"page": 2, "page_size": 100}
    assert get.call_args.kwargs["timeout"] == 15.0


def test_search_alerts_rejects_invalid_pagination():
    assert server.search_alerts(page=0) == {
        "error": "page and page_size must be positive integers"
    }


def test_get_transaction_rejects_invalid_uuid_without_http(monkeypatch):
    get = Mock()
    monkeypatch.setattr(server.httpx, "get", get)

    assert server.get_transaction("not-a-uuid") == {
        "error": "transactions_id must be a valid UUID"
    }
    get.assert_not_called()


def test_get_alert_uses_validated_uuid(monkeypatch):
    alert_id = str(UUID(int=123))
    response = Mock()
    response.json.return_value = {"id": alert_id}
    response.raise_for_status.return_value = None
    get = Mock(return_value=response)
    monkeypatch.setattr(server.httpx, "get", get)

    assert server.get_alert(alert_id) == {"id": alert_id}
    assert get.call_args.args[0].endswith(f"/api/v1/alerts/{alert_id}")


def test_backend_http_error_is_returned_safely(monkeypatch):
    request = httpx.Request("GET", "http://127.0.0.1:8000/api/v1/alerts")
    response = httpx.Response(503, request=request)
    get = Mock(side_effect=httpx.HTTPStatusError("unavailable", request=request, response=response))
    monkeypatch.setattr(server.httpx, "get", get)

    result = server.search_alerts()

    assert result["error"] == "NexGuard API request failed"
    assert result["status_code"] == 503
