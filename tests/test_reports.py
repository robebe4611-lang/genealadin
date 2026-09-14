from unittest.mock import patch

from app.scrapers.base import ScrapedItem


def _auth_headers(client, email="reporter@example.com"):
    client.post("/api/v1/auth/register", json={"email": email, "password": "s3cret-pass"})
    response = client.post("/api/v1/auth/login", data={"username": email, "password": "s3cret-pass"})
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _seed_articles(client, headers):
    fake_items = [
        ScrapedItem(
            title="Trade summit opens",
            link="https://example.com/a1",
            summary="Ministers discuss trade.",
            published_at=None,
        ),
        ScrapedItem(
            title="Sports roundup",
            link="https://example.com/a2",
            summary="Weekend results.",
            published_at=None,
        ),
    ]
    with patch("app.api.v1.endpoints.scraping.fetch_feed", return_value=fake_items):
        client.post(
            "/api/v1/scraping/jobs",
            json={"source_name": "Demo Feed", "source_url": "https://example.com/rss.xml"},
            headers=headers,
        )


def test_report_creation_and_retrieval(client):
    headers = _auth_headers(client)
    _seed_articles(client, headers)

    response = client.post("/api/v1/reports", json={"query": "trade"}, headers=headers)
    assert response.status_code == 201
    report = response.json()
    assert report["article_count"] == 1
    assert len(report["articles"]) == 1
    assert "Trade summit" in report["articles"][0]["title"]
    assert report["source_breakdown"] == {"Demo Feed": 1}

    response = client.get(f"/api/v1/reports/{report['id']}", headers=headers)
    assert response.status_code == 200
    assert response.json()["article_count"] == 1
    assert response.json()["source_breakdown"] == {"Demo Feed": 1}


def test_report_with_no_matches(client):
    headers = _auth_headers(client)
    _seed_articles(client, headers)

    response = client.post("/api/v1/reports", json={"query": "nonexistent-topic"}, headers=headers)
    assert response.status_code == 201
    assert response.json()["article_count"] == 0
