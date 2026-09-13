"""Fetches public RSS/Atom feeds. Feeds are explicitly published for syndication,
so this avoids the ToS and anti-bot concerns of scraping arbitrary pages."""

from dataclasses import dataclass
from xml.etree import ElementTree

import requests

from app.core.config import settings


@dataclass
class FeedItem:
    title: str
    link: str
    summary: str | None
    published_at: str | None


def fetch_feed(url: str) -> list[FeedItem]:
    response = requests.get(url, timeout=settings.SCRAPE_TIMEOUT, headers={"User-Agent": "genealadin-demo/0.1"})
    response.raise_for_status()

    root = ElementTree.fromstring(response.content)
    items: list[FeedItem] = []

    # RSS 2.0: rss/channel/item
    for item in root.findall("./channel/item"):
        items.append(
            FeedItem(
                title=_text(item, "title") or "(untitled)",
                link=_text(item, "link") or "",
                summary=_text(item, "description"),
                published_at=_text(item, "pubDate"),
            )
        )

    # Atom: feed/entry
    if not items:
        ns = {"atom": "http://www.w3.org/2005/Atom"}
        for entry in root.findall("atom:entry", ns):
            link_el = entry.find("atom:link", ns)
            items.append(
                FeedItem(
                    title=_text(entry, "atom:title", ns) or "(untitled)",
                    link=link_el.get("href") if link_el is not None else "",
                    summary=_text(entry, "atom:summary", ns),
                    published_at=_text(entry, "atom:updated", ns),
                )
            )

    return items


def _text(element: ElementTree.Element, tag: str, ns: dict | None = None) -> str | None:
    child = element.find(tag, ns) if ns else element.find(tag)
    return child.text.strip() if child is not None and child.text else None
