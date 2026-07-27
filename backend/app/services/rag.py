import json
from collections.abc import AsyncIterator

from qdrant_client import AsyncQdrantClient, models

from app.config import AppSettings
from app.schemas import RetrievedSource
from app.services.ollama import OllamaClient

SYSTEM_PROMPT = """Tu es un coach personnel factuel et bienveillant. Réponds uniquement
a partir du CONTEXTE fourni. N'utilise aucune connaissance extérieure et n'invente rien.
Si le contexte ne contient pas l'information demandée, réponds exactement :
« je ne dispose pas de cette information ». Cite les éléments de contexte pertinents."""


class RagService:
    def __init__(self, settings: AppSettings):
        self.settings = settings
        self.ollama = OllamaClient(settings)
        self.qdrant = AsyncQdrantClient(url=settings.qdrant_url)

    async def retrieve(self, question: str, kb_ids: list[int]) -> list[RetrievedSource]:
        embedding = await self.ollama.embed(question)
        await self.ensure_collection(len(embedding))
        query_filter = None
        if kb_ids:
            query_filter = models.Filter(
                must=[models.FieldCondition(key="kb_id", match=models.MatchAny(any=kb_ids))]
            )
        result = await self.qdrant.query_points(
            collection_name=self.settings.qdrant_collection,
            query=embedding,
            query_filter=query_filter,
            limit=self.settings.default_top_k,
            score_threshold=self.settings.default_score_threshold,
            with_payload=True,
        )
        return [
            RetrievedSource(
                document_id=point.payload["document_id"],
                chunk_index=point.payload["chunk_index"],
                text=point.payload["text"],
                source=point.payload["source"],
                score=point.score,
            )
            for point in result.points
        ]

    async def ensure_collection(self, vector_size: int) -> None:
        if await self.qdrant.collection_exists(self.settings.qdrant_collection):
            return
        await self.qdrant.create_collection(
            collection_name=self.settings.qdrant_collection,
            vectors_config=models.VectorParams(size=vector_size, distance=models.Distance.COSINE),
        )

    async def answer(self, question: str, kb_ids: list[int]) -> AsyncIterator[str]:
        try:
            sources = await self.retrieve(question, kb_ids)
        except Exception as error:
            yield self.event("error", {"message": f"Service RAG local indisponible : {error}"})
            return

        if not sources:
            yield self.event("token", {"text": "information insuffisante"})
            yield self.event("sources", {"items": []})
            yield self.event("done", {})
            return

        context = "\n\n".join(
            f"[Source {index + 1} | {source.source}]\n{source.text}"
            for index, source in enumerate(sources)
        )
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"CONTEXTE:\n{context}\n\nQUESTION:\n{question}"},
        ]
        try:
            async for token in self.ollama.stream_chat(messages, self.settings.default_temperature):
                yield self.event("token", {"text": token})
        except Exception as error:
            yield self.event("error", {"message": f"Modele local indisponible : {error}"})
            return
        yield self.event("sources", {"items": [source.model_dump() for source in sources]})
        yield self.event("done", {})

    @staticmethod
    def event(name: str, data: dict) -> str:
        return f"event: {name}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
