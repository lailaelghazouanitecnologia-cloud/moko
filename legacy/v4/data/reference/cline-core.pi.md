# Project Intelligence: cline-core

> AI-powered autonomous coding assistant that orchestrates multiple LLM providers to perform complex software development tasks
> **Domain**: ai_agents | **Language**: typescript | **Size**: massive | **Maturity**: production

## Metrics

| Metric | Value |
|--------|-------|
| Total LOC | 159,121 |
| Modules | 12 |
| Types | 168 |
| Functions | 184 |
| Avg LOC/module | 13146 |
| Median LOC/type | 9 |
| Avg methods/type | 1.8 |
| Async ratio | 42% |

## Programming Style

**Naming**: snake_case modules, PascalCase classes, camelCase methods
  Examples: `EndpointsFileSchema`, `constructor`, `initialize`
**Error handling**: exceptions
**Async**: async/await
**Typing**: moderate, generics, dataclasses
**Docs**: rich module docs, sparse comments
**Organization**: mixed file-per-class, barrel exports: no

## Architectural Patterns

### multi-provider-llm-abstraction
**What**: Unified interface for 20+ AI providers with streaming message handling
**How**: Trait-based handler system with provider-specific adapters converting to common ApiStream format
**Components**: ApiHandler, ApiStream, provider-adapters
**Where**: providers (8,000 LOC)
**Reusable when**: building AI tools that need to support multiple LLM backends

### focus-chain-matching
**What**: Pattern matching system for tracking user focus across UI interactions
**How**: Shared utility functions that enable coordinated focus management between extension and webview contexts
**Components**: focus-chain-utils, shared-state
**Where**: shared (500 LOC)
**Reusable when**: building VSCode extensions with complex UI state synchronization

### mcp-tool-identification
**What**: Unique identifier scheme for Model Context Protocol tools across servers
**How**: Combines server name + identifier + tool name to create globally unique tool references
**Components**: mcp-identifier, tool-registry
**Where**: shared (200 LOC)
**Reusable when**: integrating multiple MCP servers without naming conflicts

### github-url-bypass
**What**: Portable GitHub URL creation that bypasses VS Code URI handling issues
**How**: Direct URL construction with proper encoding to avoid VS Code's problematic URI interception
**Components**: github-url-utils, url-encoder
**Where**: utils (150 LOC)
**Reusable when**: creating GitHub integration links in VS Code extensions

### endpoint-configuration
**What**: Self-hosted vs cloud endpoint management with bundled configurations
**How**: Schema-driven configuration system supporting both local and remote AI endpoints
**Components**: ClineEndpoint, EnvironmentConfig, EndpointsFileSchema
**Where**: config (800 LOC)
**Reusable when**: building applications with configurable AI service endpoints

## Features

| Feature | Description | Algorithm | Complexity | LOC |
|---------|-------------|-----------|------------|-----|
| **multi-model-streaming** | Real-time streaming responses from 20+ AI providers including Anthropic, OpenAI, Gemini, Bedrock | Provider-specific adapters convert streaming protocols to unified ApiStream interface | high | 8,000 |
| **tool-use-orchestration** | Dynamic tool calling across multiple AI providers with MCP server integration | Provider capability detection + tool schema transformation + MCP server routing | high | 2,000 |
| **usage-tracking** | Granular API usage tracking across all providers with cost estimation | Per-provider usage extraction + unified usage chunk format + cost calculation | medium | 1,500 |
| **model-capability-detection** | Automatic detection of model capabilities (tools, vision, etc.) for proper routing | Model ID pattern matching + provider metadata + capability flags | medium | 1,000 |
| **free-tier-optimization** | Intelligent routing to free models when available with usage tracking | Free model set detection + usage quota tracking + automatic fallback | medium | 800 |
| **vscode-mock-testing** | Comprehensive VSCode API mocking for unit testing without editor dependency | Interface-compatible mock implementation with configurable behavior | low | 500 |

## Design Decisions

| Area | Choice | Rationale |
|------|--------|-----------|
| architecture | Trait-based handler pattern instead of inheritance for LLM providers | Enables composition over inheritance, easier testing, and provider-specific optimization without base class bloat |
| coupling | Shared module for both extension and webview code | Prevents code duplication while maintaining type safety across process boundaries |
| error_handling | Provider-specific error mapping to common error types | Abstracts provider quirks while preserving error context for debugging |
| identity | MCP tool names combine server+identifier+tool for uniqueness | Prevents naming collisions when multiple MCP servers expose similar tools |
| persistence | Environment-based configuration with self-hosted support | Supports enterprise deployments while maintaining cloud service compatibility |

## Dependency Graph

**Style**: layered | **Coupling**: loose | **Hub**: hosts
```
  L0: [__tests__, core, dev, exports, hosts, integrations, packages]
  L1: [services, test, utils]
  L2: [shared, standalone]
```

## Quality Calibration

| Metric | P25 | Median | P75 | Max |
|--------|-----|--------|-----|-----|
| LOC/type | 4 | 9 | 73 | 3610 |
| Methods/type | 0 | 0 | 0 | 85 |
| LOC/function | 5 | 12 | 27 | 965 |
| Error handling: moderate | Test coverage: none |
