from datetime import datetime

from pydantic import BaseModel, HttpUrl


class ScrapingJobCreate(BaseModel):
    source_name: str
    source_url: HttpUrl
    source_type: str = "news"
    scraper_type: str = "rss"  # "rss" or "html"
    selector: str | None = None  # CSS selector, required when scraper_type is "html"
    extract_entities: bool = False  # uses Claude; needs ANTHROPIC_API_KEY configured


class ScrapingJobRead(BaseModel):
    id: int
    status: str
    result_count: int
    error_message: str | None = None
    created_at: datetime
    completed_at: datetime | None = None

    model_config = {"from_attributes": True}
