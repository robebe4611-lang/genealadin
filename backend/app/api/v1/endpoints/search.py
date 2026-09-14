from fastapi import APIRouter, Depends
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.article import Article
from app.models.user import User
from app.schemas.article import ArticleRead, PersonSearchRequest, PersonSearchResult, SearchRequest

router = APIRouter()


@router.post("", response_model=list[ArticleRead])
def search_articles(
    search_in: SearchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Article]:
    pattern = f"%{search_in.query}%"
    return (
        db.query(Article)
        .filter(or_(Article.title.ilike(pattern), Article.summary.ilike(pattern)))
        .order_by(Article.scraped_at.desc())
        .limit(50)
        .all()
    )


@router.post("/person", response_model=PersonSearchResult)
def search_person(
    search_in: PersonSearchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PersonSearchResult:
    """Finds articles mentioning a name and surfaces emails that co-occur with it in
    the same scraped text - a lead to review, not a confirmed identity match. Email
    co-occurrence only works on articles scraped with extract_entities=True."""
    pattern = f"%{search_in.name}%"
    articles = (
        db.query(Article)
        .filter(
            or_(
                Article.title.ilike(pattern),
                Article.summary.ilike(pattern),
                Article.extracted_names.ilike(pattern),
            )
        )
        .order_by(Article.scraped_at.desc())
        .limit(50)
        .all()
    )

    linked_emails: list[str] = []
    for article in articles:
        if article.extracted_emails:
            for email in article.extracted_emails.split(", "):
                if email and email not in linked_emails:
                    linked_emails.append(email)

    return PersonSearchResult(
        name=search_in.name,
        matched_articles=[ArticleRead.model_validate(a) for a in articles],
        linked_emails=linked_emails,
    )
