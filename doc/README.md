# Roska — Code Intelligence Compiler

Roska analiza repositorios de código fuente y genera descriptores YAML estructurados
que un LLM puede consumir para entender la arquitectura, dependencias, seguridad y
calidad de un codebase sin leer el código fuente directamente.

## Objetivo

Convertir cualquier repositorio en una representación compacta y semántica que permita
a un LLM responder preguntas sobre el código con precisión, referenciando tipos,
funciones y módulos reales.

## Pipeline

```
Source Code (.py, .ts, .tsx)
    │
    ▼
┌─────────────────────────────────┐
│  lyzed-ts (Rust + tree-sitter)  │
│  Parse AST → Roska Model        │
│  Build MicroGraphs + Ports      │
│  Apply O-Level compression      │
│  Extract opcodes (16 types)     │
└─────────────────────────────────┘
    │
    ▼
YAML Descriptors (out/{project}/)
    │
    ▼
┌─────────────────────────────────┐
│  analyze.py (Groq / Kimi K2)   │
│  Load descriptors with budget   │
│  Send to LLM with preset mode   │
│  Stream response + metrics      │
└─────────────────────────────────┘
    │
    ▼
Architecture / Security / Quality / Deps / Onboard report
```

## Estructura del proyecto

```
moko/
├── doc/                     ← documentación
│   └── README.md            ← este archivo
├── references/              ← repos de prueba
│   ├── agno/                ← Python (AI framework)
│   └── cline-core/          ← TypeScript (VS Code extension)
├── src/                     ← Roska engine (crate Rust)
│   ├── Cargo.toml
│   ├── analyze.py           ← LLM analyzer (Python)
│   └── src/
│       ├── main.rs          ← CLI + workspace builder
│       ├── model.rs         ← data model (Workspace, Module, File, Type, Func)
│       ├── parse.rs         ← Python parser (tree-sitter)
│       ├── parse_ts.rs      ← TypeScript parser (tree-sitter)
│       ├── graph.rs         ← MicroGraphs con Ports
│       ├── opcodes.rs       ← 16 opcodes (Call, Store, BrTrue, Loop, Try...)
│       ├── olevel.rs        ← O-levels O0→O3 (compresión semántica)
│       ├── emit.rs          ← emisión YAML
│       └── dot.rs           ← export Graphviz DOT
└── out/                     ← resultados generados
    ├── cline-core/          ← análisis de Cline
    └── codex/               ← análisis de OpenAI Codex
```

## Uso para un LLM

### Paso 1: Generar descriptores

```bash
# Compilar el engine
cargo build --release --manifest-path src/Cargo.toml

# Analizar un repo TypeScript
cargo run --release --manifest-path src/Cargo.toml -- \
  -i /path/to/repo \
  -o out/my-project \
  -n my-project \
  --graph --dot --olevel 2

# Analizar un repo Python
cargo run --release --manifest-path src/Cargo.toml -- \
  -i /path/to/repo \
  -o out/my-project \
  -n my-project \
  --graph --dot --olevel 2 --lang python
```

### Paso 2: Analizar con LLM

```bash
export GROQ_API_KEY=gsk_...

# Modos preset
python src/analyze.py out/my-project --mode arch        # arquitectura
python src/analyze.py out/my-project --mode deps        # dependencias
python src/analyze.py out/my-project --mode security    # seguridad
python src/analyze.py out/my-project --mode quality     # calidad
python src/analyze.py out/my-project --mode onboard     # onboarding

# Pregunta libre
python src/analyze.py out/my-project "How does authentication work?"

# Con métricas guardadas
python src/analyze.py out/my-project --mode arch --save metrics.json
```

### Paso 3: Interpretar métricas

El analyzer reporta uso real de tokens:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  METRICS
────────────────────────────────────────────────────────────
  Prompt tokens:     43,934       ← tokens de entrada (descriptores + pregunta)
  Completion tokens: 1,396        ← tokens generados por el LLM
  Total tokens:      45,330       ← coste total
  Speed:             141.7 tok/s  ← velocidad de generación
  Wall time:         9.85s        ← tiempo total
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Opciones del CLI (lyzed-ts)

| Flag | Descripción | Default |
|------|-------------|---------|
| `-i` | Directorio raíz del repo | (requerido) |
| `-o` | Directorio de salida YAML | (requerido) |
| `-n` | Nombre del proyecto | `package` |
| `--lang` | Forzar lenguaje: `python`, `ts`, `auto` | `auto` |
| `--olevel` | Nivel de compresión: 0-3 | `0` |
| `--graph` | Generar MicroGraphs YAML | off |
| `--dot` | Generar archivos Graphviz DOT | off |
| `--opcodes` | Extraer opcodes (solo Python) | off |
| `--depth` | Profundidad de análisis: 0-3 | `3` |
| `--budget` | Budget de tokens para analyze.py | `12000` |

## O-Levels (Compresión semántica)

| Nivel | Nombre | Qué hace |
|-------|--------|----------|
| O0 | Raw | Todo tal cual, sin filtrar |
| O1 | Structural | Suprime stdlib, dunders triviales, funciones <3 líneas |
| O2 | Semantic | Surprise scoring: filtra funciones privadas con score <0.3 |
| O3 | Intent | Solo firmas públicas, tipos públicos, imports cross-module |

**Recomendación para LLM:** Usar O2 para repos medianos (<50K LOC), O3 para repos grandes (>50K LOC).

## MicroGraphs

Grafos jerárquicos con puertos para conexiones cross-módulo:

- **Layer 0 (Meta):** Un nodo por módulo, edges = dependencias entre módulos
- **Layer 1 (Module):** Un nodo por tipo/función, edges = calls/imports/inherits
- **Ports:** Conexiones explícitas entre grafos (módulo A → módulo B)

Los grafos se emiten como YAML (`out/*/graphs/`) y DOT (`out/*/*.dot`).

## Opcodes (16 tipos)

```
Call      — llamada a función
Ret       — return
Try       — try/except/finally
BrTrue    — if/elif/else branch
Loop      — for/while
With      — context manager (with)
Raise     — throw/raise
New       — constructor call (PascalCase)
Store     — assignment
Load      — variable read
FieldAccess — attribute access
Yield     — generator yield
Await     — async await
Assert    — assertion
Br        — unconditional branch
Label     — label marker
```

## Benchmarks actuales

| Repo | Lenguaje | Archivos | LOC | Módulos | Descriptores | Prompt tokens | Wall time |
|------|----------|----------|-----|---------|-------------|---------------|-----------|
| Cline | TypeScript | 567 | 96,617 | 16 | 697 YAML | 43,934 | 9.85s |
| Codex | TypeScript* | 443 | 7,390 | 3 | 468 YAML | 23,264 | 8.70s |
| Agno | Python | ~200 | ~30,000 | 15+ | ~400 YAML | ~25,000 | ~8s |

*Codex es mayormente Rust — solo se analizó la parte TypeScript.

## Limitaciones actuales

1. **Solo Python y TypeScript** — no soporta Rust, Go, Java, etc.
2. **Opcodes solo para Python** — TypeScript no tiene extracción de opcodes aún
3. **Budget de tokens es estimación** — usa chars/4, no un tokenizer real
4. **Sin ChangeSet propagation** — no detecta impacto de cambios entre módulos
5. **Sin TUI Browser** — no hay interfaz interactiva para navegar grafos
