from datetime import date
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration settings for WindScope UK backend."""
    
    # Elexon API Endpoints
    ELEXON_API_BASE_URL: str = "https://data.elexon.co.uk/bmrs/api/v1"
    FUELHH_ENDPOINT: str = "/datasets/FUELHH/stream"
    WINDFOR_ENDPOINT: str = "/datasets/WINDFOR/stream"
    
    # Delivery Period constraints (Prompt requirement: 1 Jan 2026 to 31 Jan 2026 inclusive)
    MIN_DELIVERY_DATE: date = date(2026, 1, 1)
    MAX_DELIVERY_DATE: date = date(2026, 1, 31)
    
    # Server configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Cache and network timeouts
    CACHE_TTL_SECONDS: int = 300
    REQUEST_TIMEOUT_SECONDS: float = 20.0
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "https://windscope-uk.vercel.app"
    ]
    
    # Domain specific constants
    GENERATION_UNIT: str = "MW"
    FUEL_TYPE_WIND: str = "WIND"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
