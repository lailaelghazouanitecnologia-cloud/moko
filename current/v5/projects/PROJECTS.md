# AVA — Generated Projects Registry

## Archive (pre-Feature AST, cleaned)

| Project | Files | LOC | Domain | Pipeline | Notes |
|---------|-------|-----|--------|----------|-------|
| agentkit | 26 | 2,221 | AI agent toolkit | basic | No references |
| autoresearch | 56 | 8,562 | Research automation | basic | v1 |
| autoresearch_v2 | 14 | 1,994 | Research automation | basic | v2 |
| autoresearch_v3 | 16 | 1,833 | Research automation | basic | v3 |
| chip8 | 59 | 5,365 | Emulator (CHIP-8) | basic | |
| httpx | 25 | 2,456 | HTTP client | basic | |
| nes | 30 | 3,739 | Emulator (NES) | basic | |
| nova | 89 | 10,760 | Game engine | basic | |
| rts_engine | 93 | 19,705 | RTS game engine | branches | 10 modules, predefined blueprint |
| taskflow | 37 | 5,498 | Task management | branches | First branch pipeline test |
| wt-cli | 14 | 1,615 | CLI tool | basic | |
| x86vm | 25 | 2,754 | x86 VM | basic | |
| z86 | 111 | 15,118 | x86 emulator | branches | 11 modules, first large test |
| zzo | 16 | 2,542 | Distributed VCS | branches+context | First with ContextEngine |

**Total archived: 14 projects, 84,162 LOC**

## References Available (out/)

22 analyzed codebases providing semantic enrichment:
agno, aider, autogen, cline-core, codex-cli, continue, crewai,
gemini-cli, glm4, goose, kilocode, langgraph, mastra, nova-engine,
playcanvas, roo-code, swarm, swe-agent, sweep, tabby, thief-engine, void

Indexes: .emission_index.json (21KB), .semantic_store.json (29KB), .block_store.json (48KB)

## Test Suite — Feature AST Pipeline (5 blocks)

5 tests paralelos para validar el pipeline completo con Feature AST.
Cada uno prueba un caso distinto: dominio, referencia, modo, dimension.

| # | Project | Goal | Reference | Mode | Valida |
|---|---------|------|-----------|------|--------|
| 1 | `engine_2d` | "2D sprite game engine with ECS" | playcanvas | `--no-interactive` | 2D filtering: excluye Vec3/Quat/Light, trae math/render/ecs |
| 2 | `gpu_renderer` | "WebGPU 3D renderer" | playcanvas | `--features rendering math events` | Pre-select: solo rendering stack, adaptation webgl->webgpu |
| 3 | `mini_engine` | "minimal game engine" | thief-engine | `--no-interactive` | Referencia chica (6.5K LOC), calibracion LOC proporcional |
| 4 | `ai_toolkit` | "AI agent framework with tools" | langgraph | `--no-interactive` | Dominio no-game: Feature AST sobre agentes, no sobre render |
| 5 | `code_editor` | "code editor with LSP support" | void | `--no-interactive` | Dominio editor: Feature AST sobre editor components |

### Comandos

```bash
# Block 1: 2D engine — debe excluir 3D silenciosamente
ava dev "2D sprite game engine with ECS" -t engine_2d -r playcanvas --branches --no-interactive

# Block 2: WebGPU renderer — pre-select features, adaptation
ava dev "WebGPU 3D renderer" -t gpu_renderer -r playcanvas --branches --features rendering math events

# Block 3: Mini engine — referencia chica, LOC calibrado
ava dev "minimal game engine" -t mini_engine -r thief-engine --branches --no-interactive

# Block 4: AI toolkit — dominio no-game
ava dev "AI agent framework with tools" -t ai_toolkit -r langgraph --branches --no-interactive

# Block 5: Code editor — dominio editor
ava dev "code editor with LSP support" -t code_editor -r void --branches --no-interactive
```

### Criterios de exito

- [ ] Feature AST se construye sin crash para cada referencia
- [ ] 2D filtering excluye tipos 3D en engine_2d
- [ ] Pre-select solo trae los modulos pedidos en gpu_renderer
- [ ] LOC/type calibrado segun referencia (playcanvas ~250, thief-engine ~100)
- [ ] Decomposer genera modulos con nombres PROPIOS (no copia de referencia)
- [ ] Pipeline completo: decompose -> branch -> generate -> fix -> merge
- [ ] Report final con metricas por modulo

## Current Generation (Feature AST pipeline)

| Project | Date | Refs | Modules | LOC | Errors | Tokens | Notes |
|---------|------|------|---------|-----|--------|--------|-------|
| *(pending test suite)* | | | | | | | |
