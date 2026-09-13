from dataclasses import dataclass


@dataclass
class ScrapedItem:
    title: str
    link: str
    summary: str | None
    published_at: str | None
