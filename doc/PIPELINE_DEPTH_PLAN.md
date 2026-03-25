# Pipeline Depth — Plan para generar implementaciones reales sin referencia

**Problema**: AVA genera buena arquitectura (modulos, interfaces, DI) pero
implementacion shallow (stubs, break sin logica) cuando no hay referencia.

**Causa raiz**: No hay un paso de razonamiento entre el goal del usuario y
la descomposicion en modulos. El pipeline asume que "2-4 tipos por modulo"
es suficiente, pero no especifica QUE debe hacer cada tipo.

---

## Diagnostico: que pasa hoy

```
User: "Build CHIP-8 emulator"
                │
                ▼
ProjectAdvisor.estimate()
  → category="unknown", mode="free", conf=0%
  → No aporta nada. Cae a _from_llm()
                │
                ▼
_from_llm() prompt:
  "You are a software architect. Decompose into modules.
   Each module: 2-4 types. STRICT LIMIT."
                │
                ▼
LLM responde: 5 modulos × {Interface, Class}
  → CPU: [ICPU, CPU] — sin saber que necesita 35 opcodes
  → Memory: [IMemory, Memory] — sin saber que necesita fontset
                │
                ▼
BlueprintTranslator genera blueprint:
  "CPU: 8 methods" — sin listar los opcodes
                │
                ▼
LLM implementa CPU con 8 methods genericos → stubs
```

**Puntos de fallo**:
1. ProjectAdvisor no reconoce "CHIP-8" como dominio conocido
2. _from_llm() no pide specs funcionales, solo estructura
3. Blueprint solo pide N methods, no dice CUALES
4. Translate tiene max ~6000 tokens output → no cabe un CPU completo
5. No hay validacion funcional, solo tsc --noEmit

---

## Solucion: GoalReasoning + FunctionalSpec

Nuevo paso antes del decompose: el sistema PIENSA sobre que implica
el goal y genera especificaciones funcionales concretas.

### Paso 1: GoalReasoning (1 LLM call, ~1500 tokens)

```python
class GoalReasoner:
    """Analyze a goal and produce functional specifications.

    Not a prompt enricher — a reasoning step that extracts
    WHAT the system must do before deciding HOW to build it.
    """

    def reason(self, goal: str) -> FunctionalSpec:
        prompt = """
        Analyze this software project goal and extract:

        1. DOMAIN KNOWLEDGE: What is this system? What are the core
           concepts, operations, data structures?

        2. FUNCTIONAL REQUIREMENTS: What must this system DO?
           List every concrete operation, not vague categories.
           Example: "execute 35 specific opcodes" not "process instructions"

        3. DATA STRUCTURES: What specific data does it manage?
           Sizes, formats, constraints.
           Example: "16 8-bit registers V0-VF" not "registers"

        4. ACCEPTANCE CRITERIA: How do we know it works?
           What should a user be able to DO with it?
           Example: "load and run a .ch8 ROM file"

        5. COMPLEXITY ESTIMATE: Is each component simple (50 LOC),
           medium (150 LOC), or complex (300+ LOC)?

        Goal: {goal}
        """
```

Output: `FunctionalSpec` — no codigo, no modulos, solo QUE debe hacer el sistema.

### Paso 2: SpecDecompose (reemplaza _from_llm)

Usa el FunctionalSpec para generar modulos con blueprints DETALLADOS:

```python
def _from_spec(self, goal, target, spec: FunctionalSpec):
    prompt = """
    Given these FUNCTIONAL SPECIFICATIONS, design the module architecture.

    CRITICAL: For each type, list EVERY method with its SPECIFIC purpose.
    Do NOT use generic method names. Each method must map to a concrete
    functional requirement from the spec.

    Specs: {spec.requirements}
    Data structures: {spec.data_structures}

    For the CPU module: list EACH opcode as a case in execute().
    For Memory: specify fontset loading, ROM loading, bounds checking.
    For Display: specify pixel-level XOR drawing with collision.
    """
```

### Paso 3: TypeBudget adaptativo

El blueprint dice "CPU: complex, 300+ LOC". El translator adapta:
- Simple types (interface, config): 1 LLM call, ~100 LOC
- Medium types (service, store): 1 call, ~150 LOC
- Complex types (CPU, decoder): **2+ calls** acumulativos o max_tokens alto

```python
# En BlueprintTranslator
if type_bp.estimated_complexity == "complex":
    max_tokens = 8000  # vs 4000 default
    # O: generar en 2 pasos (core + details)
```

### Paso 4: FunctionalValidation

Despues de generar, verificar contra el spec:

```python
# No es tsc --noEmit. Es "does it DO what it should?"
validator = FunctionalValidator(spec)
result = validator.validate(generated_code)
# → "CPU.execute(): 35 opcodes required, 3 found"
# → "Memory.loadFontset(): required, not implemented (empty body)"
# → "Display.drawSprite(): required, found (XOR logic present)"
```

Si falla → re-generate el tipo con el feedback.

---

## Donde encaja en el pipeline actual

```
ANTES:
  goal → ProjectAdvisor → _from_llm() → translate → fix → done

DESPUES:
  goal → GoalReasoner → FunctionalSpec
           │
           ▼
         ProjectAdvisor (usa spec para estimar scope)
           │
           ▼
         _from_spec() (decompose informado por requisitos)
           │
           ▼
         translate (con type budget adaptativo)
           │
           ▼
         fix (tsc) → FunctionalValidator → re-generate si falta logica
           │
           ▼
         done
```

### Componentes nuevos:
- `goal_reasoner.py` — GoalReasoner + FunctionalSpec
- Modificar `task_decomposer.py` — nuevo path _from_spec()
- Modificar `translator.py` — type budget adaptativo
- `functional_validator.py` — validacion contra spec

### Componentes modificados:
- `branch_pipeline.py` — integrar reasoning + validation
- `cli.py` — mostrar spec al usuario antes de generar

---

## Ejemplo concreto: CHIP-8

### GoalReasoner output:
```
FunctionalSpec:
  domain: "emulator"

  requirements:
    - "CPU executes 35 opcodes: 00E0, 00EE, 1NNN, 2NNN, 3XNN, 4XNN,
       5XY0, 6XNN, 7XNN, 8XY0-8XYE (9 arithmetic/logic), 9XY0, ANNN,
       BNNN, CXNN, DXYN, EX9E, EXA1, FX07, FX0A, FX15, FX18, FX1E,
       FX29, FX33, FX55, FX65"
    - "Each opcode manipulates specific registers and memory"
    - "Fetch-decode-execute cycle reads 2-byte big-endian opcodes"
    - "Display 64x32 monochrome with XOR sprite drawing"
    - "16-key hex keypad with press/release state"
    - "Delay timer and sound timer decrement at 60Hz"

  data_structures:
    - "16 general registers V0-VF (8-bit each)"
    - "Index register I (16-bit)"
    - "Program counter PC (16-bit, starts at 0x200)"
    - "Stack pointer SP + 16-level stack"
    - "4096 bytes RAM"
    - "80-byte fontset at address 0x050"
    - "64x32 pixel framebuffer"

  acceptance_criteria:
    - "Can load a .ch8 ROM into memory at 0x200"
    - "Can execute opcodes and update registers correctly"
    - "Sprites draw with XOR and set VF on collision"

  complexity:
    cpu: "complex (300+ LOC) — 35 opcodes with real logic"
    memory: "medium (100 LOC) — bounds checking + fontset"
    display: "medium (100 LOC) — XOR sprite drawing"
    keyboard: "simple (60 LOC) — state tracking"
    emulator: "simple (80 LOC) — orchestration"
```

### _from_spec() output:
```
ModuleTask(cpu):
  types: [ICPU, CPU]
  estimated_complexity: "complex"
  target_loc: 300
  method_spec:  # THIS IS THE KEY DIFFERENCE
    - "execute(opcode): switch on 0xF000, then sub-switch for 0x8000, 0xE000, 0xF000"
    - "Must implement: 00E0 clear display, 00EE return from subroutine..."
    - "8XY0: LD Vx,Vy | 8XY1: OR | 8XY2: AND | 8XY3: XOR | 8XY4: ADD..."
```

---

## Orden de implementacion

1. `goal_reasoner.py` — GoalReasoner + FunctionalSpec (2-3h)
2. `_from_spec()` en task_decomposer.py (2h)
3. Type budget adaptativo en translator.py (1h)
4. `functional_validator.py` — validacion post-generacion (3h)
5. Wiring en branch_pipeline.py + cli.py (1h)

Total: ~10h, 4 archivos nuevos, 3 modificados.

La regla: GoalReasoner cuesta 1 LLM call (~1500 tokens). Eso es el 1.5%
del budget total de un chip8 (100K tokens). El ROI es enorme: la diferencia
entre stubs y implementacion real.
