"""Optional: uses Claude to pull structured entities out of scraped text.
Skipped entirely (returns None) when ANTHROPIC_API_KEY isn't configured, so the
scraping flow works with or without it."""

import logging

import anthropic
from pydantic import BaseModel

from app.core.config import settings

logger = logging.getLogger(__name__)


class ExtractedEntities(BaseModel):
    names: list[str]
    emails: list[str]
    usernames: list[str]
    organizations: list[str]


def extract_entities(text: str) -> ExtractedEntities | None:
    if not settings.ANTHROPIC_API_KEY or not text.strip():
        return None

    try:
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        response = client.messages.parse(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": (
                        "Extract every person name, email address, social/username handle, "
                        "and organization name mentioned in this text. Use empty lists for "
                        f"anything not present.\n\nText:\n{text}"
                    ),
                }
            ],
            output_format=ExtractedEntities,
        )
        return response.parsed_output
    except Exception:
        logger.exception("Entity extraction failed; continuing without it")
        return None
