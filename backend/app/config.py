from functools import lru_cache
from pathlib import Path
from urllib.parse import urlparse

from pydantic_settings import BaseSettings, SettingsConfigDict


DEFAULT_DATABASE_PATH = Path(__file__).resolve().parents[1] / "assistant.db"


class AppSettings(BaseSettings):
    """Configuration constrained to services hosted on the local machine."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "Assistant personnel RAG local"
    database_url: str = f"sqlite:///{DEFAULT_DATABASE_PATH.as_posix()}"
    ollama_base_url: str = "http://localhost:11434"
    qdrant_url: str = "http://localhost:6333"
    qdrant_collection: str = "personal_assistant_chunks"
    llm_model: str = "llama3.1:8b"
    embedding_model: str = "nomic-embed-text:latest"
    default_temperature: float = 0.2
    default_top_k: int = 5
    default_score_threshold: float = 0.35

    def validate_local_services(self) -> None:
        for service_url in (self.ollama_base_url, self.qdrant_url):
            hostname = urlparse(service_url).hostname
            if hostname not in {"localhost", "127.0.0.1", "::1"}:
                raise ValueError(f"Service non local refuse: {service_url}")


@lru_cache
def get_settings() -> AppSettings:
    settings = AppSettings()
    settings.validate_local_services()
    return settings
