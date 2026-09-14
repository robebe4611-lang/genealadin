from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Article(Base):
    __tablename__ = "articles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    scraping_job_id: Mapped[int] = mapped_column(ForeignKey("scraping_jobs.id"))
    data_source_id: Mapped[int] = mapped_column(ForeignKey("data_sources.id"))
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    link: Mapped[str] = mapped_column(String(1024), nullable=False)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    published_at: Mapped[str | None] = mapped_column(String(100), nullable=True)
    scraped_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    # Optional, comma-separated: only populated when a scraping job requests
    # extract_entities=True (needs ANTHROPIC_API_KEY configured).
    extracted_names: Mapped[str | None] = mapped_column(Text, nullable=True)
    extracted_emails: Mapped[str | None] = mapped_column(Text, nullable=True)
