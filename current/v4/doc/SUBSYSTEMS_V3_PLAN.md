# AVA v3 — Plan de Subsistemas (knowledge, compact, guardian, tools, state, multi-agent)

**Basado en**: Analisis profundo de Codex CLI (53K LOC core Rust)
**Fecha**: 2026-03-25

---

## Resumen: 6 subsistemas a implementar

| # | Subsistema | Inspirado en | LOC est. | Prioridad |
|---|-----------|-------------|----------|-----------|
| 1 | **State** (session + turn) | Codex state/ | ~300 | P0 — prerequisito |
| 2 | **Tools** (registry + dispatch) | Codex tools/ | ~400 | P0 — prerequisito |
| 3 | **Knowledge** (memories cross-session) | Codex memories/ | ~500 | P1 — mayor impacto |
| 4 | **Compact** (context management) | Codex compact | ~300 | P1 |
| 5 | **Guardian** (approval system) | Codex guardian/ | ~250 | P2 |
| 6 | **Multi-agent** (spawn/wait/send) | Codex multi_agents/ | ~400 | P2 |

---

## 1. State (SessionState + TurnState)

**Que es**: Modelo de estado dual. SessionState persiste entre turnos.
TurnState es efimero por turno (pending approvals, token tracking).

**Como funciona en Codex**:
- SessionState: history, model config, permissions, dependency_env
- TurnState: pending_approvals (oneshot channels), tool_calls counter,
  token_usage_at_turn_start, pending_input queue
- ActiveTurn: IndexMap de RunningTask con cancellation tokens

**Que implementar en AVA**:
```
engines/state/
  session.py    — SessionState (history, config, permissions)
  turn.py       — TurnState (approvals, token tracking, input queue)
  manager.py    — StateManager (create/close turns, persist sessions)
```

AVA ya tiene RunState (basico). La mejora:
- RunState → SessionState con history tracking
- Nuevo TurnState por cada modulo procesado
- Token tracking at turn start para calcular deltas
- Input queue para intervenciones del usuario mid-generation

---

## 2. Tools (registry + dispatch + execution)

**Que es**: Pipeline de ejecucion de herramientas que el LLM puede llamar.
No solo generar codigo — tambien leer archivos, ejecutar comandos, buscar.

**Como funciona en Codex**: Registry → Router → Orchestrator → Runtime → Handler
54+ handlers: shell, apply_patch, plan, multi-agents, web_search, tool_search

**Que implementar en AVA** (subset enfocado a generacion):
```
engines/tools/
  registry.py   — ToolRegistry (built-in + MCP)
  router.py     — route tool_name → handler
  orchestrator.py — approval + sandbox + retry
  handlers/
    read_file.py   — leer archivos del proyecto generado
    write_file.py  — escribir/patchear archivos
    run_tsc.py     — ejecutar tsc --noEmit
    search.py      — buscar en codigo generado (grep-like)
    plan.py        — update_plan para mostrar progreso al usuario
```

**NO implementar** (no aplican a AVA):
- Shell execution generico (riesgo de seguridad)
- Network access (AVA no navega web)
- JS REPL (no ejecutamos codigo generado)

---

## 3. Knowledge (memories cross-session)

**Que es**: Sistema de 2 fases que extrae aprendizajes de cada run y los
consolida en `memory_summary.md` para inyectar en la proxima sesion.

**Como funciona en Codex**:
- Phase 1: mini model extrae raw_memory de cada rollout (paralelo, 8 jobs)
- Phase 2: full model consolida multiples memories en resumen
- Storage: filesystem (rollout_summaries/) + DB (Stage1Output)
- Injection: memory_summary inyectado en tool developer instructions (5K tokens max)

**Que implementar en AVA**:
```
engines/knowledge/
  extractor.py    — Phase 1: extraer learnings de cada run
  consolidator.py — Phase 2: sintetizar multiples runs
  store.py        — Persistencia YAML + search
  injector.py     — Inyectar en prompts de la siguiente run
```

**Formato de memory**:
```yaml
# data/knowledge/memories.yaml
memories:
  - id: mem_abc123
    project: chip8
    run_id: xyz789
    timestamp: 2026-03-25
    learnings:
      - "Switch con 35 cases funciona mejor que methods separados para opcodes"
      - "DepthLoop necesario cuando blueprint tiene >10 methods"
      - "Fontset debe cargarse en constructor, no en metodo separado"
    metrics:
      loc: 748
      tsc_errors: 0
      quality_score: 0.69
    approach_won: "exhaustive switch"
    approach_lost: "method-per-opcode"
```

**Injection**: Al inicio de la proxima run, buscar memories relevantes
al goal y inyectar como contexto (max 2K tokens).

---

## 4. Compact (context management inteligente)

**Que es**: Sistema que comprime la historia de conversacion cuando se
acerca al limite de la ventana de contexto.

**Como funciona en Codex**:
- Inline: modelo genera resumen, reemplaza historia
- Remote: API comprime historia
- Selection: reverse-iterate mensajes usuario, acumular hasta 20K tokens
- Preserva: primer intercambio siempre, GhostSnapshots para undo

**Que implementar en AVA**:
```
engines/compact/
  budget.py       — ContextBudget con tracking de tokens
  compactor.py    — CompactHistory: prioriza, trunca, preserva
  summarizer.py   — LLM-based summary de pasos completados
```

AVA ya tiene `tools/compaction.py` pero es estatico (comprime blueprints).
La mejora:
- Token tracking en tiempo real durante la run
- Auto-compact cuando > 80% del budget
- Preserve: primer blueprint siempre, ultimo fix siempre
- Summary de modulos completados (no el codigo, solo "memory did X, display did Y")

---

## 5. Guardian (approval system)

**Que es**: Sistema que decide si una accion del agente necesita aprobacion
del usuario o puede ejecutarse automaticamente.

**Como funciona en Codex**:
- Sub-agente guardian evalua riesgo (0-255, threshold 80)
- Transcript compacto (40 entries, 10K tokens mensajes + 10K tools)
- Fail-closed: timeout/error → deny
- 90s wall-clock timeout

**Que implementar en AVA** (simplificado):
```
engines/guardian/
  policy.py       — ApprovalPolicy (auto/ask/deny per action type)
  reviewer.py     — GuardianReviewer (rule-based, no sub-agent)
  actions.py      — ActionType enum (write_file, run_tsc, delete, modify_interface)
```

AVA no necesita un sub-agente guardian (overkill). Un sistema rule-based:
- `write_file` en src/ → auto-approve
- `delete_file` → ask user
- `modify_interface` que otros modulos usan → ask user
- `run_tsc` → auto-approve
- Threshold: >5 files modified in 1 turn → ask user

---

## 6. Multi-agent (spawn/wait/send)

**Que es**: Primitivas para que un agente padre lance sub-agentes,
espere sus resultados, y les envie input.

**Como funciona en Codex**:
- spawn(role, message, model) → thread_id
- wait(targets, timeout) → completed + timed_out
- send_input(target, message, interrupt) → submission_id
- Depth limiting (max nesting level)
- Status watching (stream-based)

**Que implementar en AVA**:
```
engines/agents/
  control.py      — AgentControl (spawn, wait, send_input, get_status)
  worker.py       — AgentWorker (subprocess or thread-based execution)
  roles.py        — Role definitions (code_generator, fix_specialist, quality_reviewer)
```

**Casos de uso en AVA**:
1. **Parallel module generation**: spawn 1 agente por modulo en Level 0
2. **Quality review agent**: despues de generar, spawn reviewer que analiza
3. **Fix specialist**: cuando fix_engine stalls, spawn specialist con contexto
4. **Experiment variants**: spawn 2 agentes con approaches distintos, wait both

**Depth limiting**: max 2 niveles (parent → child → grandchild)

---

## Orden de implementacion

```
Semana 1: State + Tools (P0 — prerequisitos)
  state/session.py + state/turn.py + state/manager.py
  tools/registry.py + tools/router.py + handlers/plan.py

Semana 2: Knowledge + Compact (P1 — mayor impacto)
  knowledge/extractor.py + knowledge/store.py + knowledge/injector.py
  compact/budget.py + compact/compactor.py

Semana 3: Guardian + Multi-agent (P2 — polish)
  guardian/policy.py + guardian/reviewer.py
  agents/control.py + agents/worker.py + agents/roles.py
```

---

## Que NO copiar de Codex

- **Distributed locks** para memory jobs (AVA es single-process)
- **gRPC** (AVA es CLI)
- **Network proxy/sandbox** (AVA no ejecuta codigo del usuario)
- **v8-poc/JS REPL** (AVA no evalua JS)
- **Telemetry/analytics** (no necesario aun)
- **Plugin marketplace** (over-engineering para v3)
- **GhostSnapshots** (AVA no tiene /undo)

---

## Balance estimado

```
Nuevo:
  engines/state/      ~300 LOC
  engines/tools/      ~400 LOC
  engines/knowledge/  ~500 LOC
  engines/compact/    ~300 LOC
  engines/guardian/    ~250 LOC
  engines/agents/     ~400 LOC
  ─────────────────────────
  Total:              ~2,150 LOC

AVA actual: ~36,000 LOC
AVA despues: ~38,150 LOC (+6%)
```
