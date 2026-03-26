"""
Embedding Provider — abstraction over local and API-based embedding models.

Supports:
- local: Nomic Embed Code v1.5 (768-dim, 137M params, runs on CPU)
- voyage: VoyageCode3 (1024-dim, code-specialized API)
- openai: text-embedding-3-small (1536-dim, general-purpose API)
"""

import os
from typing import Optional


class EmbeddingProvider:
    """Uniform embedding interface for local and API models."""

    def __init__(self, provider: str = "local"):
        self.provider = provider
        self._model = None
        self._client = None
        self.dim = 0
        self._init_provider()

    def _init_provider(self):
        if self.provider == "local":
            try:
                from sentence_transformers import SentenceTransformer
                self._model = SentenceTransformer(
                    "nomic-ai/nomic-embed-text-v1.5",
                    trust_remote_code=True,
                )
                self.dim = 768
            except ImportError:
                raise ImportError(
                    "sentence-transformers required for local embeddings. "
                    "Install: pip install sentence-transformers"
                )
        elif self.provider == "voyage":
            try:
                import voyageai
                self._client = voyageai.Client(
                    api_key=os.environ.get("VOYAGE_API_KEY", "")
                )
                self.dim = 1024
            except ImportError:
                raise ImportError("voyageai required. Install: pip install voyageai")
        elif self.provider == "openai":
            try:
                from openai import OpenAI
                self._client = OpenAI(
                    api_key=os.environ.get("OPENAI_API_KEY", "")
                )
                self.dim = 1536
            except ImportError:
                raise ImportError("openai required. Install: pip install openai")
        else:
            raise ValueError(f"Unknown embedding provider: {self.provider}")

    def embed(self, texts: list[str]) -> list[list[float]]:
        """Batch embed texts. Returns list of vectors."""
        if not texts:
            return []

        if self.provider == "local":
            # Nomic expects "search_document: " prefix for documents
            prefixed = [f"search_document: {t}" for t in texts]
            vectors = self._model.encode(prefixed, normalize_embeddings=True)
            return vectors.tolist()

        elif self.provider == "voyage":
            result = self._client.embed(
                texts, model="voyage-code-3", input_type="document"
            )
            return result.embeddings

        elif self.provider == "openai":
            result = self._client.embeddings.create(
                input=texts, model="text-embedding-3-small"
            )
            return [d.embedding for d in result.data]

    def embed_query(self, text: str) -> list[float]:
        """Embed a single query. Uses query prefix for models that need it."""
        if self.provider == "local":
            prefixed = f"search_query: {text}"
            vector = self._model.encode([prefixed], normalize_embeddings=True)
            return vector.tolist()[0]

        elif self.provider == "voyage":
            result = self._client.embed(
                [text], model="voyage-code-3", input_type="query"
            )
            return result.embeddings[0]

        elif self.provider == "openai":
            result = self._client.embeddings.create(
                input=[text], model="text-embedding-3-small"
            )
            return result.data[0].embedding
