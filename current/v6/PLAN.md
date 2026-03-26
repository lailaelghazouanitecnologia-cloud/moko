# Test Matrix: Agent Stress Testing

## Objetivo
Validar el agente iterativo generando **5 proyectos** de dominios distintos, tamaños variados, y flujos diferentes (layered vs non-layered). Cada test verifica: generación, density, incremental rebuild, y tsc --noEmit.

---

## Test 1: CLI Tool (Non-Layered, Small)
**Goal**: "Build a CLI tool for managing git worktrees"
**Target**: `wt-cli`
**References**: `codex-cli` (463 descriptors — CLI patterns, arg parsing)
**Flow**: Non-layered (LLM decides modules)
**Expected**: ~10-15 types, 2-3 modules, ~1K-2K LOC
**Validates**:
- `_create_llm_plan()` — LLM module identification
- Small project without ProjectBlueprint
- codex-cli reference extraction

## Test 2: AI Agent Framework (Non-Layered, Medium)
**Goal**: "Build an AI agent framework with tool calling and memory"
**Target**: `agentkit`
**References**: `swarm` (86 descriptors — agent patterns), `langgraph` (374 descriptors — graph execution)
**Flow**: Non-layered (LLM decides modules)
**Expected**: ~15-25 types, 3-5 modules, ~3K-5K LOC
**Validates**:
- Multi-reference extraction
- Medium complexity non-layered plan
- Agent/tool/memory domain (different from game engine)

## Test 3: Game Engine v2 (Layered, Large — Fresh Build)
**Goal**: "Build nova game engine"
**Target**: `nova`
**References**: `playcanvas`, `thief-engine`
**Flow**: Layered (game_engine_project template — 74 types, 10 layers)
**Expected**: ~74 types, 10 modules, ~10K+ LOC
**Validates**:
- Full layered pipeline from scratch (no existing blueprints)
- Parallel batch execution (4 types/batch)
- Emission index with existing descriptors
- Semantic store integration
- tsconfig.json + package.json generation
- tsc --noEmit verification
- Comparación directa con z86

## Test 4: Code Editor Extension (Non-Layered, Medium-Large)
**Goal**: "Build a code editor extension with language server, file tree, and terminal"
**Target**: `editx`
**References**: `cline-core` (680 descriptors — VS Code extension patterns)
**Flow**: Non-layered
**Expected**: ~20-30 types, 4-6 modules, ~4K-7K LOC
**Validates**:
- Large non-layered project
- Rich reference data (680 descriptors)
- UI/editor domain

## Test 5: Incremental Rebuild + Resume (z86)
**Goal**: Delete 2 modules from z86 (scene + graphics), rebuild incrementally
**Target**: `z86` (existing)
**Flow**: Layered, incremental
**Expected**: Only scene + graphics regenerated, rest skipped
**Validates**:
- Incremental skip logic (existing code preserved)
- Selective regeneration
- Resume from saved plan
- Chain integrity after partial rebuild

---

## Ejecución Iterativa

Para cada test (1-4):

```
# Fase 1: Generación inicial
python ava dev "<goal>" -t <target> -r <refs> -v --max-iterations 120

# Fase 2: Incremental rebuild (sin cambios → 0 tokens)
python ava dev "<goal>" -t <target> -r <refs> -v --max-iterations 120

# Fase 3: Density analysis
python ava dev --density <target>
```

Para test 5:
```
# Borrar scene y graphics
rm -rf projects/z86/src/scene projects/z86/src/graphics
rm projects/z86/blueprints/scene.bp.yaml projects/z86/blueprints/graphics.bp.yaml

# Rebuild incremental
python ava dev "Build z86 game engine" -t z86 -r playcanvas -v --max-iterations 120
```

## Métricas a Capturar

| Métrica | Test 1 | Test 2 | Test 3 | Test 4 | Test 5 |
|---------|--------|--------|--------|--------|--------|
| Total LOC | — | — | — | — | — |
| Tipos generados | — | — | — | — | — |
| Tokens consumidos | — | — | — | — | — |
| Tiempo total (s) | — | — | — | — | — |
| Density promedio | — | — | — | — | — |
| Chain integrity | — | — | — | — | — |
| tsc errors | — | — | — | — | — |
| Incremental skip % | — | — | — | — | — |

## Nuevos ProjectBlueprint Templates Necesarios

Solo Test 3 usa el template layered existente. Tests 1, 2, 4 usan el flujo non-layered (LLM decide la estructura). Esto es intencional — queremos validar ambos flujos.

## Riesgos

1. **Rate limiting**: Groq tiene límites de RPM. Tests 3-4 pueden requerir pausas.
2. **Non-layered quality**: Sin dependency ordering, los imports cross-module pueden fallar.
3. **tsc sin node_modules**: `tsc --noEmit` fallará si hay imports de paquetes externos (DOM APIs, etc). Necesitamos `skipLibCheck: true` + `lib: ["DOM"]` en tsconfig (ya incluido).
