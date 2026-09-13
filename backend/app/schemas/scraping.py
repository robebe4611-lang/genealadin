from datetime import datetime

from pydantic import BaseModel, HttpUrl


class ScrapingJobCreate(BaseModel):
    source_name: str
    source_url: HttpUrl
    source_type: str = "news"


class ScrapingJobRead(BaseModel):
    id: int
    status: str
    result_count: int
    error_message: str | None = None
    created_at: datetime
    completed_at: datetime | None = None

    model_config = {"from_attributes": True}
