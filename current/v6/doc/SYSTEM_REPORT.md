# AVA — Reporte Tecnico Completo

**Codebase**: 22,064 LOC (17,531 Python, 4,533 Rust) | 130 archivos Python, 9 Rust
**Fecha**: 2026-03-25

---

## 1. Que es AVA

AVA es un compilador de codigo que genera **proyectos TypeScript completos** desde
lenguaje natural. No genera un archivo — genera docenas de archivos organizados en
modulos, con tipos, clases, interfaces, enums, barrel exports y dependencias cruzadas.

```bash
ava dev "Build x86 VM emulator with CPU, ALU, decoder, memory, I/O" -t x86vm
# → 25 archivos .ts, 2,754 LOC, 5 modulos, 20 tipos, 93 segundos
```

**Filosofia clave**: Extraccion sobre invencion. Las APIs vienen de codigo REAL de
proyectos de referencia, no de la imaginacion del LLM.

---

## 2. Arquitectura General

```
┌──────────────────────────────────────────────────────────────────┐
│                        AVA CLI (ava)                              │
│         add | list | refresh | analyze | dev | duel | intel       │
└──────┬──────────────────────────────────────┬────────────────────┘
       │ subprocess                           │ Python directo
       ▼                                      ▼
┌────────────────┐          ┌──────────────────────────────────────┐
│ Roska       │          │        Agent System (Python)          │
│ (Rust binary)  │          │                                       │
│                │          │  ┌────────┐ ┌────────┐ ┌──────────┐  │
│ tree-sitter    │ YAML     │  │ core/  │ │  dev/  │ │ engines/ │  │
│ AST parsing    │──files──▶│  │ models │ │pipeline│ │ 8 motores│  │
│                │          │  │ guards │ │  fix   │ │ quality  │  │
│ CLI only       │          │  │ LLM    │ │ trans. │ │ fix      │  │
│ NO FFI/pyo3    │          │  └────────┘ └────────┘ │ context  │  │
└────────────────┘          │                         │ reference│  │
                            │  ┌────────┐ ┌────────┐ │ blueprint│  │
                            │  │ duel/  │ │ tools/ │ │ embedding│  │
                            │  │ A/B    │ │density │ │ memory   │  │
                            │  │testing │ │compact │ └──────────┘  │
                            │  └────────┘ └────────┘               │
                            └──────────────────────────────────────┘
```

---

## 3. Roska — El Motor Rust (4,533 LOC)

Parsea repositorios con tree-sitter y genera descriptores YAML.

```
Codigo fuente (.py, .ts)
    │
    ▼
┌────────────────────────────┐
│  Roska                   │
│  9 modulos Rust:            │
│  parse.rs     (940) Python  │
│  parse_ts.rs  (908) TS      │
│  graph.rs     (492) Grafos  │
│  model.rs     (449) Modelo  │
│  opcodes.rs   (441) 16 ops  │
│  main.rs      (426) CLI     │
│  emit.rs      (367) YAML    │
│  olevel.rs    (317) O0-O3   │
│  dot.rs       (193) DOT     │
└────────────┬───────────────┘
             │
             ▼
YAML descriptors + DOT graphs → disco
  workspace.yaml (meta-grafo)
  module.yaml (por modulo)
  *.yaml (por archivo)
```

**Invocacion**: Python llama via `subprocess.run([binary, "-i", source, "-o", out])`.
NO hay FFI, NO hay pyo3. Es un binario CLI puro con clap.

**O-Levels** (compresion semantica):

| Nivel | Que hace |
|-------|----------|
| O0 | Todo raw |
| O1 | Suprime stdlib, funciones triviales |
| O2 | Surprise scoring, filtra privadas score < 0.3 |
| O3 | Solo firmas publicas, imports cross-module |

**23 proyectos registrados** en projects.json: cline-core, kilocode, mastra, void,
crewai, codex-cli, playcanvas, openspace, etc.

---

## 4. Pipeline de Generacion de Codigo

```
ENTRADA: "Build x86 VM emulator"
    │
    ▼
┌──────────────────────────────────────────────────────────┐
│ 1. DECOMPOSICION                                          │
│    TaskDecomposer analiza el goal                          │
│    Busca referencia real (descriptores de proyectos)       │
│    → Lista de ModuleTasks ordenada por dependencias        │
│    Ejemplo: [registers, memory, cpu_core, decoder, runtime]│
└──────────────────────┬───────────────────────────────────┘
                       │
    ┌──────────────────┴──────────────────────┐
    │                                          │
    ▼                                          ▼
┌──────────────────┐                ┌──────────────────┐
│ ModuleTask:      │                │ ModuleTask:      │
│ "registers"      │                │ "cpu_core"       │
│ depends: []      │                │ depends: [reg]   │
└────────┬─────────┘                └────────┬─────────┘
         │                                    │
         ▼                                    ▼
┌──────────────────────────────────────────────────────────┐
│ 2. BRANCH PIPELINE (por modulo)                           │
│                                                            │
│    git checkout -b feature/registers                       │
│        │                                                   │
│        ├─ BLUEPRINT ──────────────────────────────────     │
│        │  EmissionIndex busca descriptores similares       │
│        │  SourceExtractor extrae firmas REALES             │
│        │  BlueprintComposer fusiona fuentes:               │
│        │    extraction (conf 0.95) > store (0.8) >         │
│        │    emission (0.5) > LLM (fallback)                │
│        │  → ModuleBlueprint con TypeBlueprints             │
│        │                                                   │
│        ├─ GENERACION (por tipo) ──────────────────────     │
│        │  Para cada TypeBlueprint:                         │
│        │    1. Cargar blueprint YAML de disco               │
│        │    2. ContextBuilder genera snapshot por rol       │
│        │    3. Compaction si blueprint > 4K tokens          │
│        │    4. LLM traduce → TypeScript                     │
│        │    5. PreWriteValidator valida contra LiveIndex    │
│        │    6. Escribir a disco                             │
│        │    7. LiveIndex.update() (~5ms incremental)        │
│        │                                                   │
│        ├─ COMPILACION + FIX ──────────────────────────     │
│        │  tsc --noEmit                                      │
│        │    │                                               │
│        │    ▼                                               │
│        │  ErrorIntelligence (cascade detection)             │
│        │    47 errores → 3 root causes                      │
│        │    │                                               │
│        │    ▼                                               │
│        │  Auto-fix strategies (0 tokens):                   │
│        │    SyntaxStrategy: brackets, semicolons            │
│        │    ImportStrategy: resolver via LiveIndex           │
│        │    TypoStrategy: Type() → TypeError()              │
│        │    │                                               │
│        │    ▼                                               │
│        │  Si quedan errores → LLM fix (solo root causes)   │
│        │    │                                               │
│        │    ▼                                               │
│        │  Repetir hasta clean o max iteraciones             │
│        │                                                   │
│        ├─ QUALITY ────────────────────────────────────     │
│        │  DensityAnalyzer: methods_impl / methods_bp       │
│        │  QualityEngine: auto-fix types, naming, encap     │
│        │                                                   │
│        └─ git merge → main                                 │
│                                                            │
└──────────────────────────────────────────────────────────┘
         │
         ▼
    PROYECTO COMPLETO
    25 archivos .ts, 5 modulos, tsc clean
```

---

## 5. Los 8 Engines — Que Hace Cada Uno

### 5.1 engines/quality/ (5,809 LOC) — Calidad de Codigo

Evalua y mejora codigo generado en 6 capas sin (o con minimo) uso de LLM.

```
Codigo → 38 features (regex) → 11 tipos de issues → Classifier predice accion
    → 7 auto-fix strategies (0 tokens) → LLM solo si quedan issues criticos
    → Learning DB (cada fix se registra, classifier mejora)
```

**Componentes**:
- `metrics.py` (191 LOC) — Regex compartidos, single source of truth
- `quality_features.py` (503) — 38 metricas por archivo
- `quality_classifier.py` (433) — Decision tree + DB similarity + reglas
- `quality_strategies.py` (669) — 7 estrategias auto-fix (types, naming, encap, docs, errors, structure)
- `quality_db.py` (265) — JSONL append-only, learning loop
- `style_profile.py` (654) — 27 dimensiones de estilo, Bayesian update
- `ts_analyzer.py` (684) — Analisis estatico TS: cognitive complexity, coupling, duplicates, cohesion
- `code_profile.py` (128) — 75 metricas de perfil de proyecto
- `profile_extractor.py` (470) — Extrae perfil de proyecto completo
- `learned_scorer.py` (354) — 52 dimensiones con pesos, scoring vs referencia

**Stores**: `.quality_db.jsonl`, `.style_profile.json`, `.learned_scorer.json`

### 5.2 engines/fix/ (2,007 LOC) — Correccion de Errores TSC

Pipeline inteligente que resuelve errores de compilacion con minimo uso de LLM.

```
tsc errors → ErrorIntelligence (cascade: 47→3 root causes)
  → FixClassifier (predice estrategia, 0 tokens post-training)
  → SyntaxStrategy (brackets, semicolons — 0 tokens)
  → ImportStrategy (LiveIndex lookup — 0 tokens)
  → TypoStrategy (Type→TypeError — 0 tokens)
  → LLM fix (solo lo que sobrevive layers 0-2)
  → ErrorDB registra resultado → classifier mejora
```

**Componentes**:
- `__init__.py` (446) — FixEngine orquestador
- `intelligence.py` (456) — ErrorIntelligence: cascade detection, auto-fix, prioritizacion
- `classifier.py` (334) — Decision tree para elegir estrategia
- `features.py` (308) — Feature extraction de errores TSC
- `error_db.py` (249) — JSONL independiente de quality
- `strategies.py` (214) — SyntaxStrategy, ImportStrategy, ConstructorTypoStrategy

**Store**: `.error_db.jsonl` (separado de quality)

### 5.3 engines/context/ (1,326 LOC) — Estado en Tiempo Real

Indice in-memory del proyecto generado. Se actualiza incrementalmente por cada
archivo escrito (~5ms por update).

```
Init: scan_all() → lee todos los .ts
  → files{}, type_registry{}, call_graph{}, export_map{}, import_map{}
  TODO en RAM

Cada file write: update(path)
  → re-parse 1 archivo
  → detecta breaking changes
  → actualiza grafos
  → retorna issues

Fin: persist → index-snapshot.json (archival)
```

**Componentes**:
- `index.py` (573) — **LiveIndex**: in-memory, scan_all + incremental update
- `snapshot.py` (300) — **ContextBuilder**: snapshots por rol (blueprint, translator, fixer)
- `validator.py` (269) — **PreWriteValidator**: valida codigo ANTES de escribir a disco
- `invariants.py` (113) — Reglas que siempre deben cumplirse
- `persistence.py` (87) — Guarda snapshot JSON post-run

**Store**: En memoria durante run. `index-snapshot.json` al final (archival).

### 5.4 engines/reference/ (1,988 LOC) — Inteligencia de Referencia

Sintetiza descriptores Roska en Project Intelligence. Read-only, no tiene learning DB.

```
Roska descriptors (YAML) → IntelligenceGenerator
  → Metricas automaticas (LOC, complexity, coupling)
  → Style profile (naming, error handling, async)
  → 2 LLM calls (patterns, features, decisions)
  → .pi.yaml + .pi.md (Project Intelligence)

.pi.yaml → FeatureAST
  → Arbol jerarquico de capabilities
  → Seleccion interactiva con auto-deps
  → Alimenta TaskDecomposer
```

**Componentes**:
- `intelligence.py` (818) — IntelligenceGenerator: 2-fase (auto + LLM)
- `feature_ast.py` (763) — FeatureNode tree, auto-select con dependencias
- `models.py` (407) — 20+ modelos: Metrics, StyleProfile, ArchPattern, Feature, ProjectIntelligence

**Store**: `.pi.yaml`, `.pi.md`, `.features.yaml` — YAML read-only, sin JSONL

### 5.5 engines/blueprint/ (1,930 LOC) — Composicion de Blueprints

Crea blueprints desde multiples fuentes reales en vez de invencion LLM.

```
EmissionIndex (descriptores similares)
  + SourceExtractor (firmas reales de codigo)
  + SemanticStore (bloques aprendidos)
  + CodeBlockStore (patrones previos)
      │
      ▼
  BlueprintComposer fusiona por prioridad:
    extraction (0.95) > store (0.8) > emission (0.5) > LLM (fallback)
      │
      ▼
  ModuleBlueprint → TypeBlueprint[] con metodos, fields, constraints
```

**Componentes**:
- `extractor.py` (581) — SourceExtractor: firmas reales de codigo fuente
- `advisor.py` (535) — ProjectAdvisor: estima scope y sugiere modulos
- `composer.py` (476) — BlueprintComposer: merge multi-source
- `project.py` (338) — ProjectBlueprint templates (e.g. game_engine_project)

### 5.6 engines/tool/ (1,380 LOC) — ProjectGraph y Validacion

Introspecciona el proyecto generado: archivos, exports, imports.

**Componentes**:
- `graph.py` (351) — ProjectGraph: mapa archivos/exports/imports
- `scanner.py` (281) — FileScanner: parsea .ts
- `import_resolver.py` (249) — Corrige phantom imports
- `shared_types.py` (216) — Detecta tipos compartidos, genera types.ts
- `validator.py` (209) — PostGenValidator
- `retry.py` (47) — RetryEngine

### 5.7 engines/embedding/ (464 LOC) — Busqueda Semantica

- `store.py` (297) — SemanticStore: TF-IDF index de descriptores
- `similarity.py` (167) — cosine_similarity, tfidf_vectorize

### 5.8 engines/memory/ (231 LOC) — Memoria de Bloques

- `block_store.py` (231) — CodeBlockStore: memoria de codigo a nivel metodo

---

## 6. Modelo de Datos (core/models.py, 710 LOC)

```
Plan
  ├── goal: "Build x86 VM..."
  ├── target: "x86vm"
  └── blocks: [Block, Block, ...]
        │
        ▼
Block
  ├── type: ANALYZE | IMPLEMENT | TEST
  ├── status: PENDING | IN_PROGRESS | COMPLETED | FAILED
  ├── objective: "Translate ALU from cpu_core"
  ├── hash: SHA256(index + type + obj + prev_hash)  ← cadena verificable
  ├── tokens_used, files_changed
  └── meta: {module, type, blueprint}

ModuleBlueprint
  ├── name: "cpu_core"
  ├── language: "typescript"
  ├── target_dir: "src/cpu_core"
  └── types: [TypeBlueprint, ...]
        │
        ▼
TypeBlueprint
  ├── name: "ALU"
  ├── kind: "class" | "interface" | "enum"
  ├── methods: [MethodSpec, ...]  ← name, signature, hint, visibility
  ├── fields: [FieldSpec, ...]    ← name, type, default
  ├── extends, implements, constraints
  └── status: "pending" | "translated" | "verified"
```

---

## 7. Guardrails (core/guardrails.py, 312 LOC)

| Limite | Default | Que protege |
|--------|---------|-------------|
| max_total_tokens | 500K | Budget total LLM |
| max_plan_blocks | 200 | Tamano del plan |
| max_iterations | 100 | Loop principal |
| max_run_seconds | 3600 | Tiempo total (1h) |
| max_block_seconds | 300 | Tiempo por bloque (5min) |
| max_calls_per_minute | 60 | Rate limiting |
| max_identical_outputs | 3 | Deteccion de loops |
| max_discussion_rounds | 5 | Debates por feature |

---

## 8. Stores Persistentes

```
proyecto/
├── .quality_db.jsonl         ← QualityEngine (issues + fixes aprendidos)
├── .error_db.jsonl           ← FixEngine (errores TSC + resoluciones)
├── .style_profile.json       ← StyleProfile (preferencias de estilo usuario)
├── .learned_scorer.json      ← LearnedScorer (pesos de scoring vs referencia)
├── index-snapshot.json       ← LiveIndex snapshot post-run (archival)
├── blueprints/*.bp.yaml      ← ModuleBlueprints generados
└── src/**/*.ts               ← Codigo generado
```

**quality y fix son INDEPENDIENTES**: distinto schema, distinto archivo JSONL,
distinto feature extraction. Mismo patron arquitectonico (append-only + classifier).

**reference NO tiene learning DB**: es read-only, sintetiza YAML → ProjectIntelligence.

**LiveIndex es in-memory**: scan_all() al inicio, update() por file write, snapshot al final.

---

## 9. Metricas del Sistema

| Nivel | Cuantas | Para que |
|-------|---------|----------|
| CodeMetrics (shared regex) | 37 | Conteos raw compartidos |
| QualityFeatures | 38 | Deteccion de issues + auto-fix |
| CodeProfile | 75 | Perfil completo de proyecto |
| ScoreDimensions | 52 | Scoring con pesos vs referencia |

---

## 10. Duel System — A/B Testing (2,194 LOC)

Compara AVA pipeline vs prompting directo (Claude) en el mismo spec.

```
Mismo spec (e.g. Chip-8 emulator)
    │
    ├── Agent AVA: blueprint → emission → translator → fix
    └── Agent Claude: prompt directo → iterativo
    │
    ▼
Benchmark: LOC, methods, TSC errors, tokens, density
```

---

## 11. Decisiones Arquitectonicas Clave

### Bloques autocontenidos
Cada bloque lee de disco, hace 1 LLM call, escribe, descarta contexto.
→ Memoria lineal. Puede generar 500+ tipos sin explotar.

### Extraccion sobre invencion
EmissionIndex + SourceExtractor + BlueprintComposer fusionan codigo REAL.
LLM solo enriquece/adapta. → Menos alucinaciones, APIs fieles.

### Inteligencia en capas (fix)
70%+ de errores se corrigen sin LLM (auto-fix + cascade + import resolver).
→ 2-3x menos tokens que fix naive.

### Contexto por rol
ContextBuilder da a cada consumidor exactamente lo que necesita:
blueprint generator ≠ translator ≠ fixer. → Token efficiency.

### Learning loop
Cada observacion (quality o fix) se graba en JSONL.
A 30+ records, decision tree se entrena automaticamente.
→ Cada proyecto mejora el siguiente.

---

## 12. Como Usar

```bash
# Registrar proyecto de referencia
python ava add openspace /path/to/openspace

# Generar descriptores
python ava refresh openspace

# Generar Project Intelligence
python ava intel openspace

# Generar proyecto desde lenguaje natural
python ava dev "Build AI agent framework" -t agentkit -r openspace --max-iterations 30

# Comparar dos implementaciones
python ava duel projectA projectB

# Analizar calidad
python ava analyze openspace --mode quality
```
