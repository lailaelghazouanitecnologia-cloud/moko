# Propuesta: ava dev v2 — Arquitectura Robusta

## Problema

El pipeline actual es **frágil** porque el LLM opera a ciegas:

```
AHORA:  Blueprint YAML → LLM (sin ver disco) → código → descubrir errores después
```

El LLM inventa imports (`../types`), enums con valores que no existen, y tipos fantasma.
La validación post-generación **detecta** pero no **previene ni corrige**.

---

## Visión v2

```
v2:  Blueprint → ProjectGraph (verdad real) → LLM (ve todo) → código → validar → retry si falla
```

Un **ProjectGraph** es la fuente de verdad: qué archivos existen, qué exportan,
qué tipos están disponibles, qué imports son válidos. El LLM NUNCA opera sin este contexto.

---

## Arquitectura

```
                    ┌─────────────────────────────────────┐
                    │          DevSupervisor               │
                    │  (orquestador — no cambia mucho)     │
                    └──────────┬──────────────────────────┘
                               │
                    ┌──────────▼──────────────────────────┐
                    │         ToolBelt                     │
                    │  (nuevo — todas las herramientas)    │
                    │                                      │
                    │  ┌─────────┐  ┌──────────────┐      │
                    │  │ Manifest│  │ TypeRegistry  │      │
                    │  │ (disco) │  │ (exports)     │      │
                    │  └────┬────┘  └──────┬───────┘      │
                    │       │              │               │
                    │  ┌────▼──────────────▼───────┐      │
                    │  │     ProjectGraph           │      │
                    │  │  (fuente de verdad única)  │      │
                    │  └────┬──────────────────────┘      │
                    │       │                              │
                    │  ┌────▼────┐  ┌──────────────┐      │
                    │  │ImportRes│  │  Validator    │      │
                    │  │(resolver)│  │  (post-gen)  │      │
                    │  └─────────┘  └──────────────┘      │
                    │                                      │
                    │  ┌─────────┐  ┌──────────────┐      │
                    │  │SharedGen│  │  RetryEngine  │      │
                    │  │(types.ts)│  │ (re-translate)│      │
                    │  └─────────┘  └──────────────┘      │
                    └──────────┬──────────────────────────┘
                               │
                    ┌──────────▼──────────────────────────┐
                    │       BlueprintTranslator            │
                    │  (recibe ProjectGraph como contexto) │
                    └─────────────────────────────────────┘
```

---

## Componentes Nuevos

### 1. `ProjectGraph` — Fuente de verdad única

```python
@dataclass
class ExportedSymbol:
    name: str               # "FlagsRegister"
    kind: str               # "class" | "enum" | "interface" | "type" | "function" | "const"
    file_path: str          # "src/registers/flags-register.ts"
    module: str             # "registers"
    members: list[str]      # ["getCF", "setCF", "getZF", ...] — métodos públicos
    enum_values: list[str]  # ["VALID", "ZERO", "SPECIAL", "EMPTY"] — solo para enums
    fields: list[str]       # ["value: number"] — campos públicos
    signature: str          # "export class FlagsRegister { ... }" — declaración

@dataclass
class ProjectGraph:
    """Mapa completo del proyecto: archivos, exports, imports, dependencias."""

    # Estado real del disco
    files: dict[str, FileNode]          # path → FileNode
    symbols: dict[str, ExportedSymbol]  # "FlagsRegister" → ExportedSymbol
    modules: dict[str, ModuleNode]      # "registers" → ModuleNode

    # Grafo de dependencias
    depends_on: dict[str, set[str]]     # "CpuCore" → {"GpRegisters", "FlagsRegister", ...}
    depended_by: dict[str, set[str]]    # "FlagsRegister" → {"CpuCore", "ExecutionEngine"}

    # Métodos core
    def scan(self, project_dir: Path) -> None:
        """Escanear disco y reconstruir grafo completo."""

    def resolve_import(self, from_file: str, import_path: str) -> ResolveResult:
        """¿Este import es válido? ¿A qué archivo resuelve? ¿Qué exporta?"""

    def get_available_types(self, from_module: str) -> list[ExportedSymbol]:
        """¿Qué tipos puede importar este módulo?"""

    def get_module_exports(self, module_name: str) -> list[ExportedSymbol]:
        """¿Qué exporta este módulo por su barrel (index.ts)?"""

    def find_orphans(self) -> list[str]:
        """Tipos definidos pero nunca importados."""

    def find_phantoms(self, code: str, module: str) -> list[str]:
        """Imports en este código que no resuelven a nada real."""

    def to_prompt_context(self, for_type: str, budget: int = 3000) -> str:
        """Generar contexto para el LLM: qué existe, qué puede importar."""

@dataclass
class FileNode:
    path: str               # "src/registers/flags-register.ts"
    module: str             # "registers"
    exports: list[str]      # ["FlagsRegister", "FlagsChangeCallback"]
    imports: list[ImportRef] # [{name: "GpRegisters", from: "./gp-registers"}]
    loc: int                # líneas de código
    last_modified: float    # timestamp

@dataclass
class ModuleNode:
    name: str               # "registers"
    dir_path: str           # "src/registers"
    files: list[str]        # ["flags-register.ts", "gp-registers.ts", ...]
    barrel_exports: list[str]  # lo que exporta index.ts
    blueprint_path: str     # "blueprints/registers.bp.yaml"
    status: str             # "pending" | "partial" | "complete"

@dataclass
class ImportRef:
    names: list[str]        # ["FlagsRegister"]
    from_path: str          # "./flags-register"
    resolved_to: str        # "src/registers/flags-register.ts" | "" si phantom
    is_valid: bool
```

**Cuándo se actualiza:** Después de cada archivo escrito. `scan()` es barato (~50ms para 100 archivos).

---

### 2. `SharedTypeDetector` — Auto-genera tipos compartidos

```python
class SharedTypeDetector:
    """Detecta interfaces/enums/types que múltiples tipos necesitan y no existen."""

    def detect(self, graph: ProjectGraph, module_bp: ModuleBlueprint) -> list[SharedType]:
        """Analizar blueprint: ¿hay tipos referenciados por 2+ tipos que no existen?

        Ejemplo: Si InstructionDecoder, ModRmParser, y SibParser todos usan
        'CpuMode', 'DisplacementSize', 'OperandType' — y ninguno los define —
        crear un archivo types.ts con esas definiciones.
        """

    def generate(self, shared_types: list[SharedType], module_bp: ModuleBlueprint,
                 project_dir: Path) -> str:
        """Generar el archivo types.ts con todos los tipos compartidos.
        Usa el blueprint para inferir la forma de cada tipo:
        - Enums: extraer valores de las signatures donde se usan
        - Interfaces: extraer campos de los fields que los referencian
        """

@dataclass
class SharedType:
    name: str               # "CpuMode"
    inferred_kind: str      # "enum" | "interface" | "type"
    used_by: list[str]      # ["InstructionDecoder", "ModRmParser", "PrefixScanner"]
    inferred_values: list[str]  # ["MODE_16", "MODE_32", "MODE_64"]
    inferred_fields: list[FieldSpec]
```

**Cuándo se ejecuta:** Después de ANALYZE (generar blueprint), antes de IMPLEMENT.

---

### 3. `ImportResolver` — Validación + corrección pre-generación

```python
class ImportResolver:
    """Resuelve imports ANTES de escribir el archivo. Corrige o rechaza."""

    def resolve_all(self, code: str, graph: ProjectGraph, module: str) -> ResolveReport:
        """Para cada import en el código:
        1. ¿Resuelve a un archivo real? → OK
        2. ¿El tipo existe en otro módulo? → Corregir path
        3. ¿No existe en ningún lado? → Marcar como phantom
        """

    def fix_imports(self, code: str, report: ResolveReport, graph: ProjectGraph) -> str:
        """Reescribir imports incorrectos usando el ProjectGraph:
        - '../types' no existe pero FlagsRegister está en '../registers' → corregir
        - './segment-descriptor' no existe → buscar en graph, redirigir o eliminar
        """

@dataclass
class ResolveReport:
    valid: list[ImportRef]
    corrected: list[tuple[ImportRef, ImportRef]]  # (original, fixed)
    phantoms: list[ImportRef]                      # no se puede resolver
    missing_types: list[str]                       # tipos que no existen en ningún lado
```

**Cuándo se ejecuta:** Después de cada LLM call, ANTES de escribir a disco.

---

### 4. `RetryEngine` — Re-traducción inteligente

```python
class RetryEngine:
    """Re-traduce tipos que fallan validación, con contexto corregido."""

    def should_retry(self, result: TranslationResult) -> bool:
        """Retry si:
        - density < 0.70
        - phantom imports > 0 (después de fix_imports)
        - phantom enum values > 0
        - tsc errors > 3
        """

    def retry(self, type_bp, module_bp, project_dir, graph, issues) -> TranslationResult:
        """Re-traducir con contexto adicional:
        1. Inyectar los errores específicos como constraints
        2. Inyectar el ProjectGraph context (qué existe realmente)
        3. Subir temperature ligeramente (+0.1)
        4. Max 2 retries
        """
```

**Cuándo se ejecuta:** Después de validación, si hay problemas.

---

### 5. `ToolBelt` — Contenedor unificado

```python
class ToolBelt:
    """Todas las herramientas del pipeline en un solo lugar."""

    def __init__(self, project_dir: Path):
        self.project_dir = project_dir
        self.graph = ProjectGraph()
        self.shared_detector = SharedTypeDetector()
        self.import_resolver = ImportResolver()
        self.retry_engine = RetryEngine()
        self.density = DensityAnalyzer(project_dir)

    def refresh(self):
        """Actualizar ProjectGraph desde disco."""
        self.graph.scan(self.project_dir)

    def pre_translate(self, type_bp, module_bp) -> PreTranslateContext:
        """Preparar contexto ANTES de la traducción:
        1. Refresh graph
        2. Detect shared types → generate if needed
        3. Build import map from REAL exports
        4. Build available types context
        """

    def post_translate(self, code, type_bp, module_bp) -> PostTranslateResult:
        """Validar y corregir DESPUÉS de la traducción:
        1. Resolve imports → fix if possible
        2. Validate enums
        3. Check density
        4. Decide: write | retry | fail
        """
```

---

## Nuevo Flujo de Ejecución

```
ANALYZE Block:
  1. LLM genera blueprint YAML (como antes)
  2. NEW: SharedTypeDetector analiza blueprint
  3. NEW: Si hay tipos compartidos → genera types.ts automáticamente
  4. NEW: ProjectGraph.scan() actualiza estado
  5. Genera contracts + topo sort (como antes)

IMPLEMENT Block:
  1. NEW: ToolBelt.pre_translate() prepara contexto real
     - ProjectGraph dice qué archivos/exports existen
     - Import map viene de exports REALES, no del blueprint
     - Shared types ya generados → aparecen en el graph
  2. LLM traduce tipo (como antes, pero con contexto real)
  3. NEW: ToolBelt.post_translate() valida y corrige
     - ImportResolver corrige paths erróneos
     - Enum validation
     - Density check
  4. NEW: Si falla → RetryEngine re-traduce (max 2 retries)
  5. Escribe a disco
  6. NEW: ProjectGraph.scan() actualiza estado

TEST Block:
  1. ProjectGraph.find_orphans() → tipos sin usar
  2. ProjectGraph.find_phantoms() → imports rotos residuales
  3. tsc --noEmit (como antes)
  4. Density report (como antes)
  5. NEW: Coherence report — ¿todos los módulos se conectan?
```

---

## Nueva Estructura de Proyecto

```
src/agent/dev/
  ├── supervisor.py          # Orquestador (modificar para usar ToolBelt)
  ├── translator.py          # LLM calls (simplificar — graph da el contexto)
  ├── plan.py                # Plan/Block chain (sin cambios)
  ├── blueprint.py           # TypeBlueprint, ModuleBlueprint (sin cambios)
  │
  ├── tools/                 # NUEVO — directorio de herramientas
  │   ├── __init__.py
  │   ├── toolbelt.py        # ToolBelt — contenedor unificado
  │   ├── graph.py           # ProjectGraph — fuente de verdad
  │   ├── shared_types.py    # SharedTypeDetector — auto-genera types.ts
  │   ├── import_resolver.py # ImportResolver — valida y corrige imports
  │   ├── retry_engine.py    # RetryEngine — re-traducción inteligente
  │   └── scanner.py         # FileScanner — escanea .ts y extrae exports
  │
  ├── compaction.py          # Simplificar — mover validación a tools/
  ├── density.py             # Sin cambios
  ├── emission.py            # Sin cambios
  ├── vm.py                  # Sin cambios
  ├── guardrails.py          # Sin cambios
  ├── cli.py                 # Añadir: ava dev --graph, --validate
  │
  ├── manager.py             # Branches/parallel (sin cambios)
  ├── branch.py              # Branch dataclasses (sin cambios)
  └── evaluation.py          # Eval framework (sin cambios)
```

---

## Impacto Esperado

| Problema Actual | Solución v2 | Mejora Esperada |
|---|---|---|
| Phantom imports (`../types`) | ProjectGraph + ImportResolver | 95% eliminados |
| Enum values inexistentes | SharedTypeDetector genera enums | 100% eliminados |
| Tipos inventados por el LLM | Import map desde exports reales | 90% eliminados |
| density < 70% sin corrección | RetryEngine re-traduce | density > 85% garantizado |
| Index.ts con exports incompletos | ProjectGraph.barrel_exports | 100% correcto |
| No sabe qué archivos existen | ProjectGraph.scan() | Visibilidad total |
| Cross-module API invisible | graph.get_available_types() | API real inyectada |
| Tipos compartidos (interfaces) | SharedTypeDetector + auto-gen | Detectados y creados |

---

## Orden de Implementación

1. **`scanner.py`** — FileScanner que parsea .ts y extrae exports/imports (regex, sin LLM)
2. **`graph.py`** — ProjectGraph que usa FileScanner para construir el mapa
3. **`toolbelt.py`** — ToolBelt que integra graph + density (wrapper simple)
4. **`shared_types.py`** — SharedTypeDetector que analiza blueprints
5. **`import_resolver.py`** — ImportResolver que corrige imports post-generación
6. **`retry_engine.py`** — RetryEngine para re-traducción
7. **Integrar en supervisor.py** — ToolBelt.pre/post_translate en _exec_implement
8. **Integrar en translator.py** — Simplificar prompts usando graph.to_prompt_context()

Cada paso es independiente y testeable. El pipeline sigue funcionando durante la migración.

---

## Ejemplo Concreto: x86 VM con v2

```
ANALYZE "registers":
  → LLM genera blueprint: GpRegisters, FlagsRegister, FpuRegisters, SegmentRegisters
  → SharedTypeDetector detecta:
    - "RegisterIndex" usado por GpRegisters, SegmentRegisters → inferred enum (EAX=0..EDI=7)
    - "RegisterIndex8" usado por GpRegisters → inferred enum (AL=0..BH=7)
    - "SegmentDescriptor" usado por SegmentRegisters → inferred interface
    - "RegisterChangeCallback" usado por GpRegisters → inferred type alias
  → Auto-genera: src/registers/types.ts con todas las definiciones
  → ProjectGraph.scan() → types.ts aparece en el grafo

IMPLEMENT GpRegisters:
  → ToolBelt.pre_translate():
    - graph.symbols = {"RegisterIndex": ExportedSymbol(file="types.ts", kind="enum", ...)}
    - import_map incluye: "import { RegisterIndex, RegisterIndex8 } from './types'"
  → LLM genera código con imports CORRECTOS (porque ve el import map real)
  → ToolBelt.post_translate():
    - ImportResolver: "./types" resuelve a src/registers/types.ts ✓
    - Density: 95% ✓
  → Escribe a disco
  → graph.scan() → gp-registers.ts con exports ["GpRegisters"]

IMPLEMENT CpuCore (módulo core, depende de registers):
  → ToolBelt.pre_translate():
    - graph.get_available_types("core") incluye:
      - GpRegisters from "../registers" (con métodos: get, set, get8, set8...)
      - FlagsRegister from "../registers" (con métodos: getCF, setCF, getZF...)
    - Import map: "import { GpRegisters, FlagsRegister } from '../registers'"
  → LLM genera CpuCore que USA la API real de GpRegisters
  → No más "this.registers.getInstructionPointer()" inventado
```
