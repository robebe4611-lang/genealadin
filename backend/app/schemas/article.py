from datetime import datetime

from pydantic import BaseModel


class ArticleRead(BaseModel):
    id: int
    title: str
    link: str
    summary: str | None = None
    published_at: str | None = None
    scraped_at: datetime

    model_config = {"from_attributes": True}


class SearchRequest(BaseModel):
    query: str
