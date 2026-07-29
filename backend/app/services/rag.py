import json
import re
from collections.abc import AsyncIterator

from qdrant_client import AsyncQdrantClient, models

from app.config import AppSettings
from app.schemas import RetrievedSource
from app.services.ollama import OllamaClient

SYSTEM_PROMPT = """You are a factual, supportive personal coach. Use only the supplied CONTEXT.
Do not use outside knowledge and do not invent facts. Reply entirely in the same language
as the QUESTION, regardless of the language used in the context or interface. If the context
does not contain the requested information, say only the equivalent of "I do not have this
information" in the language of the QUESTION. Cite relevant context items when answering."""

INSUFFICIENT_CONTEXT_RESPONSES = {
    "ar": "لا أملك هذه المعلومة.",
    "en": "I do not have this information.",
    "es": "No dispongo de esta información.",
    "fr": "Je ne dispose pas de cette information.",
    "pt": "Não disponho desta informação.",
}

LANGUAGE_MARKERS = {
    "en": {"the", "what", "how", "which", "can", "could", "please", "my", "skills", "experience"},
    "es": {"qué", "que", "cómo", "como", "cuál", "cual", "puedo", "mis", "habilidades", "experiencia"},
    "fr": {"quel", "quelle", "quels", "quelles", "comment", "puis", "mes", "compétences", "experience"},
    "pt": {"como", "quais", "posso", "minhas", "competências", "experiência", "obrigado"},
}


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
            yield self.event("token", {"text": insufficient_context_response(question)})
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


def insufficient_context_response(question: str) -> str:
    if any("\u0600" <= character <= "\u06ff" for character in question):
        return INSUFFICIENT_CONTEXT_RESPONSES["ar"]

    words = set(re.findall(r"[^\W\d_]+", question.casefold(), flags=re.UNICODE))
    language, score = max(
        ((candidate, len(words & markers)) for candidate, markers in LANGUAGE_MARKERS.items()),
        key=lambda result: result[1],
    )
    return INSUFFICIENT_CONTEXT_RESPONSES[language if score else "fr"]
