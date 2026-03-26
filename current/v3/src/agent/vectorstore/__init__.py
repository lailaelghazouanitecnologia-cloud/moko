from .search import VectorStore, SearchResult
from .embeddings import EmbeddingProvider

# Indexer imported lazily since it requires lancedb
def get_indexer():
    from .indexer import Indexer
    return Indexer
