from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Demo default: SQLite needs zero setup. Point DATABASE_URL at Postgres for real use.
    DATABASE_URL: str = "sqlite:///./genealadin.db"

    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Genealadin"
    PROJECT_VERSION: str = "0.1.0"

    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:8000"

    SCRAPE_TIMEOUT: int = 30

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]


settings = Settings()
