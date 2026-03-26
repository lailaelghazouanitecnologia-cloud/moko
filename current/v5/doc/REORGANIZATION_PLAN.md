# AVA v2 — Propuesta de Reorganizacion

**Estado actual**: 137 archivos, 35,898 LOC en src/agent/
**Problemas**: dev/ es un cajon de sastre (26 files), duplicacion de modulos,
engines/quality/ es un sub-proyecto de 18 files, no hay separacion clara
entre pipeline, engines, y modelos.

---

## Estructura Propuesta

```
src/agent/
│
├── core/                           # Modelos + infra (no cambia mucho)
│   ├── models.py            (710)  # Plan, Block, Blueprint, TypeBlueprint
│   ├── guardrails.py        (312)  # RunLimits, RunGuard
│   ├── config.py             (57)  # AvaConfig
│   └── llm/
│       ├── providers.py     (276)  # LLMProvider: Groq, Anthropic, OpenAI
│       └── caller.py         (61)  # LLMCaller
│
├── cli/                            # NUEVO — entrada CLI separada de logica
│   ├── main.py                     # ava CLI entry point (del actual ava script)
│   ├── dev.py                      # cmd_dev (del actual dev/cli.py)
│   ├── intel.py                    # cmd_intel, cmd_features
│   └── duel.py                     # cmd_duel
│
├── pipeline/                       # REORGANIZADO — el flujo de generacion
│   ├── orchestrator.py             # BranchPipelineOrchestrator (de dev/branch_pipeline.py)
│   ├── supervisor.py               # DevSupervisor (de dev/supervisor.py)
│   ├── decomposer.py              # TaskDecomposer (de dev/task_decomposer.py)
│   ├── reasoner.py                # GoalReasoner + FunctionalSpec (de dev/goal_reasoner.py)
│   ├── translator.py              # BlueprintTranslator (de dev/translator.py)
│   ├── git.py                     # GitManager (de dev/git_manager.py)
│   ├── fix_loop.py                # CompileFixLoop (de dev/compile_fix_loop.py)
│   ├── config.py                  # LLMConfig, DecomposerConfig, etc
│   ├── errors.py                  # AVAError hierarchy
│   └── protocols.py               # Protocol definitions
│
├── engines/
│   ├── context/                    # Estado en vivo del proyecto (YA EXISTE)
│   │   ├── index.py         (573) # LiveIndex
│   │   ├── snapshot.py      (300) # ContextBuilder
│   │   ├── validator.py     (269) # PreWriteValidator
│   │   ├── invariants.py    (113) # InvariantStore
│   │   └── persistence.py    (87) # RunPersistence
│   │
│   ├── quality/                    # Quality analysis + learning (YA EXISTE)
│   │   ├── engine.py               # QualityEngine (de __init__.py)
│   │   ├── metrics.py              # CodeMetrics shared
│   │   ├── features.py             # QualityFeatureExtractor
│   │   ├── classifier.py           # QualityClassifier
│   │   ├── strategies.py           # 7 auto-fix strategies
│   │   ├── global_db.py            # GlobalQualityDB (SQLite + sqlite-vec)
│   │   ├── local_db.py             # QualityDB (JSONL audit log)
│   │   ├── style_profile.py        # StyleProfile + StyleAnalyzer
│   │   ├── style_rules.py          # StyleRules (user config)
│   │   ├── code_profile.py         # CodeProfile dataclass
│   │   ├── profile_extractor.py    # ProfileExtractor
│   │   ├── learned_scorer.py       # LearnedScorer
│   │   ├── ts_analyzer.py          # TypeScriptAnalyzer
│   │   ├── ast_detection.py        # ast-grep detection
│   │   ├── embedder.py             # QualityEmbedder pluggable
│   │   ├── adapters.py             # LanguageAdapter + TS/Python
│   │   ├── context_metrics.py      # ModuleContextMetrics
│   │   └── pretrain.py             # LLM pre-training script
│   │
│   ├── fix/                        # Error correction (YA EXISTE)
│   │   ├── engine.py               # FixEngine
│   │   ├── intelligence.py         # ErrorIntelligence
│   │   ├── classifier.py           # FixClassifier
│   │   ├── strategies.py           # SyntaxStrategy, ImportStrategy
│   │   ├── features.py             # ErrorFeatures
│   │   └── error_db.py             # ErrorDB
│   │
│   ├── blueprint/                  # Blueprint compose/extract (YA EXISTE)
│   │   ├── advisor.py              # ProjectAdvisor
│   │   ├── composer.py             # BlueprintComposer
│   │   ├── extractor.py            # SourceExtractor
│   │   └── project.py              # ProjectBlueprint
│   │
│   ├── reference/                  # Intelligence + Feature AST (YA EXISTE)
│   │   ├── intelligence.py         # IntelligenceGenerator
│   │   ├── feature_ast.py          # FeatureNode, build_feature_ast
│   │   └── models.py               # ProjectIntelligence, Metrics, etc
│   │
│   ├── retrieval/                  # CONSOLIDADO — toda la busqueda
│   │   ├── emission.py             # EmissionIndex (de tools/emission.py)
│   │   ├── semantic.py             # SemanticStore (de engines/embedding/)
│   │   ├── similarity.py           # cosine_similarity, TF-IDF (de engines/embedding/)
│   │   ├── vectorstore.py          # Indexer + VectorStore (de vectorstore/)
│   │   └── block_store.py          # CodeBlockStore (de engines/memory/)
│   │
│   ├── experiment/                 # NUEVO — variantes A/B + features
│   │   ├── variants.py             # VariantGenerator
│   │   ├── evaluator.py            # VariantEvaluator (metricas sin LLM)
│   │   ├── combiner.py             # VariantCombiner
│   │   └── features.py             # FeatureStore (features con metricas)
│   │
│   └── workspace/                  # NUEVO — profundidad forzada
│       ├── manager.py              # Crear, activar, cerrar workspaces
│       └── proposals.py            # Propuestas de mejora al usuario
│
├── duel/                           # A/B testing (YA EXISTE, sin cambios)
│   ├── runner.py
│   ├── project.py
│   ├── features.py
│   └── evaluation.py
│
├── actors/                         # Workers (SIMPLIFICADO)
│   ├── base.py
│   ├── abstractor.py
│   └── planner.py
│   # discussant.py → ELIMINADO (experiment engine lo reemplaza)
│   # proposer.py → movido a workspace/proposals.py
│
├── agents/                         # Agentes especializados (sin cambios)
│   ├── architect.py
│   ├── compare.py
│   ├── dependency.py
│   ├── search.py
│   └── security.py
│
├── session/                        # State management (sin cambios)
│   ├── state.py
│   └── history.py
│
├── xvm/                            # Micro VM (sin cambios)
│   ├── vm.py
│   ├── executor.py
│   ├── scheduler.py
│   └── context.py
│
└── tools/                          # Utilities (SIMPLIFICADO)
    ├── compaction.py               # Context compression
    ├── density.py                  # DensityAnalyzer
    └── naming.py                   # to_kebab_case, to_pascal_case
```

---

## Que cambia vs hoy

### Reorganizado (mover archivos, no reescribir)

| De | A | Razon |
|---|---|---|
| `dev/cli.py` (1,009 LOC) | `cli/dev.py` | CLI separado de logica |
| `dev/branch_pipeline.py` | `pipeline/orchestrator.py` | Pipeline es pipeline, no "dev" |
| `dev/supervisor.py` | `pipeline/supervisor.py` | Idem |
| `dev/task_decomposer.py` | `pipeline/decomposer.py` | Idem |
| `dev/goal_reasoner.py` | `pipeline/reasoner.py` | Idem |
| `dev/translator.py` | `pipeline/translator.py` | Idem |
| `dev/compile_fix_loop.py` | `pipeline/fix_loop.py` | Idem |
| `dev/git_manager.py` | `pipeline/git.py` | Idem |
| `dev/config.py` + `dev/errors.py` + `dev/protocols.py` | `pipeline/` | Idem |
| `tools/emission.py` | `engines/retrieval/emission.py` | Retrieval unificado |
| `engines/embedding/*` | `engines/retrieval/semantic.py` + `similarity.py` | Consolidado |
| `vectorstore/*` | `engines/retrieval/vectorstore.py` | Consolidado |
| `engines/memory/*` | `engines/retrieval/block_store.py` | Consolidado |
| `prompts/` + `engines/prompt/` | `pipeline/prompts.py` | Duplicacion eliminada |
| `llm/` (6 LOC stub) | ELIMINADO | Ya existe `core/llm/` |

### Nuevo (por implementar)

| Modulo | LOC est. | Que hace |
|---|---|---|
| `engines/experiment/variants.py` | ~150 | Genera N variantes en paralelo |
| `engines/experiment/evaluator.py` | ~200 | Evalua variantes con metricas (0 LLM) |
| `engines/experiment/combiner.py` | ~100 | Combina partes ganadoras |
| `engines/experiment/features.py` | ~150 | FeatureStore con metricas |
| `engines/workspace/manager.py` | ~150 | Crear, activar, cerrar workspaces |
| `engines/workspace/proposals.py` | ~150 | Propuestas de mejora al usuario |
| **Total nuevo** | **~900 LOC** | |

### Eliminado

| Archivo | LOC | Razon |
|---|---|---|
| `actors/discussant.py` | 154 | Experiment engine lo reemplaza |
| `actors/proposer.py` | 97 | workspace/proposals.py lo absorbe |
| `actors/manager.py` | 8 | Stub vacio |
| `actors/supervisor.py` | 33 | Stub vacio |
| `llm/providers.py` | 4 | Stub, ya existe core/llm/ |
| `llm/__init__.py` | 2 | Stub |
| `engines/prompt/` | 111 | Duplica prompts/ |
| `pipeline/` (actual) | 922 | Renombrado, no eliminado |
| **Total eliminado** | **~1,331 LOC** | |

---

## Balance

```
Actual:     137 archivos, 35,898 LOC
Propuesto:  ~125 archivos, ~35,467 LOC (-12 archivos, -431 LOC)

Cambio neto:
  +900 LOC (experiment + workspace)
  -1,331 LOC (stubs + duplicacion + discussant)
  = -431 LOC
```

---

## Orden de ejecucion

```
Fase 0: Reorganizar (mover archivos, actualizar imports) — 2-3h
  - Mover dev/ → pipeline/ + cli/
  - Consolidar retrieval/
  - Eliminar stubs y duplicados
  - Actualizar todos los imports
  - Verificar que ava dev funciona igual

Fase 1: Experiment engine — 1 dia
  - engines/experiment/variants.py
  - engines/experiment/evaluator.py
  - engines/experiment/combiner.py
  - engines/experiment/features.py
  - Integrar en pipeline/orchestrator.py

Fase 2: Workspace model — 1 dia
  - engines/workspace/manager.py
  - engines/workspace/proposals.py
  - workspace.yaml schema
  - Integrar en pipeline/orchestrator.py
  - Eliminar actors/discussant.py

Fase 3: Test end-to-end — medio dia
  - Generar chip8 con nueva estructura
  - Verificar experiment engine con modulo CPU
  - Verificar workspace proposals
```
