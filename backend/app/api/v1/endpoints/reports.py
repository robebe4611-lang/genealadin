from collections import Counter

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.article import Article
from app.models.data_source import DataSource
from app.models.report import Report
from app.models.user import User
from app.schemas.article import ArticleRead
from app.schemas.report import ReportCreate, ReportDetail
from app.llm.summarization import summarize_articles
from datetime import datetime, timezone

router = APIRouter()


@router.post("", response_model=ReportDetail, status_code=status.HTTP_201_CREATED)
def create_report(
    report_in: ReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ReportDetail:
    pattern = f"%{report_in.query}%"
    query = db.query(Article).filter(
        or_(Article.title.ilike(pattern), Article.summary.ilike(pattern))
    )

    if report_in.source_type:
        source_ids = [
            s.id for s in db.query(DataSource).filter(DataSource.source_type == report_in.source_type)
        ]
        query = query.filter(Article.data_source_id.in_(source_ids)) if source_ids else query.filter(False)

    articles = query.order_by(Article.scraped_at.desc()).all()

    sources_by_id = {
        s.id: s.name
        for s in db.query(DataSource).filter(
            DataSource.id.in_({a.data_source_id for a in articles})
        )
    }
    breakdown = Counter(sources_by_id.get(a.data_source_id, "unknown") for a in articles)
    breakdown_text = ", ".join(f"{name}: {count}" for name, count in breakdown.most_common())
    summary = f'{len(articles)} article(s) matched "{report_in.query}"'
    if breakdown_text:
        summary += f" — by source: {breakdown_text}"

    if report_in.use_ai_summary:
        ai_summary = summarize_articles(
            report_in.query, [(a.title, a.summary) for a in articles]
        )
        if ai_summary:
            summary = ai_summary
        else:
            summary += " (AI summary unavailable — check ANTHROPIC_API_KEY is configured)"

    report = Report(
        created_by=current_user.id,
        query=report_in.query,
        source_type=report_in.source_type,
        article_count=len(articles),
        article_ids=",".join(str(a.id) for a in articles),
        summary=summary,
        created_at=datetime.now(timezone.utc),
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    return ReportDetail(
        id=report.id,
        query=report.query,
        source_type=report.source_type,
        article_count=report.article_count,
        summary=report.summary,
        created_at=report.created_at,
        articles=[ArticleRead.model_validate(a) for a in articles],
        source_breakdown=dict(breakdown),
    )


@router.get("/{report_id}", response_model=ReportDetail)
def get_report(
    report_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
) -> ReportDetail:
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    ids = [int(x) for x in report.article_ids.split(",") if x]
    articles = db.query(Article).filter(Article.id.in_(ids)).all() if ids else []

    sources_by_id = {
        s.id: s.name
        for s in db.query(DataSource).filter(
            DataSource.id.in_({a.data_source_id for a in articles})
        )
    }
    breakdown = Counter(sources_by_id.get(a.data_source_id, "unknown") for a in articles)

    return ReportDetail(
        id=report.id,
        query=report.query,
        source_type=report.source_type,
        article_count=report.article_count,
        summary=report.summary,
        created_at=report.created_at,
        articles=[ArticleRead.model_validate(a) for a in articles],
        source_breakdown=dict(breakdown),
    )
