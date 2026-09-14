from unittest.mock import patch

from app.scrapers.base import ScrapedItem


def _auth_headers(client, email="livesearch@example.com"):
    client.post("/api/v1/auth/register", json={"email": email, "password": "s3cret-pass"})
    response = client.post("/api/v1/auth/login", data={"username": email, "password": "s3cret-pass"})
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_search_pulls_in_live_results(client):
    headers = _auth_headers(client)
    live_items = [
        ScrapedItem(
            title="Live: John Doe wins award",
            link="https://news.example.com/live1",
            summary="Coverage of the ceremony.",
            published_at=None,
        )
    ]

    with patch("app.scrapers.live_search.fetch_feed", return_value=live_items) as mock_fetch:
        response = client.post("/api/v1/search", json={"query": "John Doe"}, headers=headers)

    assert mock_fetch.called
    assert "John" in mock_fetch.call_args[0][0]  # query is url-encoded into the search URL
    assert response.status_code == 200
    results = response.json()
    assert len(results) == 1
    assert results[0]["title"] == "Live: John Doe wins award"


def test_live_search_does_not_duplicate_existing_links(client):
    headers = _auth_headers(client)
    live_items = [
        ScrapedItem(
            title="Duplicate story",
            link="https://news.example.com/dup",
            summary=None,
            published_at=None,
        )
    ]

    with patch("app.scrapers.live_search.fetch_feed", return_value=live_items):
        client.post("/api/v1/search", json={"query": "dup"}, headers=headers)
        response = client.post("/api/v1/search", json={"query": "dup"}, headers=headers)

    results = response.json()
    assert len(results) == 1  # not duplicated on the second search


def test_search_survives_live_fetch_failure(client):
    headers = _auth_headers(client)
    with patch("app.scrapers.live_search.fetch_feed", side_effect=Exception("network down")):
        response = client.post("/api/v1/search", json={"query": "anything"}, headers=headers)
    assert response.status_code == 200
    assert response.json() == []
