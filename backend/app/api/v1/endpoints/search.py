from fastapi import APIRouter, Depends
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.article import Article
from app.models.user import User
from app.schemas.article import ArticleRead, SearchRequest

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
