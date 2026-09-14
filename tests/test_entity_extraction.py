from unittest.mock import patch

from app.scrapers.base import ScrapedItem


def _auth_headers(client, email="analyst@example.com"):
    client.post("/api/v1/auth/register", json={"email": email, "password": "s3cret-pass"})
    response = client.post("/api/v1/auth/login", data={"username": email, "password": "s3cret-pass"})
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_scraping_without_api_key_skips_extraction_silently(client):
    """No ANTHROPIC_API_KEY configured in tests - extract_entities=True must not error."""
    headers = _auth_headers(client)
    fake_items = [
        ScrapedItem(title="Deal signed", link="https://example.com/a1", summary="s", published_at=None)
    ]
    with patch("app.api.v1.endpoints.scraping.fetch_feed", return_value=fake_items):
        response = client.post(
            "/api/v1/scraping/jobs",
            json={
                "source_name": "Demo Feed",
                "source_url": "https://example.com/rss.xml",
                "extract_entities": True,
            },
            headers=headers,
        )
    assert response.status_code == 201
    assert response.json()["status"] == "completed"

    results = client.get(
        f"/api/v1/scraping/results/{response.json()['id']}", headers=headers
    ).json()
    assert results[0]["extracted_names"] is None
    assert results[0]["extracted_emails"] is None


def test_person_search_links_coincident_emails(client):
    headers = _auth_headers(client)
    fake_items = [
        ScrapedItem(
            title="Court filing names John Smith",
            link="https://example.com/a1",
            summary="Contact listed as john.smith@example.com",
            published_at=None,
        )
    ]

    class FakeEntities:
        names = ["John Smith"]
        emails = ["john.smith@example.com"]
        usernames = []
        organizations = []

    with patch("app.api.v1.endpoints.scraping.fetch_feed", return_value=fake_items), patch(
        "app.api.v1.endpoints.scraping.extract_entities", return_value=FakeEntities()
    ):
        client.post(
            "/api/v1/scraping/jobs",
            json={
                "source_name": "Demo Feed",
                "source_url": "https://example.com/rss.xml",
                "extract_entities": True,
            },
            headers=headers,
        )

    with patch("app.api.v1.endpoints.search.live_search_google_news"):
        response = client.post("/api/v1/search/person", json={"name": "John Smith"}, headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert len(body["matched_articles"]) == 1
    assert body["linked_emails"] == ["john.smith@example.com"]
    assert "not confirmed" in body["note"]


def test_report_ai_summary_falls_back_without_api_key(client):
    headers = _auth_headers(client)
    fake_items = [
        ScrapedItem(title="Trade deal signed", link="https://example.com/a1", summary="s", published_at=None)
    ]
    with patch("app.api.v1.endpoints.scraping.fetch_feed", return_value=fake_items):
        client.post(
            "/api/v1/scraping/jobs",
            json={"source_name": "Demo Feed", "source_url": "https://example.com/rss.xml"},
            headers=headers,
        )

    response = client.post(
        "/api/v1/reports", json={"query": "trade", "use_ai_summary": True}, headers=headers
    )
    assert response.status_code == 201
    assert "AI summary unavailable" in response.json()["summary"]
