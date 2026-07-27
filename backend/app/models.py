from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Profile(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    data_json: str = "{}"


class KnowledgeBase(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    description: str = ""
    created_at: datetime = Field(default_factory=utc_now)


class Document(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    kb_id: int = Field(index=True)
    filename: str
    raw_text: str
    created_at: datetime = Field(default_factory=utc_now)


class Conversation(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    created_at: datetime = Field(default_factory=utc_now)


class Message(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    conversation_id: int = Field(index=True)
    role: str
    content: str
    sources_json: str = "[]"
    created_at: datetime = Field(default_factory=utc_now)


class Settings(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    persona_prompt: str
    theme_json: str = "{}"
    model_name: str
    temperature: float = 0.2
    top_k: int = 5
    score_threshold: float = 0.35
