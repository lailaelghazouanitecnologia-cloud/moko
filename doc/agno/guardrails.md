# Guardrails & Governance - Referencia Completa

> **Archivos fuente**: `libs/agno/agno/guardrails/`, `hooks/`, `approval/`, `eval/`, `reasoning/`, `compression/`, `learn/`
> [Volver al indice](index.md)

## Descripcion

Agno incluye un sistema completo de seguridad y gobernanza: guardrails para validacion, hooks para lifecycle, approvals para HITL, evaluaciones de calidad, razonamiento extendido, compresion de contexto, y aprendizaje continuo.

---

## 1. Guardrails (Validacion de Seguridad)

### Guardrails Built-in

#### PII Detection

```python
from agno.guardrails.pii import PIIDetectionGuardrail

guardrail = PIIDetectionGuardrail(
    mask_pii=True,               # Enmascarar en vez de bloquear
    enable_ssn_check=True,       # Detectar SSN
    enable_credit_card_check=True,
    enable_email_check=True,
    enable_phone_check=True,
    custom_patterns={"mi_id": r"\bID-\d{6}\b"},  # Patrones custom
)

agent = Agent(
    model=Claude(id="claude-sonnet-4-5"),
    pre_hooks=[guardrail],
)
```

#### OpenAI Moderation

```python
from agno.guardrails.openai import OpenAIModerationGuardrail

guardrail = OpenAIModerationGuardrail(
    raise_for_categories=["sexual", "violence", "hate"],
    # Categorias: sexual, harassment, hate, illicit,
    #             self-harm, violence (+ variantes /minor)
)
```

#### Prompt Injection Detection

```python
from agno.guardrails.prompt_injection import PromptInjectionGuardrail

guardrail = PromptInjectionGuardrail(
    custom_patterns=[
        r"ignora.*instrucciones",
        r"eres.*DAN",
        r"modo.*desarrollador",
    ],
)
```

### Crear Guardrails Custom

```python
from agno.guardrails.base import BaseGuardrail, InputCheckError, CheckTrigger

class ValidarIdiomaGuardrail(BaseGuardrail):
    def check(self, run_input):
        content = run_input.input_content_string()
        if detectar_idioma(content) not in ["es", "en"]:
            raise InputCheckError(
                trigger=CheckTrigger.CUSTOM,
                message="Solo se aceptan mensajes en espanol o ingles.",
            )

    async def async_check(self, run_input):
        self.check(run_input)  # Reusar logica sincrona
```

---

## 2. Hooks (Ciclo de Vida)

### Descripcion

Los hooks permiten ejecutar logica antes y despues de cada run del agente o equipo.

### Tipos de Hooks

| Tipo | Cuando se ejecuta |
|------|-------------------|
| `pre_hooks` | Despues de cargar sesion, antes del modelo |
| `post_hooks` | Despues de generar la respuesta |

### Uso

```python
from agno.hooks import hook

@hook
def log_entrada(run_input):
    """Log sincrono antes de cada run."""
    print(f"Input: {run_input.input_content_string()}")

@hook(run_in_background=True)
async def guardar_metricas(run_output):
    """Guardar metricas en background (no bloquea)."""
    await db.save_metrics(run_output.metrics)

agent = Agent(
    model=Claude(id="claude-sonnet-4-5"),
    pre_hooks=[log_entrada],
    post_hooks=[guardar_metricas],
)
```

### Parametros del Decorador @hook

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `run_in_background` | `bool` | `False` | Ejecutar como tarea de background (FastAPI) |

---

## 3. Approval System (HITL)

### Descripcion

El sistema de approvals permite pausar la ejecucion de tools para requerir aprobacion humana.

### Tipos de Aprobacion

| Tipo | Descripcion |
|------|-------------|
| `required` | **Bloquea** la ejecucion hasta recibir aprobacion |
| `audit` | **No bloquea**, pero registra para auditoria |

### Uso con Decorador

```python
from agno.approval import approval
from agno.tools.decorator import tool

@approval(type="required")
@tool
def transferir_dinero(monto: float, destino: str) -> str:
    """Transfiere dinero a una cuenta."""
    return f"Transferido ${monto} a {destino}"

@approval(type="audit")
@tool
def enviar_email(to: str, subject: str, body: str) -> str:
    """Envia un email (registrado para auditoria)."""
    return f"Email enviado a {to}"
```

### Uso con Function Parameters

```python
from agno.tools.function import Function

func = Function(
    name="borrar_cuenta",
    entrypoint=borrar_cuenta_impl,
    requires_confirmation=True,           # HITL: Confirmar antes
    requires_user_input=True,             # HITL: Pedir input
    user_input_fields=["motivo"],         # Campos requeridos
    approval_type="required",            # Tipo de aprobacion
)
```

---

## 4. Evaluaciones (Eval System)

### Tipos de Evaluacion

#### Accuracy Eval

```python
from agno.eval.accuracy import AccuracyEval

eval = AccuracyEval(db=db)

# Evalua contra output esperado, score 1-10
# AccuracyResult: avg_score, mean_score, min_score, max_score, std_dev_score
```

#### Reliability Eval

```python
from agno.eval.reliability import ReliabilityEval

eval = ReliabilityEval(db=db)

# Valida tool calls esperados vs reales
# ReliabilityResult: passed/failed tool lists
```

#### Performance Eval

```python
from agno.eval.performance import PerformanceEval

eval = PerformanceEval(db=db)

# Mide tiempo de ejecucion y uso de memoria
# PerformanceResult: avg, min, max, std_dev, median, p95
```

#### Agent as Judge

```python
from agno.eval.agent_as_judge import AgentAsJudgeEval

eval = AgentAsJudgeEval(
    db=db,
    model=Claude(id="claude-sonnet-4-5"),  # Modelo juez
    scoring_mode="numeric",                 # "numeric" (1-10) o "binary" (pass/fail)
    criteria="Evalua la precision, claridad y completitud de la respuesta.",
)
```

### Usar Evals como Hooks

```python
agent = Agent(
    model=Claude(id="claude-sonnet-4-5"),
    pre_hooks=[guardrail_pii],       # Validar entrada
    post_hooks=[accuracy_eval],       # Evaluar salida
)
```

---

## 5. Reasoning (Razonamiento Extendido)

### Proveedores con Razonamiento Nativo

| Proveedor | Modelos | Soporte Streaming |
|-----------|---------|-------------------|
| Anthropic | Claude (extended thinking) | Si |
| OpenAI | o1, o3, o4 | Si |
| DeepSeek | DeepSeek R1 | Si |
| Google | Gemini (thinking) | Si |
| Groq | Modelos con reasoning | Si |
| Ollama | Modelos con reasoning | Si |
| Azure | AI Foundry | Si |
| VertexAI | Claude via Vertex | Si |

### Chain-of-Thought (Default)

Cuando el modelo no soporta razonamiento nativo, Agno usa CoT:

```python
agent = Agent(
    model=Claude(id="claude-sonnet-4-5"),
    reasoning=True,
    reasoning_min_steps=2,
    reasoning_max_steps=6,
)
```

### ReasoningStep Structure

```python
class ReasoningStep:
    title: Optional[str]          # Titulo del paso
    action: Optional[str]         # Accion en primera persona
    result: Optional[str]         # Resultado
    reasoning: Optional[str]      # Proceso de pensamiento
    next_action: NextAction       # continue, validate, final_answer, reset
    confidence: Optional[float]   # 0.0-1.0
```

### Modelo de Razonamiento Separado

```python
agent = Agent(
    model=Claude(id="claude-sonnet-4-5"),           # Principal
    reasoning=True,
    reasoning_model=Claude(id="claude-opus-4-5"),    # Razonamiento
    reasoning_min_steps=3,
    reasoning_max_steps=8,
)
```

---

## 6. Context Compression

### Descripcion

Comprime resultados de tool calls para ahorrar tokens manteniendo informacion clave.

### Uso

```python
from agno.compression.manager import CompressionManager

compression = CompressionManager(
    model=Claude(id="claude-haiku-4-5"),   # Modelo ligero para comprimir
    compress_tool_results=True,
    compress_tool_results_limit=5,          # Despues de 5 results
    compress_token_limit=4000,              # O a 4000 tokens
)

agent = Agent(
    model=Claude(id="claude-sonnet-4-5"),
    compress_tool_results=True,
    compression_manager=compression,
)
```

### Que Preserva

- Datos especificos, fechas, entidades, identificadores
- Citas clave y conclusiones

### Que Elimina

- Introducciones, hedging, filler
- Redundancia y repeticion

---

## 7. AgentOS (Produccion)

### Descripcion

AgentOS es la plataforma de despliegue que expone agentes, equipos y workflows como APIs REST + WebSocket.

### Uso

```python
from agno.os.app import AgentOS
from agno.db.postgres import PostgresDb

app = AgentOS(
    agents=[mi_agente, otro_agente],
    teams=[mi_equipo],
    workflows=[mi_workflow],
    db=PostgresDb(host="localhost", db_name="prod"),
    authorization=True,              # JWT auth
    auto_provision_dbs=True,         # Auto-crear tablas
    run_hooks_in_background=True,    # Hooks no bloquean
    enable_mcp_server=True,          # Soporte MCP
)

# uvicorn main:app --host 0.0.0.0 --port 8000
```

### Endpoints de API

| Endpoint | Metodo | Descripcion |
|----------|--------|-------------|
| `GET /config` | GET | Configuracion completa del OS |
| `GET /models` | GET | Modelos en uso |
| `POST /agent/{id}/run` | POST | Ejecutar agente |
| `POST /team/{id}/run` | POST | Ejecutar equipo |
| `POST /workflow/{id}/run` | POST | Ejecutar workflow |
| `GET /agent/{id}/sessions` | GET | Sesiones del agente |
| `WS /agent/{id}/ws` | WS | WebSocket streaming |

### Interfaces (Channels)

| Interface | Descripcion |
|-----------|-------------|
| Slack | Bot de Slack |
| WhatsApp | Bot de WhatsApp |
| Telegram | Bot de Telegram |
| Discord | Bot de Discord |
| AGUI | Web UI |

### Configuracion

```python
from agno.os.config import (
    AuthorizationConfig,
    SessionConfig,
    MemoryConfig,
    KnowledgeConfig,
    MetricsConfig,
    TracesConfig,
)

auth = AuthorizationConfig(
    jwt_secret="mi-secreto",
    jwt_algorithm="HS256",
)

app = AgentOS(
    authorization=auth,
    # ... otros configs
)
```

### Scheduler

```python
# Tareas programadas con cron
from agno.scheduler import Scheduler

scheduler = Scheduler(db=db)
scheduler.schedule(mi_workflow, cron="0 9 * * *")  # Cada dia a las 9am

app = AgentOS(
    scheduler=scheduler,
)
```

---

## Resumen de Subsistemas

| Subsistema | Proposito | Donde va |
|------------|-----------|----------|
| **Guardrails** | Validar entrada/salida | `pre_hooks` / `post_hooks` |
| **Hooks** | Logica de lifecycle | `pre_hooks` / `post_hooks` |
| **Approvals** | HITL, aprobaciones | Decorador en tools |
| **Evaluations** | Calidad y performance | `post_hooks` o standalone |
| **Reasoning** | Pensamiento extendido | `reasoning=True` en Agent |
| **Compression** | Ahorrar tokens | `compress_tool_results=True` |
| **Learning** | Mejora continua | `learning=LearningMachine(...)` |
| **AgentOS** | Produccion | `AgentOS(agents=[...])` |
