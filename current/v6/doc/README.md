# AVA — Code Intelligence Compiler & Agent

AVA es un sistema que (1) analiza repositorios de codigo fuente generando descriptores YAML
estructurados, y (2) genera proyectos TypeScript completos desde lenguaje natural usando
esos descriptores como referencia.

**Codebase**: 130 archivos Python (17,531 LOC) + 9 archivos Rust (4,533 LOC) = 22,064 LOC total

---

## 1. Que es AVA

Dos capacidades principales:

### 1.1 Roska — Analisis de codigo (Rust engine)

Parsea repositorios con tree-sitter y genera descriptores YAML compactos que un LLM
puede consumir para entender arquitectura, dependencias, seguridad y calidad sin leer
el codigo fuente directamente.

### 1.2 Agent — Generacion de proyectos (Python)

Toma una descripcion en lenguaje natural y genera un proyecto TypeScript completo:
modulos, tipos, clases, interfaces, enums, barrel exports, dependencias cruzadas.

```bash
# Analizar un repositorio existente
python ava add my-project /path/to/repo
python ava refresh my-project

# Generar un proyecto nuevo desde lenguaje natural
python ava dev "Build x86 VM emulator with CPU, ALU, decoder, memory, I/O" -t x86vm --max-iterations 30
```

---

## 2. Pipeline General

```
                     ┌─────────────────────────────────────────────┐
                     │           AVA CLI (ava)                      │
                     │  add | refresh | list | dev | duel | intel   │
                     └──────────┬───────────────────┬──────────────┘
                                │                   │
              ┌─────────────────▼──────┐   ┌───────▼──────────────────────┐
              │  Roska (Rust)       │   │  Agent System (Python)       │
              │  tree-sitter parsing   │   │  LLM-driven code generation  │
              │  → YAML descriptors    │   │  → TypeScript projects       │
              └────────────────────────┘   └──────────────────────────────┘
```

---

## 3. Estructura del Proyecto

```
moko/
├── ava                              ← CLI principal (Python script)
├── projects.json                    ← Registro de 23 proyectos analizados
├── src/
│   ├── Cargo.toml                   ← Rust crate "Roska"
│   ├── src/                         ← Rust engine (4,533 LOC)
│   │   ├── main.rs          (426)   ← CLI + workspace builder
│   │   ├── parse.rs         (940)   ← Python parser (tree-sitter)
│   │   ├── parse_ts.rs      (908)   ← TypeScript parser (tree-sitter)
│   │   ├── model.rs         (449)   ← Workspace, Module, File, Type, Func
│   │   ├── graph.rs         (492)   ← MicroGraphs con Ports
│   │   ├── opcodes.rs       (441)   ← 16 opcodes (Call, Store, BrTrue, Loop...)
│   │   ├── emit.rs          (367)   ← Emision YAML
│   │   ├── olevel.rs        (317)   ← O-levels O0→O3 (compresion semantica)
│   │   └── dot.rs           (193)   ← Export Graphviz DOT
│   ├── analyze.py                   ← LLM analyzer standalone (Groq/Kimi K2)
│   ├── synth.py                     ← Cross-project synthesis
│   └── agent/                       ← Sistema agente (17,531 LOC, 130 archivos)
│       ├── core/                    ← Infraestructura compartida
│       ├── dev/                     ← Pipeline de desarrollo (CORE)
│       ├── engines/                 ← Subsistemas especializados
│       │   ├── quality/             ← Quality engine (5,809 LOC)
│       │   ├── reference/           ← Intelligence + Feature AST
│       │   ├── context/             ← LiveIndex + validacion pre-write
│       │   ├── fix/                 ← Error correction con ML
│       │   ├── blueprint/           ← Blueprint compose/extract
│       │   ├── tool/                ← ProjectGraph + scanner
│       │   ├── embedding/           ← Semantic TF-IDF search
│       │   └── memory/              ← CodeBlockStore
│       ├── duel/                    ← A/B testing de implementaciones
│       ├── actors/                  ← Async workers (asyncio queues)
│       ├── agents/                  ← Agentes especializados
│       ├── pipeline/                ← Action pipeline + compressor
│       ├── vectorstore/             ← Semantic search (indexer + store)
│       ├── session/                 ← State management
│       ├── xvm/                     ← Micro VM executor
│       ├── prompts/                 ← Template registry
│       └── tools/                   ← Utilities (density, emission, compaction)
├── projects/                        ← Proyectos generados
├── data/                            ← Reference intelligence + quality model
├── tests/                           ← Feature AST tests
├── doc/                             ← Este archivo
└── docs/                            ← Propuestas de arquitectura
```

---

## 4. Agent System — Modulos en Detalle

### 4.1 core/ — Infraestructura (1,684 LOC)

| Archivo | LOC | Que Hace |
|---------|-----|----------|
| `models.py` | 710 | Plan, Block, BlockType, BlockStatus, TypeBlueprint, ModuleBlueprint, FieldSpec, MethodSpec |
| `branch.py` | 360 | Branch, Project, EvalConfig, EvalResult — gestion de ramas git |
| `guardrails.py` | 312 | RunLimits, RunGuard — limites de tiempo/tokens/bloques |
| `llm/providers.py` | 276 | LLMProvider: Groq, Anthropic, OpenAI — abstraccion multi-proveedor |
| `llm/caller.py` | 61 | LLMCaller — wrapper de llamadas |
| `config.py` | 57 | AvaConfig — paths, env vars |

### 4.2 dev/ — Pipeline de Desarrollo (7,048 LOC)

El corazon del sistema. Orquesta la generacion de proyectos completos.

| Archivo | LOC | Que Hace |
|---------|-----|----------|
| `supervisor.py` | 1,799 | **Orquestador principal** — Supervisor: planifica, ejecuta blocks, reporta |
| `branch_pipeline.py` | 1,671 | **BranchPipelineOrchestrator** — pipeline por ramas git, cada modulo en su rama |
| `translator.py` | 1,260 | **BlueprintTranslator** — blueprint YAML → TypeScript via LLM |
| `cli.py` | 1,009 | Entry point: `ava dev`, `ava features`, `ava duel`, `ava intel` |
| `task_decomposer.py` | 754 | **TaskDecomposer** — descompone tarea grande en ModuleTasks |
| `manager.py` | 352 | **DevManager** — multi-branch coordinator |
| `discussion_proposals.py` | 329 | BranchProposal — extrae propuestas de discusiones multi-stance |
| `compile_fix_loop.py` | 314 | **CompileFixLoop** — ejecuta tsc, parsea errores, corrige, repite |
| `protocols.py` | 111 | 10 Protocol definitions (interfaces abstractas) |
| `git_manager.py` | 139 | GitManager — operaciones git automatizadas |
| `config.py` | 74 | LLMConfig, DecomposerConfig, FixConfig, PipelineConfig |
| `errors.py` | 64 | Jerarquia de excepciones: AVAError, CompilationError, BlueprintError... |

**Flujo de ejecucion:**

```
CLI → Supervisor.run()
        │
        ├── TaskDecomposer → divide en ModuleTasks
        ├── BranchPipelineOrchestrator → una rama git por modulo
        │     │
        │     ├── ANALYZE block → LLM genera blueprint YAML
        │     ├── IMPLEMENT blocks → BlueprintTranslator → TypeScript
        │     ├── CompileFixLoop → tsc --noEmit → fix → retry
        │     └── Merge cuando tsc clean
        │
        └── TEST block final → density report + validacion
```

### 4.3 engines/ — Subsistemas Especializados

#### engines/quality/ (5,809 LOC) — Motor de Calidad

El engine mas grande. Evalua y mejora la calidad del codigo generado sin LLM.

| Archivo | LOC | Que Hace |
|---------|-----|----------|
| `learned_scorer.py` | 1,263 | **LearnedScorer** — scoring multi-dimension con CodeProfile |
| `style_rules.py` | 807 | 7 categorias de reglas: Structure, Naming, Error, Safety, Doc, Pattern, Formatting |
| `__init__.py` | 703 | **QualityEngine** — orquestador de calidad |
| `ts_analyzer.py` | 684 | **TypeScriptAnalyzer** — analisis estatico TS (nesting, coupling, duplicates) |
| `style_profile.py` | 654 | **StyleAnalyzer** — aprende estilo del proyecto de referencia |
| `quality_strategies.py` | 669 | 8 estrategias de correccion (Type, Naming, Structure, Encapsulation...) |
| `quality_features.py` | 503 | **QualityFeatureExtractor** — extrae features numericas del codigo |
| `quality_classifier.py` | 433 | **QualityClassifier** — decision tree para clasificar calidad |
| `quality_db.py` | 265 | QualityDB — historico de evaluaciones |

#### engines/reference/ (1,988 LOC) — Inteligencia de Referencia

| Archivo | LOC | Que Hace |
|---------|-----|----------|
| `intelligence.py` | 818 | **IntelligenceGenerator** — sintetiza Roska descriptors en ProjectIntelligence |
| `feature_ast.py` | 763 | **FeatureNode, build_feature_ast()** — arbol jerarquico de features con auto-seleccion |
| `models.py` | 407 | 20+ modelos: Metrics, StyleProfile, ArchPattern, Feature, ProjectIntelligence |

#### engines/context/ (1,326 LOC) — Contexto en Vivo

| Archivo | LOC | Que Hace |
|---------|-----|----------|
| `index.py` | 573 | **LiveIndex** — indice en tiempo real: imports, signatures, types, issues por archivo |
| `snapshot.py` | 300 | **ContextBuilder** — construye snapshot de contexto para el LLM |
| `validator.py` | 269 | **PreWriteValidator** — valida codigo ANTES de escribirlo a disco |
| `invariants.py` | 113 | **InvariantStore** — reglas que siempre deben cumplirse |
| `persistence.py` | 87 | RunPersistence — guarda/carga estado entre ejecuciones |

#### engines/fix/ (2,007 LOC) — Correccion de Errores

| Archivo | LOC | Que Hace |
|---------|-----|----------|
| `intelligence.py` | 456 | **ErrorIntelligence** — clustering de errores tsc, auto-fix por patrones |
| `__init__.py` | 446 | **FixEngine** — orquestador: aplica estrategias, mide resultado |
| `classifier.py` | 334 | **FixClassifier** — decision tree para elegir estrategia de fix |
| `features.py` | 308 | **FeatureExtractor** — extrae features numericas de errores tsc |
| `error_db.py` | 249 | ErrorDB — historico de errores y fixes exitosos |
| `strategies.py` | 214 | SyntaxStrategy, ImportStrategy, ConstructorTypoStrategy |

#### engines/blueprint/ (1,930 LOC) — Blueprints

| Archivo | LOC | Que Hace |
|---------|-----|----------|
| `extractor.py` | 581 | **SourceExtractor** — codigo fuente → ExtractedType con metodos y campos |
| `advisor.py` | 535 | **ProjectAdvisor** — sugiere scope y modulos para un proyecto nuevo |
| `composer.py` | 476 | **BlueprintComposer** — merge multi-source blueprints |
| `project.py` | 338 | **ProjectBlueprint** — templates de proyecto (e.g. game_engine_project) |

#### engines/tool/ (1,380 LOC) — ProjectGraph y Validacion

| Archivo | LOC | Que Hace |
|---------|-----|----------|
| `graph.py` | 351 | **ProjectGraph** — mapa de archivos/exports/imports del proyecto generado |
| `scanner.py` | 281 | **FileScanner** — parsea .ts → ExportInfo, ImportInfo |
| `import_resolver.py` | 249 | **ImportResolver** — corrige phantom imports post-generacion |
| `shared_types.py` | 216 | **SharedTypeDetector** — detecta tipos compartidos y genera types.ts |
| `validator.py` | 209 | **PostGenValidator** — validacion post-generacion |
| `retry.py` | 47 | RetryEngine — re-traduccion si falla validacion |

#### engines/embedding/ (464 LOC) — Busqueda Semantica

| Archivo | LOC | Que Hace |
|---------|-----|----------|
| `store.py` | 297 | **SemanticStore** — TF-IDF index de descriptores |
| `similarity.py` | 167 | cosine_similarity, tfidf_vectorize, NameNormalizer |

#### engines/memory/ (231 LOC)

| Archivo | LOC | Que Hace |
|---------|-----|----------|
| `block_store.py` | 231 | **CodeBlockStore** — memoria de bloques de codigo a nivel metodo |

### 4.4 duel/ — A/B Testing (2,194 LOC)

| Archivo | LOC | Que Hace |
|---------|-----|----------|
| `project.py` | 683 | **ProjectDuel** — compara dos proyectos completos |
| `runner.py` | 623 | **DuelRunner** — compara tipo a tipo entre implementaciones |
| `features.py` | 581 | **FeatureAnalyzer** — analisis de features en discusion multi-stance |
| `evaluation.py` | 307 | Eval plan, workspace setup, benchmark |

### 4.5 actors/ — Async Workers (723 LOC)

Workers con asyncio queues para ejecucion paralela.

| Archivo | LOC | Que Hace |
|---------|-----|----------|
| `planner.py` | 208 | PlannerActor — genera planes de ejecucion |
| `discussant.py` | 154 | DiscussantActor — participa en debates multi-stance |
| `abstractor.py` | 127 | AbstractorActor — abstrae resultados de bloques |
| `proposer.py` | 97 | ProposerActor — genera propuestas de mejora |
| `base.py` | 89 | BaseActor, ActorResult, ActorRegistry |

### 4.6 agents/ — Agentes Especializados (784 LOC)

| Archivo | LOC | Que Hace |
|---------|-----|----------|
| `compare.py` | 173 | CompareAgent — compara proyectos cross-project |
| `security.py` | 168 | SecurityAgent — analisis de seguridad |
| `architect.py` | 159 | ArchitectAgent — analisis arquitectonico |
| `dependency.py` | 158 | DependencyAgent — analisis de dependencias |
| `base.py` | 67 | BaseAgent, AgentContext, AgentResult |
| `search.py` | 59 | SearchAgent — busqueda en descriptores |

### 4.7 pipeline/ — Action Pipeline (919 LOC)

| Archivo | LOC | Que Hace |
|---------|-----|----------|
| `actions.py` | 359 | 9 Actions: SelectPolicy, MapProjects, LoadDeps, CompressAll... |
| `compressor.py` | 356 | **CompressionEngine** — comprime contexto para caber en ventana LLM |
| `matrix.py` | 204 | **StateMatrix** — estado de analisis por modulo/proyecto |

### 4.8 tools/ — Utilidades (1,056 LOC)

| Archivo | LOC | Que Hace |
|---------|-----|----------|
| `compaction.py` | 463 | topo_sort_types, generate_contracts, validate_imports, compact contexts |
| `density.py` | 287 | **DensityAnalyzer** — mide completitud: methods_implemented / methods_in_blueprint |
| `emission.py` | 266 | **EmissionIndex** — indice invertido de descriptores Roska |
| `naming.py` | 40 | to_kebab_case, to_pascal_case, to_camel_case |

### 4.9 Otros Modulos

| Modulo | LOC | Que Hace |
|--------|-----|----------|
| `vectorstore/` | 555 | Indexer + VectorStore + EmbeddingProvider — busqueda semantica |
| `xvm/` | 578 | BlockVM + BlockScheduler + BlockExecutor — micro VM de ejecucion |
| `session/` | 275 | SessionState + ConversationHistory — estado de sesion |
| `prompts/` | 440 | PromptRegistry + templates — gestion de prompts LLM |

---

## 5. Rust Engine — Roska (4,533 LOC)

Parsea codigo fuente con tree-sitter y genera descriptores YAML.

### Opciones del CLI

| Flag | Descripcion | Default |
|------|-------------|---------|
| `-i` | Directorio raiz del repo | (requerido) |
| `-o` | Directorio de salida YAML | (requerido) |
| `-n` | Nombre del proyecto | `package` |
| `--lang` | Forzar lenguaje: `python`, `ts`, `auto` | `auto` |
| `--olevel` | Nivel de compresion: 0-3 | `0` |
| `--graph` | Generar MicroGraphs YAML | off |
| `--dot` | Generar archivos Graphviz DOT | off |
| `--opcodes` | Extraer opcodes (solo Python) | off |
| `--depth` | Profundidad de analisis: 0-3 | `3` |
| `--budget` | Budget de tokens para analyze.py | `12000` |

### O-Levels (Compresion semantica)

| Nivel | Nombre | Que hace |
|-------|--------|----------|
| O0 | Raw | Todo tal cual, sin filtrar |
| O1 | Structural | Suprime stdlib, dunders triviales, funciones <3 lineas |
| O2 | Semantic | Surprise scoring: filtra funciones privadas con score <0.3 |
| O3 | Intent | Solo firmas publicas, tipos publicos, imports cross-module |

### Opcodes (16 tipos)

```
Call, Ret, Try, BrTrue, Loop, With, Raise, New,
Store, Load, FieldAccess, Yield, Await, Assert, Br, Label
```

---

## 6. Como Usar

### Analizar un repositorio existente

```bash
# Registrar proyecto
python ava add my-project /path/to/repo

# Generar descriptores (usa Roska internamente)
python ava refresh my-project

# Listar proyectos registrados
python ava list

# Generar Project Intelligence
python ava intel my-project
```

### Generar proyecto desde lenguaje natural

```bash
export GROQ_API_KEY=gsk_...

# Generacion completa
python ava dev "Build x86 VM emulator" -t x86vm --max-iterations 30 -v

# Con referencias
python ava dev "Build AI agent framework" -t agentkit -r swarm,langgraph --max-iterations 120

# Feature AST (seleccion de features de referencia)
python ava features my-project

# Duel A/B
python ava duel projectA projectB
```

### Analizar con LLM (standalone)

```bash
python src/analyze.py out/my-project --mode arch        # arquitectura
python src/analyze.py out/my-project --mode security    # seguridad
python src/analyze.py out/my-project --mode quality     # calidad
python src/analyze.py out/my-project "How does auth work?"  # pregunta libre
```

---

## 7. Registro de Proyectos

`projects.json` contiene 23 proyectos analizados incluyendo:

| Proyecto | Lenguaje | Descriptores | Dominio |
|----------|----------|-------------|---------|
| cline-core | TypeScript | 680 | VS Code extension |
| kilocode | TypeScript | 2,263 | Code editor |
| mastra | TypeScript | 6,645 | AI framework |
| void | TypeScript | 7,269 | Editor (33.7 MB) |
| crewai | Python | 1,074 | AI agents |
| codex-cli | TypeScript | — | CLI tool |
| playcanvas | TypeScript | — | Game engine |
| openspace | Python | 176 | AI agent framework |

---

## 8. Guardrails

```python
RunLimits:
    max_time_s:  600      # 10 minutos maximo
    max_tokens:  500,000  # Medio millon de tokens
    max_blocks:  200      # 200 bloques maximo
    max_stale:   5        # 5 bloques sin progreso → abort
```

---

## 9. Estructuras de Datos Clave

### Plan → Block chain
```
Plan(goal, target, blocks[]) → Block(index, type, objective, status, hash, prev_hash)
```
Cada Block completado forma una cadena SHA256 verificable.

### Blueprint hierarchy
```
ProjectBlueprint → Layer[] → ModuleBlueprint → TypeBlueprint → MethodSpec[] + FieldSpec[]
```

### ProjectGraph (runtime)
```
ProjectGraph(files, symbols, modules) → scan() → resolve_import() → find_phantoms()
```

### LiveIndex (context engine)
```
LiveIndex(file_states) → FileState(imports, signatures, types, issues)
```

---

## 10. Limitaciones Actuales

1. **Solo Python y TypeScript** como lenguajes de entrada para Roska
2. **Solo genera TypeScript** como lenguaje de salida
3. **Opcodes solo para Python** — TypeScript sin extraccion de opcodes
4. **Budget de tokens es estimacion** — usa chars/4, no un tokenizer real
5. **Requiere LLM externo** — Groq (Kimi K2) como proveedor principal
