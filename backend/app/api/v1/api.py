from fastapi import APIRouter

from app.api.v1.endpoints import auth, scraping, search

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(scraping.router, prefix="/scraping", tags=["scraping"])
api_router.include_router(search.router, prefix="/search", tags=["search"])
