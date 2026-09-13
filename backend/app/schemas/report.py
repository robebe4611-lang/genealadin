from datetime import datetime

from pydantic import BaseModel

from app.schemas.article import ArticleRead


class ReportCreate(BaseModel):
    query: str
    source_type: str | None = None


class ReportRead(BaseModel):
    id: int
    query: str
    source_type: str | None = None
    article_count: int
    summary: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ReportDetail(ReportRead):
    articles: list[ArticleRead] = []
