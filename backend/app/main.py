from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.staticfiles import StaticFiles

from app.api.v1.api import api_router
from app.core.config import settings
from app.db.base import Base
from app.db.session import engine
from app.models import article, data_source, report, scraping_job, user  # noqa: F401 - registers models

# FastAPI's default docs_url loads Swagger UI's assets from a CDN (cdn.jsdelivr.net);
# locked-down corporate/legal networks often block that, leaving /docs blank. Vendored
# assets under app/static/swagger-ui/ avoid depending on external network access at all.
app = FastAPI(title=settings.PROJECT_NAME, version=settings.PROJECT_VERSION, docs_url=None)
app.mount(
    "/static/swagger-ui", StaticFiles(directory=Path(__file__).parent / "static" / "swagger-ui"), name="swagger-ui"
)


@app.get("/docs", include_in_schema=False)
def custom_docs():
    return get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title=f"{settings.PROJECT_NAME} - API docs",
        swagger_js_url="/static/swagger-ui/swagger-ui-bundle.js",
        swagger_css_url="/static/swagger-ui/swagger-ui.css",
        swagger_favicon_url="/static/swagger-ui/favicon-32x32.png",
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)


@app.on_event("startup")
def on_startup() -> None:
    # Demo bootstrap: create tables directly. A production deployment should
    # use the Alembic migrations under db/migrations instead.
    Base.metadata.create_all(bind=engine)


# The plain client-facing UI, served last so it only catches paths no API
# route above already handled (e.g. "/", "/app.js").
app.mount("/", StaticFiles(directory=Path(__file__).parent / "static" / "app", html=True), name="frontend")
