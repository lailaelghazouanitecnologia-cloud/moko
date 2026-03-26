# Context Strategies — Plan

**Paper base**: [Recursive Language Models](https://arxiv.org/abs/2512.24601)
(Zhang, Kraska, Khattab — MIT CSAIL, 2025)

---

## El problema

AVA trata todos los LLM calls igual: meter todo en 1 prompt y pedir
todo el output de golpe. No importa si el input cabe o no, si el task
es simple o complejo, si hay 5 methods o 35.

## Las estrategias

### 1. BigContext — todo en 1 call

```
Input: blueprint + spec + imports + refs
Output: archivo completo
Calls: 1
```

**Cuando**: input < 50% del context window, output < 4K tokens.
**Ejemplo**: timer.ts (50 LOC), input.ts (60 LOC).
**Ventaja**: rapido, barato, coherente.
**Desventaja**: falla cuando el output es grande.

### 2. Compaction — resumir + continuar

```
History: [turn1, turn2, ... turn20]
Compact: [summary_of_1_to_15, turn16, ... turn20]
Output: siguiente step
```

**Cuando**: historial largo, task incremental.
**Ejemplo**: fix loop despues de 10 iteraciones, session con 50+ entries.
**Ventaja**: mantiene contexto sin overflow.
**Desventaja**: pierde detalle de pasos viejos.

Codex: `COMPACT_USER_MESSAGE_MAX_TOKENS = 20,000`. Resume mensajes
usuario, preserva ultimo summary.

Cline: sliding window, mantiene primer par siempre, trunca por mitades.

### 3. RLM Recursive — orquestador + workers

```
Root LLM: lee blueprint, decide estrategia
  → chunk methods en grupos de 5-8
  → for each group: Sub-LLM implementa
  → Root LLM verifica + combina
  → Sub-LLM fix errores
  → Root LLM produce resultado final
```

**Cuando**: input o output >> context window, task complejo.
**Ejemplo**: CPU con 35 opcodes, analisis de repo con 680 descriptors.
**Ventaja**: escala a cualquier tamano.
**Desventaja**: mas calls, mas tokens totales, necesita 2 LLMs.

Paper RLM: Root=GPT-5, Sub=GPT-5-mini. Input como variable en
Python REPL. El LLM decide como descomponer (regex, chunks, headers).

### 4. Skeleton+Fill — estructura primero, logica despues

```
Call 1: genera skeleton (clase con firmas, stubs)
Call 2: implementa grupo A de methods
Call 3: implementa grupo B
Call 4: verifica coherencia
```

**Cuando**: tipo complejo con muchos methods, output > 8K tokens.
**Ejemplo**: CPU (35 opcodes), GameEngine, large service class.
**Ventaja**: cada call es coherente, skeleton garantiza estructura.
**Desventaja**: 3-4 calls vs 1.

Es lo que DepthLoop hace hoy pero hardcodeado. Con strategies seria
una opcion seleccionable.

### 5. NavigateAndQuery — para analisis

```
Agent tiene: read_descriptor(module, type), search(pattern), get_graph()
Agent navega: lee workspace → elige modulo → lee descriptors → analiza
Output por step: ~500 tokens (observacion + decision)
```

**Cuando**: analizar repos grandes, feature extraction, PI generation.
**Ejemplo**: `ava intel cline-core` (680 descriptors, 159K LOC).
**Ventaja**: solo lee lo relevante, context stays small.
**Desventaja**: muchos round-trips.

Es la idea de MemWalker (MIT 2023) adaptada a code analysis.

---

## Selector de estrategia

```python
def select_strategy(task, input_size, output_estimate, model_caps):
    context = model_caps.context_window
    max_out = model_caps.max_output

    # BigContext: todo cabe
    if input_size < context * 0.5 and output_estimate < max_out * 0.5:
        return "big_context"

    # Compaction: historial largo pero task simple
    if task == "fix" and input_size > context * 0.7:
        return "compaction"

    # Skeleton+Fill: tipo complejo, output grande
    if task == "translate" and output_estimate > max_out * 0.7:
        return "skeleton_fill"

    # RLM: input >> context, task complejo
    if input_size > context * 2 or output_estimate > max_out * 2:
        return "rlm_recursive"

    # Navigate: analisis de repos grandes
    if task == "analyze" and input_size > context:
        return "navigate_query"

    return "big_context"  # default
```

---

## Implementacion en AVA

```
engines/strategies/
  __init__.py           — StrategySelector + base classes
  big_context.py        — single call (actual translate_type)
  compaction.py         — resume + continue (mejorar engines/compact/)
  rlm.py               — recursive with Root+Sub LLM (nuevo)
  skeleton_fill.py      — skeleton + incremental fill (mejorar DepthLoop)
  navigate.py           — tool-based navigation (para analisis)
  selector.py           — auto-select strategy per task
```

### RLM implementacion

```python
class RLMStrategy:
    def __init__(self, root_llm, sub_llm):
        self.root = root_llm      # kimi-k2 (262K context, 16K output)
        self.sub = sub_llm        # llama-3.1-8b (131K context, 131K output!)
        self.repl = PythonREPL()  # estado en variables Python

    def execute(self, task, context_var):
        # Root LLM decide como descomponer
        plan = self.root.complete(
            f"You have a variable `context` with {len(context_var)} chars. "
            f"Task: {task}. Write Python to decompose and process it. "
            f"Use llm_query(prompt) to call a sub-LLM. "
            f"Store results in variables. End with FINAL(result)."
        )

        # Ejecutar en REPL
        self.repl.set("context", context_var)
        self.repl.set("llm_query", self.sub.complete)
        result = self.repl.execute(plan.content)
        return result
```

### Modelo dual

```
Root LLM: kimi-k2-instruct-0905
  - Context: 262K (enorme)
  - Output: 16K
  - Rol: orquestador, decide estrategia, combina resultados

Sub LLM: llama-3.1-8b-instant (en Groq)
  - Context: 131K
  - Output: 131K (!!)
  - Rol: worker, procesa chunks, genera codigo
  - Mucho mas barato y rapido
```

---

## Orden de implementacion

```
Fase 1: StrategySelector + refactor existente
  - Mover translate_type actual → big_context.py
  - Mover DepthLoop → skeleton_fill.py
  - Mover compact → compaction.py
  - selector.py elige automaticamente

Fase 2: RLM strategy
  - Python REPL sandbox
  - Root + Sub LLM pattern
  - Prueba con CPU chip8 (35 opcodes)

Fase 3: Navigate strategy
  - Tool-based navigation para analisis
  - read_descriptor, search, get_graph como tools
  - Prueba con ava intel sobre cline (680 descriptors)
```
