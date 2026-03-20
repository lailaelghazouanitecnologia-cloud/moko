# Rokotoco — Code Intelligence Compiler

Rokotoco analiza repositorios de código fuente y genera descriptores YAML estructurados
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
│  rokotoco-core (Rust+tree-sitter)│
│  Parse AST → Semantic Model     │
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
rokotoco/
├── README.md                        ← este archivo
├── projects.json                    ← registro de proyectos analizados
├── doc/                             ← documentación adicional
│   └── ANALISIS_AGNO.md
│
├── crates/
│   └── rokotoco-core/               ← engine Rust (tree-sitter)
│       ├── Cargo.toml
│       └── src/
│           ├── main.rs              ← CLI + workspace builder
│           ├── model.rs             ← data model (Workspace, Module, File, Type, Func)
│           ├── parse.rs             ← Python parser (tree-sitter)
│           ├── parse_ts.rs          ← TypeScript parser (tree-sitter)
│           ├── graph.rs             ← MicroGraphs con Ports
│           ├── opcodes.rs           ← 16 opcodes (Call, Store, BrTrue, Loop, Try...)
│           ├── olevel.rs            ← O-levels O0→O3 (compresión semántica)
│           ├── emit.rs              ← emisión YAML
│           └── dot.rs               ← export Graphviz DOT
│
├── cli/
│   └── ava                          ← CLI de gestión de proyectos (Python)
│
├── analysis/
│   ├── analyze.py                   ← análisis LLM de descriptores
│   └── synth.py                     ← síntesis cross-project
│
├── references/                      ← repos clonados para análisis
└── out/                             ← resultados generados (gitignored)
```

## Uso

### Con ava (recomendado)

```bash
# Registrar y analizar un proyecto
cli/ava add my-project /path/to/repo
cli/ava analyze my-project --mode arch

# Fetch repos por URL
cli/ava fetch https://github.com/org/repo

# Listar proyectos registrados
cli/ava list

# Comparar proyectos
cli/ava synth --all --llm
```

### Directo con Rust + Python

```bash
# Compilar el engine
cargo build --release --manifest-path crates/rokotoco-core/Cargo.toml

# Analizar un repo
cargo run --release --manifest-path crates/rokotoco-core/Cargo.toml -- \
  -i /path/to/repo \
  -o out/my-project \
  -n my-project \
  --graph --dot --olevel 2

# Análisis LLM
export GROQ_API_KEY=gsk_...
python analysis/analyze.py out/my-project --mode arch
```

## Opciones del CLI (rokotoco-core)

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

## Limitaciones actuales

1. **Solo Python y TypeScript** — no soporta Rust, Go, Java, etc.
2. **Opcodes solo para Python** — TypeScript no tiene extracción de opcodes aún
3. **Budget de tokens es estimación** — usa chars/4, no un tokenizer real
4. **Sin ChangeSet propagation** — no detecta impacto de cambios entre módulos
5. **Sin TUI Browser** — no hay interfaz interactiva para navegar grafos
