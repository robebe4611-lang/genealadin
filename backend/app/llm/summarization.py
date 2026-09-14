"""Optional: uses Claude to write a short analyst-style summary of a report's
matched articles. Skipped (returns None) when ANTHROPIC_API_KEY isn't configured."""

import logging

import anthropic

from app.core.config import settings

logger = logging.getLogger(__name__)


def summarize_articles(query: str, articles: list[tuple[str, str | None]]) -> str | None:
    """articles: list of (title, summary) tuples."""
    if not settings.ANTHROPIC_API_KEY or not articles:
        return None

    listing = "\n".join(f"- {title}: {summary or ''}" for title, summary in articles)
    try:
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        response = client.messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=512,
            messages=[
                {
                    "role": "user",
                    "content": (
                        f'Write a 2-3 sentence analyst summary of what these articles, '
                        f'all matching the search "{query}", say collectively. Be factual '
                        f"and note any patterns or repeated names/organizations. Articles:\n{listing}"
                    ),
                }
            ],
        )
        return next((b.text for b in response.content if b.type == "text"), None)
    except Exception:
        logger.exception("AI report summary failed; falling back to the plain breakdown")
        return None
