# Project Intelligence: ava-self

> An autonomous AI development agent that iteratively builds software by orchestrating specialized actors, agents, and engines while maintaining blockchain-style plans and evaluation branches.
> **Domain**: ai_agents | **Language**: python | **Size**: large | **Maturity**: beta

## Metrics

| Metric | Value |
|--------|-------|
| Total LOC | 39,344 |
| Modules | 13 |
| Types | 65 |
| Functions | 138 |
| Avg LOC/module | 2961 |
| Median LOC/type | 95 |
| Avg methods/type | 5.2 |
| Async ratio | 0% |

## Programming Style

**Naming**: snake_case modules, PascalCase classes, snake_case methods
  Examples: `Supervisor`, `__init__`, `vector_store`
**Error handling**: exceptions
**Async**: async/await
**Typing**: basic, dataclasses
**Docs**: rich module docs, sparse comments
**Organization**: always file-per-class, barrel exports: yes

## Architectural Patterns

### actor-registry-dispatch
**What**: Maps block types to specialized actors for modular execution
**How**: Registry pattern with BaseActor protocol - each actor implements execute() and handles specific BlockType (analyze, implement, test, etc.)
**Components**: ActorRegistry, BaseActor, BlockType
**Where**: actors/base.py (150 LOC)
**Reusable when**: When you need pluggable workers for different task types

### state-matrix-compression
**What**: Virtual machine that tracks analysis state to minimize LLM tokens
**How**: Maintains compressed representation of what LLM already knows instead of dumping raw YAML, with analysis states and budget-aware loading
**Components**: StateMatrix, AnalysisState, what_to_load()
**Where**: pipeline/matrix.py (400 LOC)
**Reusable when**: When context window management is critical for LLM interactions

### blockchain-style-planning
**What**: Immutable plan chain with branching for evaluations
**How**: Project → Branches → Plan → Blocks hierarchy where each Branch maintains a blockchain of Blocks with status tracking and parallel execution
**Components**: Branch, Project, Block, BlockStatus
**Where**: core/models.py (500 LOC)
**Reusable when**: When you need reproducible, auditable execution chains

### intelligent-context-compression
**What**: 5-stage compression pipeline for Roska descriptors
**How**: Signature truncation, type filtering, method pruning, field sampling, and YAML minification to fit token limits
**Components**: Compressor, compression_strategies
**Where**: pipeline/compressor.py (300 LOC)
**Reusable when**: When dealing with large codebases that exceed LLM context limits

### guardrails-budget-enforcement
**What**: Centralized safety limits with cumulative usage tracking
**How**: RunGuard instance shared across all components tracks tokens, blocks, plan size and throttles/halts when limits exceeded
**Components**: RunGuard, GuardrailTripped, RunLimits
**Where**: core/guardrails.py (400 LOC)
**Reusable when**: When preventing runaway AI agent costs is critical

## Features

| Feature | Description | Algorithm | Complexity | LOC |
|---------|-------------|-----------|------------|-----|
| **multi-agent-architecture-analysis** | Specialized agents analyze different aspects of codebase architecture | ActionPipeline with compression and state matrix - architect agent uses intelligent context building with module-focused pipeline | high | 800 |
| **structured-discussion-system** | Multi-stance debates within execution blocks | DiscussantActor cycles through stances (advocate, critic, pragmatist, architect) for comprehensive analysis | medium | 200 |
| **evaluation-branching-system** | A/B testing different implementations of same type | Evaluation branches re-implement single types with different algorithms, then benchmark against main branch | high | 600 |
| **semantic-vector-search** | Hybrid search combining vector similarity with structured filters | LanceDB with Nomic embeddings + voyage API, supports semantic search with project/type filters | medium | 400 |
| **auto-fix-compilation-errors** | Intelligent compilation error fixing with multiple strategies | Error clustering + strategy pattern - SyntaxStrategy, ImportStrategy, ConstructorTypoStrategy applied based on error type | high | 500 |
| **quality-classification-tree** | Decision tree classifier for code quality issues | Custom tree building with entropy-based splits, max depth 6, min leaf 3 for quality prediction | medium | 300 |
| **resumable-session-state** | Persistent state enabling resume of interrupted generation runs | Saves after each module completion with goal, spec, completed modules, tokens used - supports ava dev --resume | low | 200 |
| **emission-index-matching** | Finds relevant reference implementations for blueprint types | EmissionIndex matches TypeBlueprint methods against Roska descriptors across all reference projects for intelligent reference selection | medium | 300 |

## Design Decisions

| Area | Choice | Rationale |
|------|--------|-----------|
| architecture | Actor-based system with registry pattern instead of monolithic supervisor | Extracted 1705-LOC god object into specialized actors for maintainability and testability |
| context_management | State matrix + compression pipeline instead of raw YAML dumping | Reduces LLM tokens by 60-80% while maintaining relevant context for large codebases |
| evaluation | Blockchain-style branching with evaluation branches for A/B testing | Enables safe experimentation and benchmarking without corrupting main development chain |
| error_handling | Structured exception hierarchy with recoverable errors | Replaces generic Exception catching with specific error types for better error recovery |
| identity | Roska descriptors as universal code representation format | Enables consistent analysis across languages and projects with structured metadata |
| persistence | LanceDB for vector store with per-type descriptor splitting | Better embedding quality for large files while maintaining fast semantic search |

## Dependency Graph

**Style**: flat | **Coupling**: loose | **Hub**: dev
```
  L0: [actors, agents, engines, llm, pipeline, prompts, session, tools, vectorstore, xvm]
  L1: [core, dev, duel]
```

## Quality Calibration

| Metric | P25 | Median | P75 | Max |
|--------|-----|--------|-----|-----|
| LOC/type | 24 | 95 | 210 | 1730 |
| Methods/type | 2 | 4 | 8 | 24 |
| LOC/function | 6 | 15 | 38 | 611 |
| Error handling: moderate | Test coverage: none |
