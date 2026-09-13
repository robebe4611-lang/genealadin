from unittest.mock import patch

from app.scrapers.rss_scraper import FeedItem


def _auth_headers(client):
    client.post(
        "/api/v1/auth/register", json={"email": "scraper@example.com", "password": "s3cret-pass"}
    )
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "scraper@example.com", "password": "s3cret-pass"},
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_scraping_job_and_search(client):
    headers = _auth_headers(client)

    fake_items = [
        FeedItem(
            title="Regional trade summit opens",
            link="https://example.com/a1",
            summary="Ministers gather to discuss trade.",
            published_at="Sat, 13 Sep 2026 09:00:00 GMT",
        ),
        FeedItem(
            title="Tech sector growth report",
            link="https://example.com/a2",
            summary="Analysts publish quarterly figures.",
            published_at="Sat, 13 Sep 2026 10:00:00 GMT",
        ),
    ]

    with patch("app.api.v1.endpoints.scraping.fetch_feed", return_value=fake_items):
        response = client.post(
            "/api/v1/scraping/jobs",
            json={
                "source_name": "Demo Feed",
                "source_url": "https://example.com/rss.xml",
                "source_type": "news",
            },
            headers=headers,
        )
    assert response.status_code == 201
    job = response.json()
    assert job["status"] == "completed"
    assert job["result_count"] == 2

    response = client.get(f"/api/v1/scraping/results/{job['id']}", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) == 2

    response = client.post("/api/v1/search", json={"query": "trade"}, headers=headers)
    assert response.status_code == 200
    results = response.json()
    assert len(results) == 1
    assert "trade summit" in results[0]["title"]
