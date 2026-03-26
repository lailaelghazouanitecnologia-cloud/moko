# AVA — Code Intelligence Compiler

## Reporte Completo del Sistema

**Fecha**: 2026-03-24
**Codebase**: 94 archivos Python, 17,531 LOC
**Ubicacion**: `src/agent/`

---

## 1. Que es AVA

AVA es un compilador de codigo que toma una **descripcion en lenguaje natural** y genera un **proyecto completo en TypeScript** (o cualquier lenguaje). No genera un archivo — genera docenas de archivos organizados en modulos, con tipos, clases, interfaces, enums, barrel exports, y dependencias cruzadas.

```
ava dev "Build x86 VM emulator with CPU, ALU, decoder, memory, I/O" -t x86vm --max-iterations 30
```

**Resultado**: 25 archivos TypeScript, 2,754 LOC, 5 modulos, 20 tipos, 93 segundos.

---

## 2. Arquitectura del Sistema

```
src/agent/                         # 17,531 LOC total
├── core/                          # Infraestructura compartida
│   ├── models.py          (710)   # Plan, Block, Blueprint, TypeBlueprint
│   ├── guardrails.py      (312)   # RunGuard, limites de tiempo/tokens/bloques
│   ├── branch.py          (360)   # Gestion de ramas git
│   ├── llm/
│   │   ├── providers.py   (276)   # LLMProvider: Groq, Anthropic, OpenAI
│   │   └── caller.py             # LLM call abstraction
│   └── config.py                  # Paths, env vars
│
├── dev/                           # Pipeline de desarrollo (CORE)
│   ├── supervisor.py     (1777)   # Orquestador principal — run(), execute_block()
│   ├── translator.py      (819)   # Blueprint → codigo via LLM
│   ├── cli.py             (312)   # Entry point: ava dev
│   ├── density.py                 # Analisis de calidad post-generacion
│   ├── manager.py         (352)   # Multi-branch coordinator
│   └── discussion*.py             # Sistema de debate multi-stance
│
├── engines/                       # Subsistemas especializados
│   ├── tool/
│   │   ├── graph.py       (347)   # ProjectGraph: mapa de archivos/exports
│   │   ├── import_resolver.py     # Corrige imports post-generacion
│   │   ├── scanner.py            # Parsea .ts → exports/imports
│   │   └── validator.py          # Valida imports, enums, density
│   ├── blueprint/
│   │   ├── composer.py    (449)   # Multi-source blueprint merge
│   │   ├── extractor.py  (578)   # Source code → type extraction
│   │   └── project.py    (338)   # ProjectBlueprint generation
│   ├── embedding/                 # SemanticStore (TF-IDF search)
│   ├── memory/                    # CodeBlockStore (method-level memory)
│   └── prompt/                    # Template registry
│
├── duel/                          # Comparacion A/B entre implementaciones
│   ├── runner.py          (623)   # DuelRunner (type-level)
│   ├── project.py         (683)   # ProjectDuel (project-level)
│   └── features.py        (581)   # FeatureAnalyzer
│
├── xvm/                           # Micro VM de ejecucion
├── actors/                        # Workers con asyncio queues (WIP)
├── agents/                        # Agentes especializados (architect, security, etc.)
├── tools/                         # Emission index, compaction, density
└── pipeline/                      # Compressor, actions
```

---

## 3. Flujo de Ejecucion Completo

### 3.1 Entrada

```bash
ava dev "Build x86 VM emulator" -t x86vm --max-iterations 30 -v
```

### 3.2 Inicializacion (5s)

```
CLI (ava) → cmd_dev(args) → DevSupervisor(config)
                                  │
                                  ├── LLMProvider("groq", model="kimi-k2")
                                  ├── EmissionIndex.build(references)
                                  │     └── Escanea descriptores Roska → inverted index
                                  │         method_index: "getAX" → [(x86_regs.yaml, RegisterBank)]
                                  │         type_index: "ALU" → [(x86_cpu.yaml, ALU)]
                                  ├── SemanticStore.load() → TF-IDF de 154 entries
                                  ├── CodeBlockStore.load() → 146 bloques de memoria
                                  └── BlueprintComposer + SourceExtractor
```

### 3.3 Planificacion (~3s, 1 LLM call)

```
create_plan(goal, target, references)
    │
    ├── Si hay ProjectBlueprint → _create_layered_plan()
    │     Para cada layer ordenada por dependencias:
    │       Block ANALYZE: "Generate blueprint for {module}"
    │       Block IMPLEMENT × N: "Translate {Type} from {module}"
    │       Block IMPLEMENT: "Generate {module} index exports"
    │     Block TEST: "Verify all modules"
    │
    └── Si no → _create_llm_plan()
          LLM genera: modulos, tipos por modulo, orden de ejecucion
          Reglas: 3-6 modulos, 2-6 tipos cada uno, NUNCA un solo "Main"

Resultado: Plan con 31 blocks (5 modulos × ~6 blocks + 1 test)
```

### 3.4 Ejecucion Block-by-Block

Cada bloque es **autocontenido**: lee de disco, hace 1 LLM call, escribe a disco, descarta contexto.

```
while plan.next_pending and iteration < max_iterations:
    │
    ├── _collect_parallel_batch(plan)
    │     Topo-sort tipos del modulo
    │     Fase 0: tipos sin dependencias → paralelo (hasta 4 threads)
    │     Fase 1: tipos que dependen de Fase 0 → secuencial
    │
    ├── ANALYZE block ────────────────────────────────────────
    │     1. Cargar descriptores Roska de referencia
    │     2. Contexto de layers anteriores (compact YAML)
    │     3. LLM call → YAML blueprint (8192 tokens max)
    │     4. _parse_yaml_tolerant() → recupera YAML truncado
    │     5. generate_contracts() → reglas inter-tipo
    │     6. topo_sort_types() → orden de dependencias
    │     7. Guardar: blueprints/{module}.bp.yaml
    │
    ├── IMPLEMENT block ──────────────────────────────────────
    │     1. Cargar blueprint de disco (fresco, sin cache)
    │     2. Emission match: encontrar descriptores relevantes
    │     3. Construir prompt:
    │        ┌─────────────────────────────────────┐
    │        │ ## Blueprint to translate            │
    │        │ {type YAML: name, methods, fields}   │
    │        │                                       │
    │        │ ## Import map (EXACT paths)           │
    │        │ Same module: import { X } from './x'  │
    │        │ From registers: import { Y } from '..'│
    │        │                                       │
    │        │ ## Sibling types                      │
    │        │ {other types in same module as YAML}  │
    │        │                                       │
    │        │ ## Contracts (MUST follow)             │
    │        │ "ALU must accept FlagsRegister"        │
    │        │                                       │
    │        │ ## Reference descriptors              │
    │        │ {matched Roska descriptors}            │
    │        └─────────────────────────────────────┘
    │     4. LLM call → TypeScript code (6000 tokens max)
    │     5. Strip fences, write to src/{module}/{kebab}.ts
    │     6. DensityAnalyzer: methods_implemented / methods_in_blueprint
    │     7. ImportResolver: corregir phantom imports
    │
    ├── TEST block ───────────────────────────────────────────
    │     1. Generar src/index.ts, tsconfig.json, package.json
    │     2. npx tsc --noEmit
    │     3. Density report por modulo
    │
    └── Error handling ───────────────────────────────────────
          - GuardrailTripped → FATAL (tiempo, tokens, bloques)
          - Otro error → mark block FAILED, continue pipeline
          - ANALYZE failed → cascade-fail implement blocks del modulo
```

---

## 4. Estructuras de Datos Clave

### Plan
```python
class Plan:
    goal: str                    # "Build x86 VM emulator..."
    target_project: str          # "x86vm"
    blocks: list[Block]          # 31 blocks ordenados
    plan_id: str                 # "1f12ccc3aac5"

    @property
    def next_pending -> Block    # Siguiente bloque PENDING
    def chain_valid -> bool      # Hash chain integra?
```

### Block
```python
class Block:
    index: int                   # 0, 1, 2...
    block_type: BlockType        # ANALYZE | IMPLEMENT | TEST
    objective: str               # "Translate ALU from cpu_core"
    status: BlockStatus          # PENDING | IN_PROGRESS | COMPLETED | FAILED
    prev_hash: str               # Link al bloque anterior
    hash: str                    # SHA256(index + type + objective + prev_hash + ...)
    tokens_used: int             # Tokens LLM consumidos
    output: str                  # Resultado textual
    files_changed: list[str]     # ["src/cpu_core/alu.ts"]
    meta: dict                   # {"module": "cpu_core", "type": "ALU", "blueprint": "..."}
```

### ModuleBlueprint
```python
class ModuleBlueprint:
    name: str                    # "cpu_core"
    language: str                # "typescript"
    target_dir: str              # "src/cpu_core"
    types: list[TypeBlueprint]   # [RegisterBank, ALU, FlagsRegister]
    constraints: list[str]       # ["ALU must accept FlagsRegister as dependency"]
```

### TypeBlueprint
```python
class TypeBlueprint:
    name: str                    # "ALU"
    kind: str                    # "class" | "interface" | "enum"
    target_file: str             # "src/cpu_core/alu.ts"
    methods: list[MethodSpec]    # [{name: "add", sig: "(a: number, b: number): number", hint: "..."}]
    fields: list[FieldSpec]      # [{name: "flags", type: "FlagsRegister"}]
    status: str                  # "pending" | "translated" | "verified"
```

---

## 5. Subsistemas

### 5.1 Emission Index
Mapa invertido de descriptores Roska. Dado un tipo a generar, encuentra los mejores descriptores de referencia:
- **type match**: 3 puntos
- **method match**: 2 puntos cada uno
- **field match**: 1 punto
- Top-5 resultados por tipo

### 5.2 Density Analyzer
Mide calidad post-generacion sin LLM (regex puro):
```
density = (method_compliance × 0.4) + (ref_coverage × 0.4) + (import_score × 0.2)
```
- `method_compliance`: metodos del blueprint que aparecen en el codigo
- `ref_coverage`: metodos de referencia usados
- `import_score`: imports esperados vs reales

### 5.3 ProjectGraph + ImportResolver
Escanea el proyecto generado y corrige imports phantom:
```
graph.scan("projects/x86vm") → {files, symbols, modules}
resolver.resolve("../registers", from="src/cpu_core/alu.ts") → ResolveResult
validator.validate(code, graph) → [errors]
```

### 5.4 Discussion System
Multi-stance debate para bloques ANALYZE:
- **ADVOCATE**: busca fortalezas, patrones utiles
- **CRITIC**: busca debilidades, over-engineering
- **PRAGMATIST**: evalua esfuerzo vs valor
- Consenso por voto mayoritario

### 5.5 Hash Chain
Cada bloque completado tiene hash = SHA256(index + tipo + objetivo + prev_hash + output_len). Forma una cadena verificable — si alguien modifica un bloque intermedio, la cadena se rompe.

---

## 6. Guardrails

```python
class RunLimits:
    max_time_s: int = 600        # 10 minutos maximo
    max_tokens: int = 500_000    # Medio millon de tokens
    max_blocks: int = 200        # 200 bloques maximo
    max_stale: int = 5           # 5 bloques sin progreso → abort
```

Si cualquier limite se excede → `GuardrailTripped` → pipeline se detiene inmediatamente.

---

## 7. Resultado del Test x86vm

### Metricas

| Metrica | Valor |
|---------|-------|
| Modulos generados | 5 (cpu_core, instruction_decode, memory, io_system, vm_runtime) |
| Archivos .ts | 25 (20 tipos + 5 index) |
| LOC total | 2,754 |
| Density promedio | 79% |
| Bloques completados | 30/31 |
| Tiempo total | 93.3s |
| Tokens LLM | 86,852 |
| Blueprint failures | 0 |

### Calidad del Codigo Generado

**Implementacion real, no stubs**:
- `ExecutionEngine` (301 LOC): switch dispatch por tipo de instruccion, resolucion de operandos
- `InstructionDecoder` (287 LOC): parsing de prefijos, ModRM, SIB con logica x86 real
- `DMAC` (245 LOC): controlador DMA con 4 canales, flip-flop registers
- `InterruptController` (214 LOC): emulacion PIC 8259 con master/slave
- `MemoryManager` (195 LOC): memoria virtual con paginacion y proteccion

### Problemas Detectados

| Categoria | Cantidad | Impacto |
|-----------|----------|---------|
| Errores de sintaxis | 2 | `addressSize = ,` en decoder, `0}` en exception-handler |
| Export keywords faltantes | ~14 clases | Clases sin `export` keyword |
| Barrel exports incompletos | 5 index.ts | Faltan tipos en re-exports |
| Cross-module imports | 0 | Modulos aislados (no se referencian entre si) |
| Tipos indefinidos | 3-4 | `DecuredInstruction` (typo), interfaces faltantes |
| Typos en codigo | 1 | `twoByteOpcocs` → `twoByteOpcodes` |

---

## 8. Problemas Principales del Pipeline Actual

### 8.1 God Object: supervisor.py (1,777 LOC)
Contiene planificacion, ejecucion, abstraccion, discusion, finalizacion — todo en una clase.

### 8.2 Codigo Generado "Ciego"
El LLM genera codigo sin saber que archivos existen en disco. Resultado:
- Phantom imports (`import { X } from '../module'` cuando X no existe)
- Enums fantasma (referencia enums que nunca se definieron)
- Tipos inventados (`DecuredInstruction` en vez de `DecodedInstruction`)

### 8.3 Barrel Exports Incompletos
El generador de `index.ts` solo exporta tipos marcados como "translated" en el blueprint, pero no todos los tipos se marcan correctamente.

### 8.4 Sin Validacion TSC
El bloque TEST que ejecutaria `tsc --noEmit` es el ultimo y frecuentemente no se alcanza por el limite de iteraciones.

### 8.5 200 LOC por Tipo = Insuficiente
Una clase como `InstructionDecoder` deberia tener 500-1000 LOC para ser completa. El pipeline genera ~140 LOC promedio por tipo.

---

## 9. Vision: Pipeline de Tareas Largas

### El Problema
Hoy el pipeline genera **un proyecto de golpe** — 30 bloques en serie, sin ramas, sin iteracion. El resultado es codigo que compila a medias y no tiene tests.

### Lo que Necesitamos

Un sistema que tome una **tarea grande** y la divida en **subtareas concretas**, cada una en su **propia rama git**, con **iteracion real** hasta que funcione:

```
TAREA: "Build x86 VM emulator with full instruction set"
    │
    ├── RAMA: feature/memory-subsystem
    │     Pipeline: analyze → implement → test → fix → test → MERGE
    │     Resultado: memory/ (800+ LOC, tsc clean, tests passing)
    │
    ├── RAMA: feature/cpu-registers
    │     Pipeline: analyze → implement → test → fix → test → MERGE
    │     Resultado: registers/ (600+ LOC, tsc clean, tests passing)
    │
    ├── RAMA: feature/instruction-decoder (depends on: registers, memory)
    │     Pipeline: analyze → implement → test → fix → test → MERGE
    │     Resultado: decoder/ (1200+ LOC, tsc clean, tests passing)
    │
    ├── RAMA: feature/alu (depends on: registers)
    │     Pipeline: analyze → implement → test → fix → test → MERGE
    │
    └── RAMA: feature/execution-engine (depends on: ALL)
          Pipeline: analyze → implement → test → fix → test → MERGE
          Resultado: vm_runtime/ (1500+ LOC, integration tests passing)
```

### Principios del Nuevo Pipeline

1. **Una rama = un modulo robusto** (no 200 LOC, sino 800+)
2. **Iteracion dentro de la rama**: generar → compilar → fix errors → compilar → hasta tsc clean
3. **Tests por modulo**: cada rama tiene tests unitarios que pasan antes de merge
4. **Dependencias explicitas**: `decoder` no empieza hasta que `registers` y `memory` estan merged
5. **Merge incremental**: cada modulo se integra al main cuando esta listo
6. **Contexto real**: cuando generas `decoder`, tienes los `.d.ts` reales de `registers` y `memory`

### Diferencia con el Pipeline Actual

| Aspecto | Hoy | Propuesto |
|---------|-----|-----------|
| Granularidad | 1 bloque = 1 tipo (~140 LOC) | 1 rama = 1 modulo (~800+ LOC) |
| Iteracion | 0 (genera una vez, sigue) | N (genera, compila, corrige, repite) |
| Validacion | Opcional (bloque TEST al final) | Obligatoria (tsc + tests por rama) |
| Contexto | Ciego (no ve disco) | Real (lee archivos generados) |
| Git | Sin ramas | 1 rama por modulo |
| Merge | No aplica | Merge cuando tsc clean + tests pass |
| LOC por modulo | ~200-500 | ~800-1500 |
| Calidad | 79% density, errores de sintaxis | 95%+ density, tsc clean |

---

## 10. Archivos Clave para Entender el Sistema

| Archivo | LOC | Que Hace |
|---------|-----|----------|
| `dev/supervisor.py` | 1,777 | **Cerebro**: planifica, ejecuta, abstrae, reporta |
| `dev/translator.py` | 819 | **Manos**: blueprint → YAML → LLM → TypeScript |
| `core/models.py` | 710 | **Esqueleto**: Plan, Block, Blueprint, TypeBlueprint |
| `duel/project.py` | 683 | **Comparador**: A/B testing de implementaciones |
| `duel/runner.py` | 623 | **Duelos**: compara tipo a tipo |
| `engines/blueprint/extractor.py` | 578 | **Analizador**: source code → types |
| `duel/features.py` | 581 | **Features**: analisis de features |
| `engines/blueprint/composer.py` | 449 | **Compositor**: merge multi-source blueprints |
| `tools/compaction.py` | 463 | **Compactador**: reduce context para LLM |
| `engines/tool/graph.py` | 347 | **Mapa**: ProjectGraph del proyecto generado |
| `core/guardrails.py` | 312 | **Limites**: tiempo, tokens, bloques |
| `core/llm/providers.py` | 276 | **LLM**: Groq, Anthropic, OpenAI |

---

## 11. Como Ejecutar

```bash
# Prerequisitos
export GROQ_API_KEY=gsk_...

# Generar proyecto completo
python ava dev "Build x86 VM emulator" -t x86vm --max-iterations 30 -v

# Duel entre dos implementaciones
python ava duel projectA projectB

# Agregar proyecto de referencia
python ava add dosbox /path/to/dosbox
python ava refresh dosbox
```

---

## 12. Resumen

AVA es un sistema funcional que genera proyectos TypeScript completos desde lenguaje natural. El pipeline actual produce codigo **real** (no stubs) pero con calidad insuficiente para produccion: errores de sintaxis, imports rotos, exports incompletos.

El siguiente paso es construir un **pipeline de ramas** donde cada modulo se desarrolla iterativamente en su propia rama git, con validacion `tsc` obligatoria y merge solo cuando el modulo esta limpio. Esto transformaria el output de "prototipo con errores" a "codigo compilable y testeable".
