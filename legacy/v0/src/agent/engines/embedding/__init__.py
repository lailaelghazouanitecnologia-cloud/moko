"""Embedding engine — semantic search over code and descriptors."""
from .store import SemanticStore
from .similarity import NameNormalizer, cosine_similarity
