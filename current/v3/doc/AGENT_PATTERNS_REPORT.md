# Reporte: Patrones de Agentes de Codigo — Cline, Codex, Kilocode

**Analisis de**: 3 repos, 172K LOC total, PI generada para cada uno
**Objetivo**: Extraer patrones para mejorar AVA

---

## 1. Como maneja cada uno el prompt, la sesion, y el contexto

### Cline (159K LOC, 929 archivos)

**Prompt**: Modular por componentes. 13 secciones ensamblables:
```
agent_role → system_info → mcp → user_instructions → tool_use →
editing_files → capabilities → skills → rules → objective →
act_vs_plan → feedback → task_progress
```
Cada seccion es una funcion que recibe `context` y puede ser overrideada
por variantes de modelo (generic, next-gen, gpt-5, xs, gemini-3, glm).
Template engine con `{{PLACEHOLDER}}` resolution.

**Sesion**: Stateful con persistencia. Cada tarea tiene `TaskState`.
`MessageStateHandler` maneja transiciones. Historial guardado como
`apiMessages` (formato Anthropic). Resume desde checkpoints.

**Contexto**: Sliding window con truncacion programatica.
Cuando `totalTokens >= maxAllowedSize`:
- Mantiene primer par user-assistant (siempre)
- Trunca por mitades o cuartos
- Inyecta nota: "[NOTE] Some previous conversation history removed..."
- Guarda metadata de lo eliminado para recovery

**Tools**: 8 herramientas con variantes por modelo:
- execute_command (con requires_approval)
- read_file, write_to_file, apply_patch
- attempt_completion
- use_mcp_tool
- plan_mode_respond
- list_code_definition_names

**Regla clave**: "Wait for user response after EACH tool use"

### Codex CLI (7.2K LOC, 445 archivos)

**Prompt**: Markdown plano con secciones claras:
```
You are a coding agent running in the Codex CLI...
Capabilities → Personality → AGENTS.md spec → Responsiveness →
Planning → Sandbox and approvals
```
Personalidad definida: "concise, direct, friendly, efficient"
Antes de cada tool call → preamble breve al usuario

**Sesion**: Turn-based explicito. Cada turno tiene:
- `TurnContext` con metadata (session_id, turn_id, workspaces)
- `TurnState` mutable (pending_approvals, token_usage_at_turn_start)
- `ActiveTurn` maneja tareas en curso
- Entre turnos: estado reseta pero historial persiste via ContextManager

**Contexto**: History-based con estimacion por bytes.
- `record_items()` appendea con TruncationPolicy
- `estimate_token_count()` heuristica (bytes, no tokenizer)
- `for_prompt()` normaliza y elimina items no aptos
- `replace_history()` permite reconstruir

**Tools**: Responses API format (native):
- Shell execution
- Apply patch
- MCP tools
- Plan tool (update_plan con steps y progress)
- Multi-agent (spawn, send_input, wait, resume)
- Request permissions, user input
- Web search

**Regla clave**: "Do not repeat plan after update_plan — harness already displays it"

### Kilocode/Aide (5.9K LOC, 64 archivos)

**Prompt**: Por comando. Cada comando (enhance, convert, rename)
tiene su propio prompt builder. No hay agente persistente.

**Sesion**: InMemoryChatMessageHistory de LangChain. Mapa global
`sessionIdHistoriesMap`. Se limpia al desactivar extension.

**Contexto**: No hay manejo de overflow. Depende de defaults LangChain.

**Tools**: No es agentico. Usa `withStructuredOutput(zodSchema)`.
Cada comando es prompt → LLM → resultado. Single-pass.

---

## 2. Que le falta a AVA comparado con estos

### P1 — No hay prompt modular

AVA tiene `TRANSLATE_SYSTEM` hardcodeado en translator.py (linea 181).
Un string monolitico. No hay componentes, no hay variantes por modelo,
no hay template engine.

**Cline tiene**: 13 componentes ensamblables + 10 variantes de modelo
**Codex tiene**: Markdown con secciones + AGENTS.md convention

### P2 — No hay sesion entre generaciones

Cada `ava dev` run empieza de cero. No hay forma de:
- Resumir una generacion interrumpida con contexto
- Aprovechar el historial de la run anterior
- Mantener un "estado mental" del proyecto entre sesiones

**Cline tiene**: TaskState persistente, resume desde checkpoints
**Codex tiene**: SessionState explicita con turn boundaries

### P3 — No hay context management durante la run

El pipeline es stateless — cada bloque lee disco y descarta.
Pero dentro de un bloque, si el contexto crece (sibling types,
cross-module sigs, spec, style hints) no hay truncacion ni priorizacion.

**Cline tiene**: Token tracking + truncacion sliding window
**Codex tiene**: TurnState con token_usage_at_turn_start

### P4 — No hay plan visible al usuario

El usuario no ve que va a hacer el pipeline hasta que termina.
No hay forma de aprobar/rechazar pasos antes de ejecutar.

**Codex tiene**: update_plan tool con steps y progress visible
**Cline tiene**: plan_mode_respond para plan antes de actuar

### P5 — No hay preamble/feedback durante generacion

El pipeline imprime logs pero no hay interaccion. El usuario
no puede intervenir, redirigir, o cancelar un modulo a mitad.

**Codex tiene**: Preamble breve antes de cada accion
**Cline tiene**: Wait for user response after each tool use

### P6 — No hay AGENTS.md / project instructions

No hay forma de que el proyecto tenga reglas persistentes que
el pipeline respete automaticamente. Invariants.yaml existe pero
no se inyecta en el prompt del LLM.

**Codex tiene**: AGENTS.md convention (scoped per directory)
**Cline tiene**: .clinerules/ con archivos markdown

---

## 3. Plan de implementacion

### Prioridad 1 — Prompt modular (Semana 1)

```
AHORA:
  TRANSLATE_SYSTEM = "You are a code translator..." (string monolitico)

DESPUES:
  prompt/
    components/
      role.py          — "You are AVA, a code generator..."
      rules.py         — type safety, naming, no stubs
      style.py         — from StyleProfile
      spec.py          — from FunctionalSpec
      context.py       — imports, siblings, cross-module
      tools.py         — what the LLM can produce
    variants/
      default.py       — para kimi-k2, llama
      claude.py        — para claude (mas conciso, menos reglas)
      small.py         — para modelos 7B (reglas minimas)
    engine.py          — ensambla componentes segun modelo + contexto
```

Cada componente es una funcion que recibe `context: PromptContext`
y retorna un string. El engine ensambla en orden, respetando budgets.

### Prioridad 2 — Session persistence (Semana 1-2)

```python
# session/run_state.py

@dataclass
class RunState:
    run_id: str
    goal: str
    target: str
    started_at: float
    modules_completed: list[str]
    modules_pending: list[str]
    total_tokens: int
    functional_spec: Optional[FunctionalSpec]
    workspace_states: dict[str, WorkspaceStatus]

    def save(self, path: Path): ...
    def load(cls, path: Path) -> "RunState": ...
```

`ava dev --resume` carga el RunState y continua desde el ultimo
modulo pendiente. El FunctionalSpec, los blueprints generados,
y los archivos escritos persisten entre sesiones.

### Prioridad 3 — Context budget management (Semana 2)

```python
# pipeline/context_budget.py

class ContextBudget:
    max_tokens: int = 8000       # budget total para el prompt
    used: int = 0

    def add(self, section: str, text: str, priority: int) -> bool:
        """Add section if budget allows. Higher priority = added first."""

    def build(self) -> str:
        """Assemble prompt within budget, prioritizing important sections."""
```

Prioriza: blueprint > spec > imports > siblings > style > examples.
Si no cabe todo, trunca lo de menor prioridad primero.

### Prioridad 4 — Plan visible + user approval (Semana 2-3)

```
ava dev "Build CHIP-8 emulator" -t chip8 --plan

  [reasoner] Analyzing goal...
  [spec] 35 opcodes, 5 components, ~800 LOC

  PLAN:
    1. memory   (simple,  ~70 LOC)  — 4KB RAM + fontset
    2. display  (medium, ~100 LOC)  — 64x32 XOR sprites
    3. keypad   (simple,  ~60 LOC)  — 16 keys
    4. timers   (simple,  ~50 LOC)  — delay + sound @ 60Hz
    5. cpu      (complex, ~350 LOC) — 35 opcodes
    6. debugger (medium, ~120 LOC)  — step, breakpoint

  Proceed? [Y/n/edit]
```

Con `--plan` el usuario ve y aprueba antes de gastar tokens.

### Prioridad 5 — Project instructions (.ava/rules.md) (Semana 3)

```
proyecto/.ava/
  rules.md           — reglas del proyecto (como AGENTS.md de Codex)
  style.yaml         — preferencias de estilo (ya existe como style_rules.py)
```

El contenido de `rules.md` se inyecta en CADA prompt del LLM,
como lo hacen Cline con `.clinerules/` y Codex con `AGENTS.md`.

---

## 4. Que NO copiar

- **Cline's tool-per-file approach**: AVA genera archivos completos, no edita linea a linea. No necesita write_to_file/replace_in_file granular.
- **Codex's sandbox execution**: AVA no ejecuta el codigo generado (solo tsc --noEmit). No necesita sandbox Docker.
- **Kilocode's single-pass model**: AVA ya es multi-pass con DepthLoop. No retroceder a single-pass.
- **Cline's 40+ rules in system prompt**: Demasiado verbose. AVA debe ser conciso — las reglas criticas (no any, readonly, no stubs) y nada mas.

---

## 5. Resumen: que implementar

| # | Que | De donde | Esfuerzo | Impacto |
|---|-----|----------|----------|---------|
| 1 | Prompt modular por componentes | Cline | 1 dia | Alto — prompt adaptable a modelo y contexto |
| 2 | Session persistence (RunState) | Codex | 1 dia | Alto — resume runs, no repetir trabajo |
| 3 | Context budget management | Cline+Codex | 1 dia | Medio — evita overflow, prioriza contenido |
| 4 | Plan visible + user approval | Codex | medio dia | Alto — usuario controla antes de gastar tokens |
| 5 | Project instructions (.ava/) | Codex+Cline | medio dia | Medio — reglas persistentes por proyecto |
