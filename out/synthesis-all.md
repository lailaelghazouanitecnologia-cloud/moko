# Roska Synthesis Report — AI Agent Framework Comparison

*Generated: 2026-03-20 17:19*

## Overview

| Project | Language | Files | Lines | Modules | Types | Functions |
|---------|----------|------:|------:|--------:|------:|----------:|
| **mastra** | typescript | 4,933 | 1,084,226 | 20 | 14 | 30 |
| **kilocode** | typescript | 1,931 | 356,039 | 6 | 7 | 20 |
| **crewai** | python | 1,026 | 213,111 | 2 | 0 | 8 |
| **langgraph** | python | 307 | 130,200 | 4 | 0 | 1 |
| **autogen** | python | 546 | 112,393 | 2 | 0 | 6 |
| **cline-core** | typescript | 567 | 96,617 | 16 | 119 | 165 |
| **codex** | typescript | 443 | 7,390 | 3 | 0 | 0 |
| **swarm** | python | 62 | 3,725 | 3 | 5 | 12 |

## Architectural Patterns

- **autogen**: `multi-agent`, `event-driven`, `task-oriented`, `agent-based`
- **cline-core**: `task-oriented`, `plugin-system`, `memory/state`, `api-server`, `event-driven`
- **codex**: `event-driven`, `plugin-system`, `agent-based`
- **crewai**: `task-oriented`, `agent-based`, `plugin-system`, `multi-agent`, `event-driven`
- **kilocode**: `event-driven`, `agent-based`
- **langgraph**: `agent-based`, `task-oriented`, `examples-included`, `documented`, `event-driven`
- **mastra**: `agent-based`, `task-oriented`, `tested`, `examples-included`, `documented`, `event-driven`
- **swarm**: `tested`, `task-oriented`, `examples-included`, `agent-based`

## Key Types (by complexity)

### autogen

| Type | Kind | Methods | Fields |
|------|------|--------:|-------:|
| `UserProxy` | struct | 0 | 0 |
| `DEFAULT_DESCRIPTION` |  | 0 | 0 |
| `__init__` |  | 0 | 0 |
| `handle_user_chat_input` |  | 0 | 0 |
| `ainput` |  | 0 | 0 |
| `UserProxy` | type | 0 | 0 |
| `input_types` | data | 0 | 0 |
| `CodeLinter` | struct | 0 | 0 |

### cline-core

| Type | Kind | Methods | Fields |
|------|------|--------:|-------:|
| `ConvertedTool` | trait | 0 | 0 |
| `input` |  | 0 | 0 |
| `CommonApiHandlerOptions` | typealias | 0 | 0 |
| `onRetryAttempt` |  | 0 | 0 |
| `ApiHandler` | trait | 0 | 0 |
| `createMessage` |  | 0 | 0 |
| `getModel` |  | 0 | 0 |
| `getApiStreamUsage` |  | 0 | 0 |

### codex

| Type | Kind | Methods | Fields |
|------|------|--------:|-------:|
| `AbsolutePathBuf` | typealias | 0 | 0 |
| `AbsolutePathBuf` | type | 0 | 0 |
| `ApplyPatchApprovalParams` | typealias | 0 | 0 |
| `conversationId` |  | 0 | 0 |
| `callId` |  | 0 | 0 |
| `fileChanges` |  | 0 | 0 |
| `reason` |  | 0 | 0 |
| `grantRoot` |  | 0 | 0 |

### crewai

| Type | Kind | Methods | Fields |
|------|------|--------:|-------:|
| `TLSConfig` | model | 0 | 0 |
| `model_config` |  | 0 | 0 |
| `client_cert_path` |  | 0 | 0 |
| `client_key_path` |  | 0 | 0 |
| `ca_cert_path` |  | 0 | 0 |
| `verify` |  | 0 | 0 |
| `get_httpx_ssl_context` |  | 0 | 0 |
| `get_grpc_credentials` |  | 0 | 0 |

### kilocode

| Type | Kind | Methods | Fields |
|------|------|--------:|-------:|
| `PR` | trait | 0 | 0 |
| `html_url` |  | 0 | 0 |
| `Entry` | typealias | 0 | 0 |
| `dir` |  | 0 | 0 |
| `version` |  | 0 | 0 |
| `PackageManifest` | typealias | 0 | 0 |
| `bin` |  | 0 | 0 |
| `TestFixtures` | typealias | 0 | 0 |

### langgraph

| Type | Kind | Methods | Fields |
|------|------|--------:|-------:|
| `SimulationState` | struct | 0 | 0 |
| `messages` |  | 0 | 0 |
| `inputs` |  | 0 | 0 |
| `BaseCache` | trait | 0 | 0 |
| `serde` |  | 0 | 0 |
| `__init__` |  | 0 | 0 |
| `get` |  | 0 | 0 |
| `aget` |  | 0 | 0 |

### mastra

| Type | Kind | Methods | Fields |
|------|------|--------:|-------:|
| `Auth0User` | typealias | 0 | 0 |
| `MastraAuthAuth0Options` | trait | 0 | 0 |
| `domain` |  | 0 | 0 |
| `audience` |  | 0 | 0 |
| `MastraAuthAuth0` | struct | 0 | 0 |
| `domain` |  | 0 | 0 |
| `audience` |  | 0 | 0 |
| `constructor` |  | 0 | 0 |

### swarm

| Type | Kind | Methods | Fields |
|------|------|--------:|-------:|
| `Colors` | struct | 0 | 0 |
| `HEADER` |  | 0 | 0 |
| `OKBLUE` |  | 0 | 0 |
| `OKCYAN` |  | 0 | 0 |
| `OKGREEN` |  | 0 | 0 |
| `WARNING` |  | 0 | 0 |
| `RED` |  | 0 | 0 |
| `ENDC` |  | 0 | 0 |

## Module Structure

### autogen (2 modules)

| Module | Lines | % of Total |
|--------|------:|-----------:|
| `python` | 112,189 | 99.8% |
| `dotnet` | 204 | 0.2% |

### cline-core (16 modules)

| Module | Lines | % of Total |
|--------|------:|-----------:|
| `api` | 22,170 | 22.9% |
| `task` | 21,438 | 22.2% |
| `controller` | 14,036 | 14.5% |
| `prompts` | 13,024 | 13.5% |
| `hooks` | 7,985 | 8.3% |
| `context` | 5,257 | 5.4% |
| `storage` | 4,131 | 4.3% |
| `workspace` | 2,103 | 2.2% |
| `assistant-message` | 2,090 | 2.2% |
| `permissions` | 1,418 | 1.5% |

### codex (3 modules)

| Module | Lines | % of Total |
|--------|------:|-----------:|
| `codex-rs` | 4,286 | 58.0% |
| `sdk` | 2,778 | 37.6% |
| `shell-tool-mcp` | 326 | 4.4% |

### crewai (2 modules)

| Module | Lines | % of Total |
|--------|------:|-----------:|
| `lib` | 212,815 | 99.9% |
| `__root__` | 296 | 0.1% |

### kilocode (5 modules)

| Module | Lines | % of Total |
|--------|------:|-----------:|
| `packages` | 348,274 | 97.8% |
| `script` | 7,250 | 2.0% |
| `nix` | 231 | 0.1% |
| `.opencode` | 147 | 0.0% |
| `sdks` | 137 | 0.0% |

### langgraph (4 modules)

| Module | Lines | % of Total |
|--------|------:|-----------:|
| `libs` | 129,609 | 99.5% |
| `.github` | 246 | 0.2% |
| `examples` | 203 | 0.2% |
| `docs` | 142 | 0.1% |

### mastra (20 modules)

| Module | Lines | % of Total |
|--------|------:|-----------:|
| `packages` | 607,540 | 56.0% |
| `stores` | 141,837 | 13.1% |
| `observability` | 52,015 | 4.8% |
| `client-sdks` | 44,146 | 4.1% |
| `examples` | 43,225 | 4.0% |
| `workflows` | 41,772 | 3.9% |
| `mastracode` | 34,250 | 3.2% |
| `workspaces` | 26,924 | 2.5% |
| `explorations` | 18,278 | 1.7% |
| `server-adapters` | 16,141 | 1.5% |

### swarm (3 modules)

| Module | Lines | % of Total |
|--------|------:|-----------:|
| `examples` | 2,922 | 78.4% |
| `swarm` | 512 | 13.7% |
| `tests` | 291 | 7.8% |

## Comparative Insights

### Pattern Coverage

| Pattern | Projects |
|---------|----------|
| `agent-based` | **autogen**, **codex**, **crewai**, **kilocode**, **langgraph**, **mastra**, **swarm** |
| `api-server` | **cline-core** |
| `documented` | **langgraph**, **mastra** |
| `event-driven` | **autogen**, **cline-core**, **codex**, **crewai**, **kilocode**, **langgraph**, **mastra** |
| `examples-included` | **langgraph**, **mastra**, **swarm** |
| `memory/state` | **cline-core** |
| `multi-agent` | **autogen**, **crewai** |
| `plugin-system` | **cline-core**, **codex**, **crewai** |
| `task-oriented` | **autogen**, **cline-core**, **crewai**, **langgraph**, **mastra**, **swarm** |
| `tested` | **mastra**, **swarm** |

### Code Density

| Project | Symbols/KLOC |
|---------|-------------:|
| **mastra** | 0.0 |
| **kilocode** | 0.1 |
| **crewai** | 0.0 |
| **langgraph** | 0.0 |
| **autogen** | 0.1 |
| **cline-core** | 2.9 |
| **codex** | 0.0 |
| **swarm** | 4.6 |
