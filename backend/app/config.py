"""Application settings — single source of truth for env-driven config."""
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    database_url: str = "sqlite:///./adult_edu.db"
    jwt_secret: str = "dev-only-please-change-in-prod"
    jwt_alg: str = "HS256"
    jwt_expire_min: int = 7200

    # 当为 true 时允许审核员通过自己最后编辑的题目（默认禁止，符合文档 §6.13）
    review_self_approve_allowed: bool = False

    # 微信小程序后台的 AppID/AppSecret，用于 jscode2session
    wechat_appid: str = ""
    wechat_secret: str = ""

    admin_default_password: str = "Admin@123"

    upload_dir: Path = UPLOAD_DIR
    static_url_prefix: str = "/static"

    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://192.168.1.2:5173",
    ]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
