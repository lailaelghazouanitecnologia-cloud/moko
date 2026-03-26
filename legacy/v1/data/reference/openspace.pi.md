# Project Intelligence: openspace

> OpenSpace is an AI-agent framework that records, evolves, and shares skills across cloud and local environments.
> **Domain**: ai_agents | **Language**: python | **Size**: large | **Maturity**: beta

## Metrics

| Metric | Value |
|--------|-------|
| Total LOC | 41,758 |
| Modules | 12 |
| Types | 61 |
| Functions | 210 |
| Avg LOC/module | 3235 |
| Median LOC/type | 46 |
| Avg methods/type | 5.5 |
| Async ratio | 31% |

## Programming Style

**Naming**: snake_case modules, PascalCase classes, snake_case methods
  Examples: `UIManager`, `__init__`, `start_live_display`
**Error handling**: exceptions, retry patterns, graceful degradation
**Async**: asyncio (asyncio.to_thread)
**Typing**: basic, dataclasses
**Docs**: rich module docs, sparse comments
**Organization**: mostly file-per-class, barrel exports: no

## Architectural Patterns

### hybrid-search-pipeline
**What**: Combines BM25 lexical ranking, cosine-similarity vector scoring, and LLM re-ranking to surface the most relevant skills/tools.
**How**: Phase-1 BM25 rough-cut, Phase-2 embedding similarity, optional Phase-3 LLM filter with chain-of-thought planning query.
**Components**: ToolRanker, SearchCoordinator, embedding
**Where**: cloud/search.py (800 LOC)
**Reusable when**: when you need high-recall semantic retrieval over a large tool/skill corpus

### fuzzy-patch-application
**What**: Applies multi-file LLM-generated patches to skill directories with graceful degradation (exact → trimmed → anchor+Levenshtein).
**How**: Three-level fallback chain; computes minimal diff and writes atomically to disk.
**Components**: patch.py, fuzzy_match.py
**Where**: skill_engine (900 LOC)
**Reusable when**: any LLM-driven code/skill update workflow where perfect matches are unlikely

### host-config-auto-detection
**What**: Automatically resolves LLM credentials and grounding config by reading Nanobot/OpenClaw host-agent files.
**How**: Tries env var first, then ~/.nanobot/config.json, then ~/.openclaw/openclaw.json, merging MCP env blocks.
**Components**: host_detection/nanobot.py, host_detection/openclaw.py, resolver.py
**Where**: host_detection (600 LOC)
**Reusable when**: when your CLI must behave identically to an existing host-agent without duplicate config

### execution-recording-pipeline
**What**: Captures full agent trajectories (screenshots, video, action logs, conversation) for offline analysis and skill evolution.
**How**: RecordingManager coordinates platform-specific RecordingClient, ScreenshotClient, VideoRecorder, ActionRecorder; stores artifacts locally or uploads to cloud.
**Components**: recording/__init__.py, recording/action_recorder.py, recording/video.py
**Where**: recording (2,700 LOC)
**Reusable when**: when you need reproducible agent debugging or training data generation

### skill-evolution-workflow
**What**: Automatically repairs, derives, or rewrites skills based on execution analysis.
**How**: ExecutionAnalyzer loads recording → builds LLM prompt → outputs ExecutionAnalysis → SkillEvolver applies FIX/DERIVED/REWRITE actions via patch subsystem.
**Components**: skill_engine/analyzer.py, skill_engine/evolver.py
**Where**: skill_engine (1,500 LOC)
**Reusable when**: when agent skills must self-improve without human intervention

## Features

| Feature | Description | Algorithm | Complexity | LOC |
|---------|-------------|-----------|------------|-----|
| **cloud_skill_marketplace** | Publish, search, and download skills via OpenSpace cloud API with hybrid BM25+embedding search. | BM25 coarse ranking → cosine similarity on OpenAI embeddings → optional LLM re-ranking with planning query. | medium | 1,200 |
| **multi_backend_sandboxing** | Runs shell/python commands inside backend-specific sandboxes (Docker, gVisor, etc.) with uniform security policy checks. | Provider creates session → SandboxManager starts sandbox → SecurityPolicyManager checks each command → execute_safe. | high | 1,400 |
| **realtime_terminal_ui** | Live ANSI dashboard showing agent activities, grounding backends, and logs without curses. | UI singleton receives asyncio callbacks; renders boxed panels with custom color codes and periodic refresh. | low | 600 |
| **trajectory_video_recording** | Records full desktop or headless browser sessions as MP4 via local_server HTTP API. | RecordingClient POSTs /start_recording with fps/codec → local_server spawns ffmpeg → artifacts uploaded or kept local. | medium | 800 |
| **dynamic_skill_retrieval** | Allows an agent to pull in additional skills mid-iteration when initial set is insufficient. | RetrieveSkillTool registered as internal tool → LLM calls it with query → registry performs hybrid search → injects skill markdown into prompt. | medium | 700 |
| **credential_chain_resolution** | Resolves LLM credentials from env, host-agent files, and cloud profiles in predictable order. | env var → nanobot config → openclaw config → cloud fetch; caches result per session. | low | 500 |
| **conversation_log_formatter** | Converts raw JSONL conversation into priority-based text block for LLM analysis. | Sorts by timestamp → groups by turn → trims long messages → injects priority markers. | low | 300 |

## Design Decisions

| Area | Choice | Rationale |
|------|--------|-----------|
| coupling | Keep cloud client synchronous (urllib) and wrap with asyncio.to_thread() in MCP server. | Avoids duplicate async/sync code paths while maintaining compatibility with both CLI and MCP contexts. |
| identity | Use SKILL.md front-matter (name + description) as the single source of truth for skill identity. | Enables file-system based registry without external metadata database; supports git-style versioning. |
| error_handling | Introduce GroundingError with structured to_dict() for uniform error reporting across backends. | Lets UI and cloud serialize errors consistently regardless of underlying shell/web exception types. |
| architecture | Separate local_server as independent HTTP service instead of in-process threads. | Allows language-agnostic clients (e.g., Node dashboard) and isolates resource-heavy video encoding. |
| persistence | Store recordings as local files with optional cloud upload rather than mandatory database. | Keeps agent runtime stateless and supports air-gapped environments while still enabling cloud sharing. |

## Dependency Graph

**Style**: layered | **Coupling**: moderate | **Hub**: utils
```
  L0: [agents, grounding, prompts, utils]
  L1: [config, host_detection, llm, platform, recording, skill_engine]
  L2: [cloud, local_server]
```

## Quality Calibration

| Metric | P25 | Median | P75 | Max |
|--------|-----|--------|-----|-----|
| LOC/type | 11 | 46 | 213 | 1360 |
| Methods/type | 0 | 2 | 9 | 47 |
| LOC/function | 6 | 18 | 35 | 288 |
| Error handling: moderate | Test coverage: none |
