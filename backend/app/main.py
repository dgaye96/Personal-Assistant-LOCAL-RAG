from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.chat import router as chat_router
from app.api.ingestion import router as ingestion_router
from app.api.knowledge_bases import router as knowledge_bases_router
from app.config import get_settings
from app.db import create_db_and_tables
from app.services.ingestion import IngestionService
from app.services.rag import RagService

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    app.state.rag_service = RagService(settings)
    app.state.ingestion_service = IngestionService(app.state.rag_service)
    yield
    await app.state.rag_service.qdrant.close()


app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(chat_router)
app.include_router(ingestion_router)
app.include_router(knowledge_bases_router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "mode": "local-only"}
