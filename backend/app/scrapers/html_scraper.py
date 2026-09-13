"""Generic HTML scraper: pulls linked headlines/items off a listing page using
a caller-supplied CSS selector, for sources that don't publish an RSS feed."""

from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

from app.core.config import settings
from app.scrapers.base import ScrapedItem

MAX_ITEMS = 50


def parse_html(html: str, base_url: str, selector: str) -> list[ScrapedItem]:
    soup = BeautifulSoup(html, "lxml")
    items: list[ScrapedItem] = []

    for element in soup.select(selector):
        anchor = element if element.name == "a" else element.find("a")
        href = anchor.get("href") if anchor else None
        title = anchor.get_text(strip=True) if anchor else None
        if not href or not title:
            continue

        items.append(
            ScrapedItem(
                title=title,
                link=urljoin(base_url, href),
                summary=None,
                published_at=None,
            )
        )
        if len(items) >= MAX_ITEMS:
            break

    return items


def fetch_html_items(url: str, selector: str) -> list[ScrapedItem]:
    response = requests.get(url, timeout=settings.SCRAPE_TIMEOUT, headers={"User-Agent": "genealadin-demo/0.1"})
    response.raise_for_status()
    return parse_html(response.text, url, selector)
