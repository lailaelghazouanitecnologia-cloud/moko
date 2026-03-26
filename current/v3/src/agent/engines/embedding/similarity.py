"""
Name normalization and similarity utilities.

Handles the gap between different naming conventions across projects:
  multiply ↔ mul, setFromEulerAngles ↔ fromEuler, lookAt ↔ lookAtTarget
"""
from __future__ import annotations

import math
import re
from collections import Counter


# ── Name Normalization ──────────────────────────────────────

# Common abbreviation expansions
_ABBREVIATIONS = {
    "mul": "multiply",
    "div": "divide",
    "sub": "subtract",
    "add": "add",
    "inv": "invert",
    "norm": "normalize",
    "len": "length",
    "dist": "distance",
    "lerp": "lerp",
    "slerp": "slerp",
    "concat": "concatenate",
    "init": "initialize",
    "calc": "calculate",
    "comp": "compute",
    "vec": "vector",
    "mat": "matrix",
    "quat": "quaternion",
    "rot": "rotation",
    "trans": "translation",
    "pos": "position",
    "dir": "direction",
    "fwd": "forward",
    "bwd": "backward",
    "src": "source",
    "dst": "destination",
    "buf": "buffer",
    "tex": "texture",
    "idx": "index",
    "num": "number",
    "cnt": "count",
    "msg": "message",
    "btn": "button",
    "cb": "callback",
    "fn": "function",
    "ctx": "context",
    "cfg": "config",
    "obj": "object",
    "str": "string",
    "arr": "array",
    "elem": "element",
    "attr": "attribute",
    "prop": "property",
}


class NameNormalizer:
    """Normalizes code identifiers for comparison across projects."""

    @staticmethod
    def split_camel(name: str) -> list[str]:
        """Split camelCase/PascalCase into lowercase tokens.

        setFromEulerAngles → [set, from, euler, angles]
        Mat4 → [mat, 4]
        Float32Array → [float, 32, array]
        """
        # Insert boundary between lower→upper and upper→lower-sequence
        s = re.sub(r'([a-z])([A-Z])', r'\1_\2', name)
        s = re.sub(r'([A-Z]+)([A-Z][a-z])', r'\1_\2', s)
        # Split on _, -, or camelCase boundaries
        tokens = re.split(r'[_\-]+', s)
        return [t.lower() for t in tokens if t]

    @staticmethod
    def expand_abbreviations(tokens: list[str]) -> list[str]:
        """Expand known abbreviations."""
        return [_ABBREVIATIONS.get(t, t) for t in tokens]

    @classmethod
    def normalize(cls, name: str) -> list[str]:
        """Full normalization: split + expand."""
        tokens = cls.split_camel(name)
        return cls.expand_abbreviations(tokens)

    @classmethod
    def normalized_str(cls, name: str) -> str:
        """Normalized name as single string."""
        return "_".join(cls.normalize(name))

    @classmethod
    def similarity(cls, name_a: str, name_b: str) -> float:
        """Token-overlap similarity between two names. 0.0-1.0."""
        tokens_a = set(cls.normalize(name_a))
        tokens_b = set(cls.normalize(name_b))
        if not tokens_a or not tokens_b:
            return 0.0
        intersection = tokens_a & tokens_b
        union = tokens_a | tokens_b
        return len(intersection) / len(union)


# ── Vector Similarity ──────────────────────────────────────

def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Cosine similarity between two vectors."""
    if len(a) != len(b) or not a:
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def tfidf_vectorize(documents: list[str]) -> list[list[float]]:
    """Simple TF-IDF vectorization without external dependencies.

    Each document is a space-separated string of tokens.
    Returns list of TF-IDF vectors (one per document).
    """
    if not documents:
        return []

    # Build vocabulary
    doc_tokens = [doc.lower().split() for doc in documents]
    vocab: dict[str, int] = {}
    df: Counter = Counter()  # document frequency

    for tokens in doc_tokens:
        unique = set(tokens)
        for t in unique:
            df[t] += 1
            if t not in vocab:
                vocab[t] = len(vocab)

    n_docs = len(documents)
    n_terms = len(vocab)
    if n_terms == 0:
        return [[0.0] for _ in documents]

    # Compute TF-IDF
    vectors = []
    for tokens in doc_tokens:
        tf = Counter(tokens)
        vec = [0.0] * n_terms
        for term, count in tf.items():
            idx = vocab[term]
            # TF: log-normalized
            tf_val = 1 + math.log(count) if count > 0 else 0
            # IDF: inverse document frequency
            idf_val = math.log(n_docs / (1 + df[term]))
            vec[idx] = tf_val * idf_val
        # L2 normalize
        norm = math.sqrt(sum(x * x for x in vec))
        if norm > 0:
            vec = [x / norm for x in vec]
        vectors.append(vec)

    return vectors
