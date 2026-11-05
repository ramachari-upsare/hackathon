"""Read-only MCP tools for the NexGuard API.

Run from backend/: python -m app.mcp.server
The MCP process communicates over stdio; the FastAPI app must run separately.
"""
from __future__ import annotations

import os
from typing import Any
from urllib.parse import urljoin
from uuid import UUID

import httpx
from mcp.server.fastmcp import FastMCP

API_BASE = os.getenv("NEXGUARD_API_BASE_URL", "http://127.0.0.1:8000").rstrip("/") + "/"
mcp = FastMCP("NexGuard")


def _get(path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    """Read JSON from the local NexGuard API without exposing credentials."""
    url = urljoin(API_BASE, path.lstrip("/"))
    try:
        response = httpx.get(url, params=params, timeout=15.0)
        response.raise_for_status()
        payload = response.json()
        return payload if isinstance(payload, dict) else {"data": payload}
    except httpx.HTTPStatusError as exc:
        return {
            "error": "NexGuard API request failed",
            "status_code": exc.response.status_code,
            "path": path,
        }
    except httpx.RequestError:
        return {
            "error": "Could not reach the NexGuard API",
            "api_base_url": API_BASE,
            "hint": "Start the FastAPI backend and verify NEXGUARD_API_BASE_URL.",
        }
    except ValueError:
        return {"error": "NexGuard API returned invalid JSON", "path": path}


def _uuid_path(resource: str, value: str) -> str | dict[str, str]:
    """Validate IDs before placing them in a URL path."""
    try:
        parsed = UUID(value)
    except (TypeError, ValueError, AttributeError):
        return {"error": f"{resource}_id must be a valid UUID"}
    return f"/api/v1/{resource}/{parsed}"


@mcp.tool()
def search_transactions(page: int = 1, page_size: int = 25) -> dict[str, Any]:
    """Read a page of transactions from NexGuard. Page size is capped at 100."""
    if page < 1 or page_size < 1:
        return {"error": "page and page_size must be positive integers"}
    return _get(
        "/api/v1/transactions",
        {"page": page, "page_size": min(page_size, 100)},
    )


@mcp.tool()
def get_transaction(transaction_id: str) -> dict[str, Any]:
    """Read one transaction by its UUID."""
    path = _uuid_path("transactions", transaction_id)
    return path if isinstance(path, dict) else _get(path)


@mcp.tool()
def search_alerts(page: int = 1, page_size: int = 25) -> dict[str, Any]:
    """Read a page of fraud alerts from NexGuard. Page size is capped at 100."""
    if page < 1 or page_size < 1:
        return {"error": "page and page_size must be positive integers"}
    return _get(
        "/api/v1/alerts",
        {"page": page, "page_size": min(page_size, 100)},
    )


@mcp.tool()
def get_alert(alert_id: str) -> dict[str, Any]:
    """Read one alert by its UUID, including explanation and evidence."""
    path = _uuid_path("alerts", alert_id)
    return path if isinstance(path, dict) else _get(path)


if __name__ == "__main__":
    mcp.run(transport="stdio")
