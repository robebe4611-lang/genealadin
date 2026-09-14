"""Query-time search: instead of only searching whatever was manually
pre-scraped, pull live results from Google News' own search feed for the
exact term being searched, save them, and let them join the local search.
This is what makes "search for a name" actually mean something instead of
depending on someone having pre-loaded the right homepage feeds."""

import logging
from datetime import datetime, timezone
from urllib.parse import quote

from sqlalchemy.orm import Session

from app.models.article import Article
from app.models.data_source import DataSource
from app.models.scraping_job import ScrapingJob
from app.scrapers.rss_scraper import fetch_feed

logger = logging.getLogger(__name__)

LIVE_SOURCE_NAME = "חדשות Google (חיפוש חי)"


def live_search_google_news(db: Session, query: str, current_user_id: int) -> None:
    if not query.strip():
        return

    try:
        url = f"https://news.google.com/rss/search?q={quote(query)}&hl=iw&gl=IL&ceid=IL:iw"
        items = fetch_feed(url)
    except Exception:
        logger.exception("Live Google News search failed; falling back to local data only")
        return

    if not items:
        return

    source = db.query(DataSource).filter(DataSource.name == LIVE_SOURCE_NAME).first()
    if not source:
        source = DataSource(
            name=LIVE_SOURCE_NAME, url="https://news.google.com/rss/search", source_type="news"
        )
        db.add(source)
        db.flush()

    job = ScrapingJob(data_source_id=source.id, created_by=current_user_id, status="completed")
    db.add(job)
    db.flush()

    existing_links = {
        link for (link,) in db.query(Article.link).filter(Article.link.in_([i.link for i in items]))
    }
    added = 0
    for item in items:
        if not item.link or item.link in existing_links:
            continue
        db.add(
            Article(
                scraping_job_id=job.id,
                data_source_id=source.id,
                title=item.title,
                link=item.link,
                summary=item.summary,
                published_at=item.published_at,
            )
        )
        added += 1

    job.result_count = added
    job.completed_at = datetime.now(timezone.utc)
    db.commit()
