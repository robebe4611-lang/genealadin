from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.article import Article
from app.models.data_source import DataSource
from app.models.scraping_job import ScrapingJob
from app.models.user import User
from app.schemas.article import ArticleRead
from app.schemas.scraping import ScrapingJobCreate, ScrapingJobRead
from app.llm.entity_extraction import extract_entities
from app.scrapers.html_scraper import fetch_html_items
from app.scrapers.rss_scraper import fetch_feed
from datetime import datetime, timezone

router = APIRouter()


@router.post("/jobs", response_model=ScrapingJobRead, status_code=status.HTTP_201_CREATED)
def create_scraping_job(
    job_in: ScrapingJobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ScrapingJob:
    if job_in.scraper_type == "html" and not job_in.selector:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="selector is required when scraper_type is 'html'",
        )
    if job_in.scraper_type not in ("rss", "html"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="scraper_type must be 'rss' or 'html'",
        )

    source = DataSource(
        name=job_in.source_name, url=str(job_in.source_url), source_type=job_in.source_type
    )
    db.add(source)
    db.flush()

    job = ScrapingJob(data_source_id=source.id, created_by=current_user.id, status="running")
    db.add(job)
    db.flush()

    # Synchronous for this demo; a real deployment would hand this to Celery.
    try:
        if job_in.scraper_type == "html":
            items = fetch_html_items(str(job_in.source_url), job_in.selector)
        else:
            items = fetch_feed(str(job_in.source_url))
        for item in items:
            extracted_names = extracted_emails = None
            if job_in.extract_entities:
                entities = extract_entities(f"{item.title}\n{item.summary or ''}")
                if entities:
                    extracted_names = ", ".join(entities.names)
                    extracted_emails = ", ".join(entities.emails)

            db.add(
                Article(
                    scraping_job_id=job.id,
                    data_source_id=source.id,
                    title=item.title,
                    link=item.link,
                    summary=item.summary,
                    published_at=item.published_at,
                    extracted_names=extracted_names,
                    extracted_emails=extracted_emails,
                )
            )
        job.status = "completed"
        job.result_count = len(items)
    except Exception as exc:  # noqa: BLE001 - surfaced to the caller via job.error_message
        job.status = "failed"
        job.error_message = str(exc)[:1024]

    job.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(job)
    return job


@router.get("/jobs/{job_id}", response_model=ScrapingJobRead)
def get_scraping_job(
    job_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
) -> ScrapingJob:
    job = db.query(ScrapingJob).filter(ScrapingJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return job


@router.get("/results/{job_id}", response_model=list[ArticleRead])
def get_scraping_results(
    job_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
) -> list[Article]:
    job = db.query(ScrapingJob).filter(ScrapingJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return db.query(Article).filter(Article.scraping_job_id == job_id).all()
