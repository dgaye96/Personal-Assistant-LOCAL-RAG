import json
from collections.abc import AsyncIterator

import httpx

from app.config import AppSettings


class OllamaClient:
    """Small client for Ollama's native API, served only from localhost."""

    def __init__(self, settings: AppSettings):
        self.base_url = settings.ollama_base_url.rstrip("/")
        self.embedding_model = settings.embedding_model
        self.llm_model = settings.llm_model

    async def list_models(self) -> list[dict]:
        """Returns all locally available Ollama models."""
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{self.base_url}/api/tags")
            response.raise_for_status()
        return response.json().get("models", [])

    async def embed(self, text: str) -> list[float]:
        payload = {"model": self.embedding_model, "input": text}
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(f"{self.base_url}/api/embed", json=payload)
            response.raise_for_status()
        return response.json()["embeddings"][0]

    async def stream_chat(self, messages: list[dict[str, str]], temperature: float, model: str | None = None) -> AsyncIterator[str]:
        payload = {
            "model": model or self.llm_model,
            "messages": messages,
            "options": {"temperature": temperature},
            "stream": True,
        }
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream("POST", f"{self.base_url}/api/chat", json=payload) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line:
                        continue
                    chunk = json.loads(line)
                    token = chunk.get("message", {}).get("content", "")
                    if token:
                        yield token
