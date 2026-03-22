# Roska Synthesis Report — AI Agent Framework Comparison

*Generated: 2026-03-20 17:57*

## Overview

| Project | Language | Files | Lines | Modules | Types | Functions |
|---------|----------|------:|------:|--------:|------:|----------:|
| **void** | typescript | 5,390 | 1,695,312 | 6 | 21 | 51 |
| **mastra** | typescript | 4,933 | 1,084,226 | 20 | 14 | 30 |
| **gemini-cli** | typescript | 1,796 | 527,218 | 4 | 16 | 52 |
| **roo-code** | typescript | 1,792 | 395,370 | 4 | 1 | 7 |
| **kilocode** | typescript | 1,931 | 356,039 | 6 | 7 | 20 |
| **continue** | typescript | 1,794 | 312,147 | 6 | 2 | 1 |
| **crewai** | python | 1,026 | 213,111 | 2 | 0 | 8 |
| **langgraph** | python | 307 | 130,200 | 4 | 0 | 1 |
| **autogen** | python | 546 | 112,393 | 2 | 0 | 6 |
| **cline-core** | typescript | 567 | 96,617 | 16 | 119 | 165 |
| **goose** | typescript | 517 | 85,798 | 4 | 0 | 0 |
| **tabby** | typescript | 552 | 75,524 | 2 | 0 | 0 |
| **aider** | python | 147 | 38,223 | 4 | 41 | 245 |
| **sweep** | python | 185 | 35,680 | 3 | 6 | 62 |
| **swe-agent** | python | 100 | 14,794 | 4 | 22 | 116 |
| **codex-cli** | typescript | 443 | 7,390 | 3 | 0 | 0 |
| **glm4** | python | 28 | 3,966 | 3 | 22 | 39 |
| **swarm** | python | 62 | 3,725 | 3 | 5 | 12 |

## Architectural Patterns

- **aider**: `tested`, `event-driven`
- **autogen**: `multi-agent`, `task-oriented`, `agent-based`, `event-driven`
- **cline-core**: `plugin-system`, `api-server`, `task-oriented`, `memory/state`, `event-driven`
- **codex-cli**: `agent-based`, `plugin-system`, `event-driven`
- **continue**: `multi-agent`, `plugin-system`, `event-driven`
- **crewai**: `agent-based`, `multi-agent`, `plugin-system`, `task-oriented`, `event-driven`
- **gemini-cli**: `task-oriented`, `agent-based`, `plugin-system`, `event-driven`
- **glm4**: *(none detected)*
- **goose**: `task-oriented`, `agent-based`, `plugin-system`, `event-driven`
- **kilocode**: `agent-based`, `event-driven`
- **langgraph**: `documented`, `agent-based`, `examples-included`, `task-oriented`, `event-driven`
- **mastra**: `documented`, `agent-based`, `examples-included`, `task-oriented`, `tested`, `event-driven`
- **roo-code**: `task-oriented`, `agent-based`, `plugin-system`, `event-driven`
- **swarm**: `examples-included`, `tested`, `agent-based`, `task-oriented`
- **swe-agent**: `documented`, `agent-based`, `event-driven`, `task-oriented`, `tested`, `tool-use`
- **sweep**: `documented`, `tested`, `agent-based`, `task-oriented`
- **tabby**: `agent-based`, `plugin-system`, `event-driven`
- **void**: `agent-based`, `plugin-system`, `task-oriented`, `tested`, `event-driven`

## Key Types (by complexity)

### aider

| Type | Kind | Methods | Fields |
|------|------|--------:|-------:|
| `Analytics` | struct | 0 | 0 |
| `mp` |  | 0 | 0 |
| `ph` |  | 0 | 0 |
| `user_id` |  | 0 | 0 |
| `permanently_disable` |  | 0 | 0 |
| `asked_opt_in` |  | 0 | 0 |
| `logfile` |  | 0 | 0 |
| `custom_posthog_host` |  | 0 | 0 |

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

### codex-cli

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

### continue

| Type | Kind | Methods | Fields |
|------|------|--------:|-------:|
| `IpcIde` | struct | 0 | 0 |
| `constructor` |  | 0 | 0 |
| `IpcIde` | type | 0 | 0 |
| `IPCMessengerBase` | struct | 0 | 0 |
| `typeListeners` |  | 0 | 0 |
| `idListeners` |  | 0 | 0 |
| `_unfinishedLine` |  | 0 | 0 |
| `_onErrorHandlers` |  | 0 | 0 |

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

### gemini-cli

| Type | Kind | Methods | Fields |
|------|------|--------:|-------:|
| `AppEvalCase` | trait | 0 | 0 |
| `configOverrides` |  | 0 | 0 |
| `prompt` |  | 0 | 0 |
| `timeout` |  | 0 | 0 |
| `files` |  | 0 | 0 |
| `setup` |  | 0 | 0 |
| `assert` |  | 0 | 0 |
| `EvalPolicy` | enum | 0 | 0 |

### glm4

| Type | Kind | Methods | Fields |
|------|------|--------:|-------:|
| `ClientType` | enum | 0 | 0 |
| `HF` |  | 0 | 0 |
| `VLLM` |  | 0 | 0 |
| `API` |  | 0 | 0 |
| `Client` | trait | 0 | 0 |
| `__init__` |  | 0 | 0 |
| `generate_stream` |  | 0 | 0 |
| `HFClient` | struct | 0 | 0 |

### goose

| Type | Kind | Methods | Fields |
|------|------|--------:|-------:|
| `ArchivedExtensionWarningProps` | trait | 0 | 0 |
| `repoUrl` |  | 0 | 0 |
| `EnvVar` | trait | 0 | 0 |
| `key` |  | 0 | 0 |
| `value` |  | 0 | 0 |
| `CLIExtensionInstructionsProps` | trait | 0 | 0 |
| `description` |  | 0 | 0 |
| `type` |  | 0 | 0 |

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

### roo-code

| Type | Kind | Methods | Fields |
|------|------|--------:|-------:|
| `StreamEvent` | typealias | 0 | 0 |
| `type` |  | 0 | 0 |
| `subtype` |  | 0 | 0 |
| `requestId` |  | 0 | 0 |
| `command` |  | 0 | 0 |
| `taskId` |  | 0 | 0 |
| `content` |  | 0 | 0 |
| `code` |  | 0 | 0 |

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

### swe-agent

| Type | Kind | Methods | Fields |
|------|------|--------:|-------:|
| `ActionSamplerOutput` | model | 0 | 0 |
| `completion` |  | 0 | 0 |
| `messages` |  | 0 | 0 |
| `trajectory_items` |  | 0 | 0 |
| `extra_info` |  | 0 | 0 |
| `AbstractActionSampler` | struct | 0 | 0 |
| `_model` |  | 0 | 0 |
| `_tools` |  | 0 | 0 |

### sweep

| Type | Kind | Methods | Fields |
|------|------|--------:|-------:|
| `RegexExtractModel` | model | 0 | 0 |
| `_regex` |  | 0 | 0 |
| `from_string` |  | 0 | 0 |
| `Message` | model | 0 | 0 |
| `role` |  | 0 | 0 |
| `content` |  | 0 | 0 |
| `key` |  | 0 | 0 |
| `to_openai` |  | 0 | 0 |

### tabby

| Type | Kind | Methods | Fields |
|------|------|--------:|-------:|
| `Cert` | typealias | 0 | 0 |
| `CertsLoader` | struct | 0 | 0 |
| `constructor` |  | 0 | 0 |
| `preInitialize` |  | 0 | 0 |
| `BranchNameGenerator` | struct | 0 | 0 |
| `mutexAbortController` |  | 0 | 0 |
| `constructor` |  | 0 | 0 |
| `initialize` |  | 0 | 0 |

### void

| Type | Kind | Methods | Fields |
|------|------|--------:|-------:|
| `ConditionalPattern` | trait | 0 | 0 |
| `when` |  | 0 | 0 |
| `pattern` |  | 0 | 0 |
| `RawImportPatternsConfig` | trait | 0 | 0 |
| `target` |  | 0 | 0 |
| `layer` |  | 0 | 0 |
| `test` |  | 0 | 0 |
| `restrictions` |  | 0 | 0 |

## Module Structure

### aider (4 modules)

| Module | Lines | % of Total |
|--------|------:|-----------:|
| `aider` | 20,270 | 53.0% |
| `tests` | 12,338 | 32.3% |
| `scripts` | 3,152 | 8.2% |
| `benchmark` | 2,463 | 6.4% |

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

### codex-cli (3 modules)

| Module | Lines | % of Total |
|--------|------:|-----------:|
| `codex-rs` | 4,286 | 58.0% |
| `sdk` | 2,778 | 37.6% |
| `shell-tool-mcp` | 326 | 4.4% |

### continue (6 modules)

| Module | Lines | % of Total |
|--------|------:|-----------:|
| `core` | 108,449 | 34.7% |
| `extensions` | 104,127 | 33.4% |
| `gui` | 55,407 | 17.8% |
| `packages` | 36,008 | 11.5% |
| `manual-testing-sandbox` | 7,320 | 2.3% |
| `binary` | 836 | 0.3% |

### crewai (2 modules)

| Module | Lines | % of Total |
|--------|------:|-----------:|
| `lib` | 212,815 | 99.9% |
| `__root__` | 296 | 0.1% |

### gemini-cli (4 modules)

| Module | Lines | % of Total |
|--------|------:|-----------:|
| `packages` | 514,662 | 97.6% |
| `integration-tests` | 7,861 | 1.5% |
| `evals` | 3,319 | 0.6% |
| `scripts` | 1,376 | 0.3% |

### glm4 (3 modules)

| Module | Lines | % of Total |
|--------|------:|-----------:|
| `demo` | 1,573 | 39.7% |
| `inference` | 1,349 | 34.0% |
| `finetune` | 1,044 | 26.3% |

### goose (4 modules)

| Module | Lines | % of Total |
|--------|------:|-----------:|
| `ui` | 73,894 | 86.1% |
| `documentation` | 7,674 | 8.9% |
| `evals` | 2,802 | 3.3% |
| `services` | 1,428 | 1.7% |

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

### roo-code (4 modules)

| Module | Lines | % of Total |
|--------|------:|-----------:|
| `src` | 227,850 | 57.6% |
| `webview-ui` | 75,863 | 19.2% |
| `apps` | 54,310 | 13.7% |
| `packages` | 37,347 | 9.4% |

### swarm (3 modules)

| Module | Lines | % of Total |
|--------|------:|-----------:|
| `examples` | 2,922 | 78.4% |
| `swarm` | 512 | 13.7% |
| `tests` | 291 | 7.8% |

### swe-agent (4 modules)

| Module | Lines | % of Total |
|--------|------:|-----------:|
| `sweagent` | 11,419 | 77.2% |
| `tests` | 2,240 | 15.1% |
| `tools` | 995 | 6.7% |
| `docs` | 140 | 0.9% |

### sweep (3 modules)

| Module | Lines | % of Total |
|--------|------:|-----------:|
| `sweepai` | 31,192 | 87.4% |
| `tests` | 4,005 | 11.2% |
| `docs` | 483 | 1.4% |

### tabby (2 modules)

| Module | Lines | % of Total |
|--------|------:|-----------:|
| `ee` | 55,074 | 72.9% |
| `clients` | 20,450 | 27.1% |

### void (6 modules)

| Module | Lines | % of Total |
|--------|------:|-----------:|
| `src` | 1,382,543 | 81.6% |
| `extensions` | 300,361 | 17.7% |
| `test` | 6,257 | 0.4% |
| `.vscode` | 3,284 | 0.2% |
| `.eslint-plugin-local` | 1,971 | 0.1% |
| `scripts` | 896 | 0.1% |

## Comparative Insights

### Pattern Coverage

| Pattern | Projects |
|---------|----------|
| `agent-based` | **autogen**, **codex-cli**, **crewai**, **gemini-cli**, **goose**, **kilocode**, **langgraph**, **mastra**, **roo-code**, **swarm**, **swe-agent**, **sweep**, **tabby**, **void** |
| `api-server` | **cline-core** |
| `documented` | **langgraph**, **mastra**, **swe-agent**, **sweep** |
| `event-driven` | **aider**, **autogen**, **cline-core**, **codex-cli**, **continue**, **crewai**, **gemini-cli**, **goose**, **kilocode**, **langgraph**, **mastra**, **roo-code**, **swe-agent**, **tabby**, **void** |
| `examples-included` | **langgraph**, **mastra**, **swarm** |
| `memory/state` | **cline-core** |
| `multi-agent` | **autogen**, **continue**, **crewai** |
| `plugin-system` | **cline-core**, **codex-cli**, **continue**, **crewai**, **gemini-cli**, **goose**, **roo-code**, **tabby**, **void** |
| `task-oriented` | **autogen**, **cline-core**, **crewai**, **gemini-cli**, **goose**, **langgraph**, **mastra**, **roo-code**, **swarm**, **swe-agent**, **sweep**, **void** |
| `tested` | **aider**, **mastra**, **swarm**, **swe-agent**, **sweep**, **void** |
| `tool-use` | **swe-agent** |

### Code Density

| Project | Symbols/KLOC |
|---------|-------------:|
| **void** | 0.0 |
| **mastra** | 0.0 |
| **gemini-cli** | 0.1 |
| **roo-code** | 0.0 |
| **kilocode** | 0.1 |
| **continue** | 0.0 |
| **crewai** | 0.0 |
| **langgraph** | 0.0 |
| **autogen** | 0.1 |
| **cline-core** | 2.9 |
| **goose** | 0.0 |
| **tabby** | 0.0 |
| **aider** | 7.5 |
| **sweep** | 1.9 |
| **swe-agent** | 9.3 |
| **codex-cli** | 0.0 |
| **glm4** | 15.4 |
| **swarm** | 4.6 |
