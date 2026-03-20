# Roska Deep Analysis — AI Coding Agents (2025)

*Generated: 2026-03-20 — Roska Code Intelligence Compiler*

> **Agents analyzed**: Codex CLI (OpenAI), Cline, Kilo Code, Aider, Roo Code
> **Not available (closed-source)**: Claude Code (Anthropic), Antigravity (Google DeepMind), Cursor

---

## 1. Overview

| Agent | Language | Files | Lines of Code | Types | Modules | Architecture |
|-------|----------|------:|-------------:|------:|--------:|--------------|
| **Roo Code** | TypeScript | 1,792 | 395,370 | ~1,540 | 4 | Monorepo VSCode ext + CLI + Web |
| **Kilo Code** | TypeScript | 1,931 | 356,039 | ~230 | 6 | Monorepo multi-platform |
| **Cline** | TypeScript | 567 | 96,617 | ~139 | 16 | VSCode extension |
| **Aider** | Python | 147 | 38,223 | 79 | 4 | CLI (terminal-native) |
| **Codex CLI** | Rust + TS | 443 | 7,390 | ~600 (protocol) | 3 | Rust core + TS SDK |

### Scale Visualization

```
Roo Code    395,370 LOC  ██████████████████████████████████████████████████
Kilo Code   356,039 LOC  █████████████████████████████████████████████
Cline        96,617 LOC  ████████████
Aider        38,223 LOC  █████
Codex CLI     7,390 LOC  █
```

**Key insight**: Roo Code (fork of Cline) is 4x the size of Cline — the fork has grown massively. Codex CLI is tiny but dense (Rust core).

---

## 2. Architecture Comparison

### 2.1 Execution Model

| Agent | Model | Description |
|-------|-------|-------------|
| **Aider** | **Coder Strategy** | `Coder` base class with 16 strategies (EditBlock, UDiff, Patch, Whole, Architect...). Each strategy defines how LLM edits are applied to files. |
| **Cline** | **Task Loop** | Single `Task` class (3,756 LOC) with recursive `recursivelyMakeClineRequests()`. Tools executed via `ToolExecutor` with 24 handlers. |
| **Roo Code** | **Task Loop + Services** | Fork of Cline's Task loop + added `CodeIndexManager`, `SkillsManager`, `McpHub`. Task.ts grew to 4,730 LOC. |
| **Kilo Code** | **Agent Manager** | `AgentManagerProvider` orchestrates sessions via `WorktreeManager` (git worktrees). Each agent runs in an isolated worktree. |
| **Codex CLI** | **Thread/Turn Protocol** | Rust core defines a `Thread` → `Turn` → `Item` protocol. TypeScript SDK wraps the protocol. Minimal, protocol-first. |

### 2.2 Edit Strategies

| Agent | Edit Method | Diff Format |
|-------|-------------|-------------|
| **Aider** | 16 strategies: EditBlock (search/replace), UDiff, Patch, Wholefile, Architect (plan→edit), Function-level, Editor-mode | LLM chooses format per task |
| **Cline** | `WriteToFileTool`, `ApplyPatchHandler` | Patch-based + full file write |
| **Roo Code** | `EditFileTool`, `ApplyDiffTool`, `ApplyPatchTool`, `SearchReplaceTool` | 4 strategies (expanded from Cline) |
| **Kilo Code** | Via agent sessions in worktrees | Git-based (worktree isolation) |
| **Codex CLI** | `ApplyPatchApprovalParams` in protocol | Patch with approval workflow |

**Winner: Aider** — 16 edit strategies is unmatched. The `ArchitectCoder` → `EditorCoder` pipeline (plan then edit) is particularly elegant.

### 2.3 LLM Provider Support

| Agent | Providers | Abstraction |
|-------|----------:|-------------|
| **Roo Code** | **34** | `BaseProvider` + `BaseOpenAiCompatibleProvider` + `RouterProvider` |
| **Cline** | **40+** | `ApiHandler` interface + factory `createHandlerForProvider()` |
| **Kilo Code** | ~20+ | Via `kilo-gateway` server routing |
| **Aider** | **All (via LiteLLM)** | `Model(ModelSettings)` wraps LiteLLM = any provider |
| **Codex CLI** | OpenAI only | Protocol-locked to OpenAI API |

**Winner: Aider** — LiteLLM gives instant access to 100+ providers with zero custom code. Cline/Roo Code implement each provider manually (more control but massive maintenance).

### 2.4 Context Management

| Agent | Strategy | Key Mechanism |
|-------|----------|---------------|
| **Aider** | **RepoMap** (867 LOC) | Tree-sitter → semantic code structure → tag-based context. `ChatSummary` for history compression. |
| **Cline** | **ContextManager** (1,295 LOC) | `FileContextTracker` + `ModelContextTracker` + `EnvironmentContextTracker`. Intelligent truncation. |
| **Roo Code** | **CodeIndexManager** (19,119 LOC) | Vector embeddings + caching + state management. Full code indexing with orchestrator pattern. |
| **Kilo Code** | **Context API** | 26 React contexts for state. `file-content-eviction-accounting` for memory management. |
| **Codex CLI** | **Thread-scoped** | Context lives within Thread → Turn lifecycle. Minimal, protocol-managed. |

**Winner: Roo Code** for depth (vector indexing), **Aider** for elegance (RepoMap semantic structure).

---

## 3. Tool Systems

### 3.1 Tool Count & Categories

| Agent | Tools | Categories |
|-------|------:|------------|
| **Cline** | 24 | File ops, execution, browser, MCP, UI, code analysis |
| **Roo Code** | 22+ | File ops, execution, search/replace, diff, patch, MCP, skills |
| **Kilo Code** | ~15 | Via agent sessions + services (autocomplete, browser, code actions) |
| **Aider** | 50+ commands | `/add`, `/drop`, `/commit`, `/lint`, `/voice`, `/web`, `/architect`... |
| **Codex CLI** | Protocol-defined | `LocalShellAction`, `WebSearchAction`, file ops via approval system |

### 3.2 Unique Tools

| Agent | Unique Capability |
|-------|-------------------|
| **Aider** | `/voice` (audio transcription), `/architect` (plan→edit), `ClipboardWatcher`, `FileWatcher` (AI comment detection) |
| **Cline** | `BrowserToolHandler` (CDP), `SubagentToolHandler`, `CondenseHandler` |
| **Roo Code** | `SkillTool` (skills framework), `NewTaskTool`, `CodeIndexManager` (vector search) |
| **Kilo Code** | `WorktreeManager` (git worktree isolation), `SetupScriptService`, multi-platform TUI |
| **Codex CLI** | `GuardianApprovalReview`, `CollabAgentState` (multi-agent), risk-level assessment |

---

## 4. Class Hierarchy Deep-Dive

### 4.1 Aider — Coder Strategy Tree

```
Coder (base_coder.py, 2,485 LOC)
├── EditBlockCoder (657 LOC)        — search/replace blocks
├── UDiffCoder (429 LOC)            — unified diff
├── PatchCoder (706 LOC)            — custom patch format
├── WholeCoder (144 LOC)            — full file replacement
├── SingleWholefileFuncCoder        — single function replacement
├── WholefileFuncCoder              — multi-function replacement
├── EditblockFuncCoder              — editblock per function
├── AskCoder                        — query-only (no edits)
├── ContextCoder                    — context analysis
├── ArchitectCoder                  — architecture planning
│   └── (delegates to EditorCoder for execution)
├── HelpCoder                       — documentation search
├── EditorWholeCoder                — editor-based whole file
├── EditorEditblockCoder            — editor-based editblock
├── EditorDiffFencedCoder           — editor-based diff
└── UDiffSimple                     — simplified unified diff

Each Coder has a matching *Prompts class (18 prompt classes total)
```

### 4.2 Cline — Provider Factory

```
ApiHandler (interface)
├── AnthropicHandler
├── OpenAiHandler
├── GeminiHandler
├── BedrockHandler
├── VertexHandler
├── OllamaHandler
├── LmStudioHandler
├── DeepSeekHandler
├── GroqHandler
├── MistralHandler
├── QwenHandler
└── ... (40+ implementations)

createHandlerForProvider() → ApiHandler  (factory)
```

### 4.3 Roo Code — Extended Provider + Services

```
BaseProvider (abstract)
├── BaseOpenAiCompatibleProvider
│   ├── OpenAiHandler
│   ├── OllamaHandler
│   ├── DeepSeekHandler
│   └── ... (20+ compatible)
├── AnthropicHandler
├── BedrockHandler
├── VertexHandler
├── RouterProvider (model routing)
└── ... (34 total)

Services Layer:
├── CodeIndexManager
│   ├── CodeIndexOrchestrator
│   ├── CacheManager
│   └── StateManager
├── McpServerManager / McpHub
├── SkillsManager
├── MdmService
└── RipgrepService
```

### 4.4 Kilo Code — Multi-Platform

```
Packages:
├── app/ (React Web UI)
│   └── 26 React Contexts for state
├── desktop-electron/ (Desktop)
│   ├── cli.ts (6 types)
│   ├── ipc.ts (IPC bridge)
│   └── windows.ts
├── kilo-vscode/ (VS Code Extension)
│   ├── AgentManagerProvider
│   │   ├── WorktreeManager (7 types)
│   │   ├── WorktreeStateManager (4 types)
│   │   ├── GitOps (7 types)
│   │   ├── GitStatsPoller (6 types)
│   │   └── SessionTerminalManager (4 types)
│   └── KiloProvider (2,573 LOC)
├── kilo-gateway/ (Server)
└── kilo-ui/ (Component Library)
```

### 4.5 Codex CLI — Protocol-First

```
Rust Core (codex-rs):
└── app-server-protocol/
    ├── ClientRequest / ServerRequest
    ├── ClientNotification / ServerNotification
    ├── Thread → Turn → Item lifecycle
    └── 600+ generated TypeScript types

TypeScript SDK:
├── Codex (main class)
├── Thread (session)
├── TurnOptions
└── ExecutionItem / ExecutionEvent

v2 Protocol:
├── CollabAgent* (multi-agent)
├── Guardian* (approval)
├── Config* (layered config)
└── Skill* (skill system)
```

---

## 5. Pattern Matrix

| Pattern | Aider | Cline | Roo Code | Kilo Code | Codex CLI |
|---------|:-----:|:-----:|:--------:|:---------:|:---------:|
| Agent-based | ● | ● | ● | ● | ● |
| Multi-agent | | | | | ● |
| Tool-use | ● | ● | ● | ● | ● |
| Task-oriented | ● | ● | ● | ● | ● |
| Plugin/Extension | | ● | ● | ● | ● |
| Event-driven | ● | ● | ● | ● | ● |
| Memory/State | | ● | ● | ● | |
| API Server | | ● | | ● | |
| Streaming | ● | ● | ● | ● | ● |
| MCP Integration | | ● | ● | ● | ● |
| Git Integration | ● | ● | ● | ● | ● |
| Worktree Isolation | | | | ● | |
| Vector Indexing | | | ● | | |
| Voice Input | ● | | | | |
| Browser Control | | ● | ● | ● | |
| Multi-platform | | | ● | ● | |
| i18n | | | | ● | |

---

## 6. Strengths & Weaknesses

### Aider
**Strengths:**
- Most edit strategies (16) — the right format for each task
- Simplest architecture, easiest to understand (38K LOC)
- LiteLLM = every provider for free
- RepoMap gives semantic understanding of entire repo
- Only agent with voice input
- Strong test suite (32% of codebase)

**Weaknesses:**
- Terminal-only (no IDE integration)
- No MCP support
- No browser automation
- Single-agent only
- No plugin/extension system

### Cline
**Strengths:**
- Clean interface-driven design (`ApiHandler`, `ToolExecutor`)
- 40+ LLM providers (manually implemented = full control)
- 24 specialized tools
- Hook system (7 lifecycle hooks)
- Context management with 3 trackers

**Weaknesses:**
- `Task.index.ts` at 3,756 LOC is a god class
- VSCode-only
- No code indexing/vector search
- No worktree isolation

### Roo Code
**Strengths:**
- Largest feature set (395K LOC)
- 34 LLM providers
- Vector code indexing (CodeIndexManager, 19K LOC)
- Skills framework
- MCP integration
- CLI + VSCode + Web platforms

**Weaknesses:**
- Massive codebase (hard to maintain)
- Task.ts grew to 4,730 LOC (fork bloat)
- Inherited Cline's architectural debt
- 1,540 types = high complexity

### Kilo Code
**Strengths:**
- **Worktree isolation** — unique! Each agent runs in its own git worktree
- Multi-platform: Web, Desktop (Electron), VSCode, TUI
- 16 languages (i18n)
- Clean monorepo structure
- Agent Manager pattern with session lifecycle

**Weaknesses:**
- 356K LOC but lower type density (fragmented)
- Desktop app adds complexity
- Less mature tool system vs Cline/Roo

### Codex CLI
**Strengths:**
- **Smallest, most focused** (7.4K LOC)
- **Rust core** = performance
- Protocol-first design (600+ types, auto-generated)
- Guardian approval system (safety-first)
- v2 protocol has multi-agent (CollabAgent)
- Layered config system

**Weaknesses:**
- OpenAI-only (no other providers)
- Minimal tool set
- No IDE integration in core (SDK only)
- Young project, limited features

---

## 7. What Each Can Learn from the Others

| From → To | Lesson |
|-----------|--------|
| Aider → All | **Edit strategy variety**. 16 strategies vs 1-4 in others. The Architect→Editor pipeline should be standard. |
| Aider → Cline/Roo | **LiteLLM integration**. Stop implementing 40+ providers manually. |
| Cline → Aider | **Hook system**. Lifecycle hooks (PreToolUse, PostToolUse, etc.) enable extensibility. |
| Roo Code → All | **Vector code indexing**. Semantic search over the entire codebase = better context. |
| Kilo Code → All | **Worktree isolation**. Git worktrees per agent = safe parallel execution, easy rollback. |
| Codex CLI → All | **Protocol-first design**. Auto-generated types from a schema = fewer bugs, better interop. |
| Codex CLI → All | **Guardian approval**. Explicit risk-level assessment before destructive actions. |
| Kilo Code → Aider | **Multi-platform**. Terminal + Web + Desktop + IDE from shared core. |
| Cline → Codex | **Browser automation**. CDP-based browser control for testing/validation. |
| All → Aider | **MCP integration**. Model Context Protocol is becoming standard. |

---

## 8. Optimization Opportunities

### 8.1 Architecture

| Optimization | Impact | Applicable To |
|-------------|--------|---------------|
| Extract Task god class into state machine | High | Cline, Roo Code |
| Add worktree isolation for safe parallel edits | High | Aider, Cline, Roo Code, Codex |
| Implement protocol-first type generation | Medium | Cline, Roo Code, Kilo Code |
| Replace manual providers with LiteLLM | High | Cline, Roo Code |
| Add RepoMap-style semantic context | High | Codex CLI, Kilo Code |

### 8.2 Performance

| Optimization | Impact | Applicable To |
|-------------|--------|---------------|
| Rust core for parsing/diffing | High | Aider (Python), Cline, Roo Code |
| Vector index caching | Medium | Aider, Cline, Codex |
| Streaming chunk coordination | Low | Aider |
| Lazy module loading | Medium | Roo Code (1,540 types at startup) |

### 8.3 Developer Experience

| Optimization | Impact | Applicable To |
|-------------|--------|---------------|
| Multi-edit-strategy support | High | Cline, Roo Code, Kilo Code, Codex |
| Voice input | Low | Cline, Roo Code, Kilo Code, Codex |
| Architect mode (plan→edit) | High | Cline, Roo Code, Kilo Code |
| Skills/plugin marketplace | Medium | Aider, Codex |

---

## 9. Roska Descriptor Statistics

| Agent | YAML Descriptors | Size (KB) | Generation Time |
|-------|-----------------:|---------:|----------------:|
| Roo Code | 2,143 | 2,891 | 4.2s |
| Kilo Code | 2,263 | 3,530 | — |
| Cline | 680 | 2,036 | — |
| Aider | 161 | 1,494 | 0.6s |
| Codex CLI | 463 | 303 | — |
| **Total** | **5,710** | **10,254** | |

---

## 10. Conclusion

### Best for Different Use Cases

| Use Case | Best Agent | Why |
|----------|-----------|-----|
| **Terminal workflow** | Aider | Native CLI, 16 edit strategies, voice input |
| **VSCode power user** | Cline | Clean hooks, 40+ providers, tool-rich |
| **Enterprise/scale** | Roo Code | Vector indexing, skills framework, multi-platform |
| **Multi-platform** | Kilo Code | Web + Desktop + VSCode + TUI, i18n |
| **Minimal/focused** | Codex CLI | 7K LOC, Rust performance, protocol-clean |
| **Safety-critical** | Codex CLI | Guardian approval, risk assessment |
| **Multi-repo work** | Kilo Code | Worktree isolation per agent |

### The Ideal Agent Would Combine:
1. **Aider's** edit strategy variety + RepoMap + LiteLLM
2. **Cline's** hook system + tool architecture
3. **Roo Code's** vector code indexing
4. **Kilo Code's** worktree isolation + multi-platform
5. **Codex CLI's** protocol-first design + Guardian approval + Rust core

---

*Analysis powered by [Roska](https://github.com/lailaelghazouanitecnologia-cloud/moko) — 5,710 YAML descriptors across 4,880 source files and 893,639 lines of code.*
