# V1 (Claude) vs V2 (tree-sitter) Comparison

## Overview

| Metric | V1 (Claude) | V2 (lyzed-ts) |
|--------|-------------|---------------|
| Generation method | LLM reading source, writing YAML manually | Rust + tree-sitter AST parser |
| YAML files | 40 | 785 |
| Total YAML lines | 2,898 | 142,382 |
| Modules covered | 14 (manually selected) | 31 (all) |
| Files analyzed | ~20 key files | 774 (every .py file) |
| Time to generate | ~10 minutes (multiple LLM calls) | **1.7 seconds** |
| Reproducible | No (LLM output varies) | Yes (deterministic) |
| Dependency graph | No | Yes (deps.yaml) |
| Import tracking | Partial (manual) | Complete (every import) |
| Call graph | Partial (manual, approximate) | Complete (tree-sitter extracted) |
| Line numbers | Approximate | Exact |
| Field types | Accurate (LLM understands types) | Raw (needs type annotation parsing improvement) |

## What V1 does better

- **Semantic context (`ctx:`)**: V1 has human-readable descriptions like "Cache system prompt (default: False)" while V2 has none
- **Purpose descriptions**: V1 has `purpose:` on every file/module; V2 only has docstrings when present
- **Curated tags**: V1 has meaningful tags like `[hitl, approval, confirmation]`; V2 has none
- **Conceptual data entries**: V1 documents patterns like "CEL variables available in evaluator" that aren't in code
- **Organized field categories**: V1 groups Agent's 80+ fields into logical categories
- **Architecture understanding**: V1 knows "13-step pipeline" and "4 TeamMode variants" — V2 just sees raw AST

## What V2 does better

- **Completeness**: 774 files vs ~20 — every single Python file analyzed
- **Accuracy**: Exact line numbers, exact import paths, exact field names from AST
- **Reproducibility**: `cargo run` always produces identical output
- **Speed**: 1.7s vs 10+ minutes
- **Dependency graph**: Cross-module imports and inheritance tracked automatically
- **No hallucination risk**: Everything comes from the AST, nothing invented
- **Call graph**: Every function call extracted from every function body
- **Scalability**: Works on any Python codebase, not just agno

## What V2 is missing (next steps)

1. **Opcode generation (Depth 3)**: Disabled to avoid stack overflow on large files — needs iterative implementation
2. **Type annotation parsing**: Fields show `type: Any` instead of actual annotations from Python type hints
3. **Semantic enrichment**: No `ctx:`, `purpose:`, or `tags:` — needs LLM pass or docstring extraction improvement
4. **Class detection**: Some classes detected as `functions` when they're decorated at module level
5. **Pydantic vs dataclass distinction**: `kind:` classification could be more nuanced
6. **`__all__` export tracking**: Partially implemented but could be improved

## Recommended approach: Hybrid (V3)

1. **V2 (tree-sitter)** generates the structural skeleton — accurate, complete, fast
2. **Claude** enriches with semantic annotations — `ctx:`, `purpose:`, `tags:`, `notes:`
3. Combined output has both machine accuracy and human understanding

## File structure

```
reference/agno/
  lyzed/      ← V1: 40 YAML, 2,898 lines (Claude-generated)
  lyzed-v2/   ← V2: 785 YAML, 142,382 lines (tree-sitter)
```

## Tool

```
tools/lyzed-ts/   ← Rust project
  src/
    main.rs       ← CLI entry, module tree builder
    model.rs      ← Roska-compatible data model (all types)
    parse.rs      ← Tree-sitter Python parser
    emit.rs       ← YAML emitter + dependency graph
```

Usage:
```bash
lyzed-ts --input <python-package-dir> --output <yaml-output-dir> --name <package-name>
```
