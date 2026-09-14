from datetime import datetime

from pydantic import BaseModel


class ArticleRead(BaseModel):
    id: int
    title: str
    link: str
    summary: str | None = None
    published_at: str | None = None
    scraped_at: datetime
    extracted_names: str | None = None
    extracted_emails: str | None = None

    model_config = {"from_attributes": True}


class SearchRequest(BaseModel):
    query: str


class PersonSearchRequest(BaseModel):
    name: str


class PersonSearchResult(BaseModel):
    name: str
    matched_articles: list[ArticleRead]
    linked_emails: list[str]
    note: str = (
        "linked_emails are co-occurrence leads from scraped text, not confirmed "
        "identity matches - verify before treating them as fact."
    )
