from datetime import datetime

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=12_000)
    kb_ids: list[int] = Field(default_factory=list)
    conversation_id: int | None = None
    model_id: str | None = None


class MessageUpdateRequest(BaseModel):
    question: str = Field(min_length=1, max_length=12_000)
    kb_ids: list[int] = Field(default_factory=list)
    model_id: str | None = None


class ConversationUpdateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=120)


class RetrievedSource(BaseModel):
    document_id: int
    chunk_index: int
    text: str
    source: str
    score: float


class IngestResponse(BaseModel):
    document_id: int
    kb_id: int
    filename: str
    chunks_indexed: int


class KnowledgeBaseCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=500)


class KnowledgeBaseUpdate(KnowledgeBaseCreate):
    pass


class KnowledgeBaseResponse(BaseModel):
    id: int
    name: str
    description: str
    created_at: datetime
    document_count: int


class ConversationSummary(BaseModel):
    id: int
    title: str
    created_at: datetime


class StoredMessage(BaseModel):
    id: int
    role: str
    content: str
    sources: list[RetrievedSource] = Field(default_factory=list)
    created_at: datetime


class ConversationDetail(ConversationSummary):
    messages: list[StoredMessage]
