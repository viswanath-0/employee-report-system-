"""
config.py

Central application configuration.
Values are read from environment variables / a local `.env` file
(see `.env.example`). Everything has a sensible default so the app
boots out-of-the-box for local development.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # -------------------- App -------------------- #
    APP_NAME: str = "Employee Report System"
    ENV: str = "development"
    FRONTEND_URL: str = "http://localhost:5173"

    # -------------------- Security / JWT -------------------- #
    SECRET_KEY: str = "CHANGE_ME_super_secret_key_for_jwt_signing_0123456789"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    # -------------------- Database -------------------- #
    # If DATABASE_URL is provided it wins (e.g. Railway / Render inject this).
    # Otherwise a MySQL URL is built from the MYSQL_* parts below.
    DATABASE_URL: str | None = None
    MYSQL_USER: str = "root"
    MYSQL_PASSWORD: str = "Viswanath@123"
    MYSQL_HOST: str = "localhost"
    MYSQL_PORT: int = 3306
    MYSQL_DB: str = "employee_db_report"

    # -------------------- CORS -------------------- #
    # Comma separated list of allowed origins.
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
    # Regex that also allows any *.vercel.app preview/production domain.
    CORS_ORIGIN_REGEX: str = r"https://.*\.vercel\.app"

    # -------------------- Uploads -------------------- #
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_MB: int = 10

    # -------------------- Working day / deadline -------------------- #
    WORK_DAY_START: str = "09:00"   # timeline start (24h HH:MM)
    WORK_DAY_END: str = "21:00"     # timeline end   (24h HH:MM)
    DEFAULT_DEADLINE: str = "20:00"  # 8:00 PM
    DEFAULT_MANAGER_CODE: str = "MANAGER-2024"

    # -------------------- Bootstrap admin -------------------- #
    ADMIN_NAME: str = "System Admin"
    ADMIN_EMAIL: str = "admin@company.com"
    ADMIN_PASSWORD: str = "Admin@123"

    # -------------------- Email (FastAPI-Mail / SMTP) -------------------- #
    EMAIL_ENABLED: bool = False
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = "no-reply@company.com"
    MAIL_FROM_NAME: str = "Employee Report System"
    MAIL_PORT: int = 587
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_STARTTLS: bool = True
    MAIL_SSL_TLS: bool = False

    # -------------------- Provisioning / Gmail SMTP (Phase 2) -------------------- #
    GMAIL_ADDRESS: str = "suddapallivviswanath@gmail.com"        # sender address
    GMAIL_APP_PASSWORD: str = ""                                  # 16-char Google App Password (env only!)
    ADMIN_CONTACT_EMAIL: str = "suddapallivviswanath@gmail.com"   # shown on "Account not found"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # -------------------- Derived helpers -------------------- #
    @property
    def sqlalchemy_database_url(self) -> str:
        if self.DATABASE_URL:
            url = self.DATABASE_URL
            # Railway/Render hand out 'mysql://…' — point it at the installed driver.
            if url.startswith("mysql://"):
                url = "mysql+mysqlconnector://" + url[len("mysql://"):]
            return url
        from urllib.parse import quote_plus
        pwd = quote_plus(self.MYSQL_PASSWORD)
        return (
            f"mysql+mysqlconnector://{self.MYSQL_USER}:{pwd}"
            f"@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DB}"
        )

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
