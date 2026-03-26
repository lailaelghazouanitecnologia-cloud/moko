"""
Retrieval — consolidated search and matching.

Merges: tools/emission, engines/embedding, engines/memory, vectorstore
into one coherent retrieval layer.
"""
from ...tools.emission import EmissionIndex, EmissionMatch
from ..embedding.store import SemanticStore
from ..embedding.similarity import cosine_similarity
from ..memory.block_store import CodeBlockStore, CodeBlock

__all__ = [
    "EmissionIndex", "EmissionMatch",
    "SemanticStore",
    "cosine_similarity",
    "CodeBlockStore", "CodeBlock",
]
