# Project Intelligence: codex

> AI-powered code execution and modification engine that safely runs generated code in sandboxed environments
> **Domain**: ai_agents | **Language**: typescript | **Size**: medium | **Maturity**: beta

## Metrics

| Metric | Value |
|--------|-------|
| Total LOC | 7,210 |
| Modules | 2 |
| Types | 0 |
| Functions | 0 |
| Avg LOC/module | 3605 |
| Median LOC/type | 7 |
| Avg methods/type | 0.0 |
| Async ratio | 18% |

## Programming Style

**Naming**: snake_case modules, PascalCase classes, camelCase methods
  Examples: `AbsolutePathBuf`, `constructor`, `startThread`
**Error handling**: mixed
**Async**: asyncio
**Typing**: strict, generics, dataclasses
**Docs**: brief module docs, sparse comments
**Organization**: always file-per-class, barrel exports: no

## Architectural Patterns

### streaming-async-generator
**What**: Processes code execution results as real-time streams using async generators
**How**: CodexExec.run() returns AsyncGenerator<string> that yields execution output chunks, enabling real-time feedback without blocking
**Components**: CodexExec, AsyncGenerator
**Where**: exec (200 LOC)
**Reusable when**: Need real-time processing of long-running operations

### event-driven-turn-state
**What**: Manages conversation state through discrete events rather than direct state mutation
**How**: ThreadStartedEvent, TurnStartedEvent, TurnCompletedEvent form a state machine that tracks execution lifecycle without tight coupling
**Components**: ThreadStartedEvent, TurnStartedEvent, TurnCompletedEvent
**Where**: events (150 LOC)
**Reusable when**: Building stateful conversational interfaces

### sandboxed-execution-context
**What**: Isolates code execution in configurable sandbox environments with approval workflows
**How**: SandboxMode and ApprovalMode enums control execution permissions, while CodexExecArgs provides 17 configuration fields for fine-grained control
**Components**: SandboxMode, ApprovalMode, CodexExecArgs
**Where**: threadOptions (300 LOC)
**Reusable when**: Need secure code execution in AI systems

### patch-based-file-updates
**What**: Applies code changes through structured patches rather than full file rewrites
**How**: FileUpdateChange with PatchChangeKind and PatchApplyStatus provide atomic, reversible file modifications
**Components**: FileUpdateChange, PatchChangeKind, PatchApplyStatus
**Where**: items (250 LOC)
**Reusable when**: Implementing safe file modification systems

## Features

| Feature | Description | Algorithm | Complexity | LOC |
|---------|-------------|-----------|------------|-----|
| **streaming_code_execution** | Executes AI-generated code in real-time with live output streaming | AsyncGenerator pattern yields execution output chunks as they become available, enabling responsive UI updates during long-running operations | medium | 400 |
| **multi_turn_conversations** | Maintains conversation context across multiple code execution turns | Turn-based state machine tracks execution history and context, enabling iterative refinement of code solutions | high | 600 |
| **configurable_sandboxing** | Provides multiple sandbox modes for code execution security | SandboxMode enum with approval workflows controls file system, network, and process access permissions | medium | 300 |
| **usage_tracking** | Tracks resource usage across code executions for cost and performance monitoring | Usage type captures input_tokens, output_tokens, and total_tokens for each execution | low | 150 |
| **patch_application_engine** | Safely applies code patches with rollback capability | Patch-based changes with apply status tracking ensure atomic file modifications | medium | 400 |
| **web_search_integration** | Controls whether AI agents can perform web searches during code generation | WebSearchMode enum enables/disables internet access for fetching documentation or examples | low | 100 |
| **reasoning_effort_control** | Adjusts AI reasoning depth for code generation tasks | ModelReasoningEffort enum controls computational effort spent on reasoning through solutions | low | 100 |

## Design Decisions

| Area | Choice | Rationale |
|------|--------|-----------|
| architecture | Event-driven state management over direct state mutation | Enables loose coupling between execution engine and UI components, supports multiple consumers of execution events |
| error_handling | Separate TurnFailedEvent instead of exceptions for execution failures | Maintains stream continuity and provides structured error information without breaking the async generator flow |
| coupling | 17-field configuration object (CodexExecArgs) instead of parameter lists | Provides extensibility for execution options while maintaining backward compatibility as new features are added |
| identity | TypeScript typealiases over classes for data structures | Reduces boilerplate while maintaining type safety, aligns with functional programming patterns in the codebase |
| persistence | Patch-based file updates instead of full file rewrites | Enables atomic changes, supports rollback mechanisms, and reduces I/O overhead for large files |

## Dependency Graph

**Style**: flat | **Coupling**: loose | **Hub**: codex-rs
```
  L0: [codex-rs, sdk]
```

## Quality Calibration

| Metric | P25 | Median | P75 | Max |
|--------|-----|--------|-----|-----|
| LOC/type | 4 | 7 | 10 | 170 |
| Methods/type | 0 | 0 | 0 | 5 |
| LOC/function | 4 | 11 | 20 | 154 |
| Error handling: moderate | Test coverage: none |
