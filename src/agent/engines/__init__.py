"""
Engines — reusable, composable subsystems for the dev pipeline.

engines/
  tool/        — project introspection (scanner, graph, validator, import resolver)
  embedding/   — semantic search with TF-IDF + optional API embeddings
  memory/      — persistent code block storage for reuse across runs
  prompt/      — structured prompts for blueprint composition
  blueprint/   — source extraction + multi-source blueprint composition
"""
from .embedding.store import SemanticStore
from .memory.block_store import CodeBlockStore, CodeBlock
from .blueprint.extractor import SourceExtractor, ExtractedType, ExtractedMethod
from .blueprint.composer import BlueprintComposer, CompositionPlan
from .tool import (
    FileScanner, ProjectGraph, SharedTypeDetector,
    ImportResolver, PostGenValidator,
)

__all__ = [
    "SemanticStore",
    "CodeBlockStore", "CodeBlock",
    "SourceExtractor", "ExtractedType", "ExtractedMethod",
    "BlueprintComposer", "CompositionPlan",
    "FileScanner", "ProjectGraph", "SharedTypeDetector",
    "ImportResolver", "PostGenValidator",
]
