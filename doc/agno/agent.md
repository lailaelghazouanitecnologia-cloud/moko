# Agent - Referencia Completa

> **Archivo fuente**: `libs/agno/agno/agent/agent.py` (1,714 lineas)
> [Volver al indice](index.md)

## Descripcion

El `Agent` es la unidad fundamental de Agno. Es un agente autonomo con su propio modelo, herramientas, memoria, conocimiento y contexto de ejecucion. Soporta ejecucion sincrona y asincrona, streaming, structured outputs, razonamiento extendido, y mas.

---

## Uso Basico

```python
from agno.agent import Agent
from agno.models.anthropic import Claude

agent = Agent(
    model=Claude(id="claude-sonnet-4-5"),
    instructions="Eres un asistente experto en Python.",
    markdown=True,
)

# Ejecucion simple
agent.print_response("Explica list comprehensions", stream=True)

# Obtener resultado programaticamente
result = agent.run("Explica list comprehensions")
print(result.content)

# Async
result = await agent.arun("Explica list comprehensions")
```

---

## Todos los Parametros

### Identificacion

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `model` | `Optional[Model]` | `None` | Modelo de IA para este agente |
| `name` | `Optional[str]` | `None` | Nombre del agente |
| `id` | `Optional[str]` | auto-UUID | UUID unico del agente |

### Usuario y Sesion

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `user_id` | `Optional[str]` | `None` | ID del usuario por defecto |
| `session_id` | `Optional[str]` | auto-UUID | ID de sesion (autogenerado) |
| `session_state` | `Optional[Dict[str, Any]]` | `None` | Estado de sesion persistente en BD |
| `add_session_state_to_context` | `bool` | `False` | Agregar session_state al contexto del modelo |
| `enable_agentic_state` | `bool` | `False` | Dar al agente tools para actualizar session_state |
| `overwrite_db_session_state` | `bool` | `False` | Sobreescribir estado en BD (vs merge) |
| `cache_session` | `bool` | `False` | Cachear sesion actual en memoria |
| `search_past_sessions` | `Optional[bool]` | `False` | Buscar en sesiones pasadas |
| `num_past_sessions_to_search` | `Optional[int]` | `None` | Numero de sesiones pasadas a buscar |
| `num_past_session_runs_in_search` | `Optional[int]` | `None` | Runs por sesion pasada |
| `enable_session_summaries` | `bool` | `False` | Crear resumenes de sesion al final |
| `add_session_summary_to_context` | `Optional[bool]` | `None` | Agregar resumenes al contexto |
| `session_summary_manager` | `Optional[SessionSummaryManager]` | `None` | Gestor de resumenes de sesion |

### Dependencias

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `dependencies` | `Optional[Dict[str, Any]]` | `None` | Dependencias disponibles para tools y funciones de prompt |
| `add_dependencies_to_context` | `bool` | `False` | Agregar dependencias al prompt del usuario |

### Memoria

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `memory_manager` | `Optional[MemoryManager]` | `None` | Gestor de memoria del agente |
| `enable_agentic_memory` | `bool` | `False` | El agente decide cuando almacenar/recordar memorias |
| `update_memory_on_run` | `bool` | `False` | Actualizar memorias automaticamente al final de cada run |
| `add_memories_to_context` | `Optional[bool]` | `None` | Agregar referencia a memorias en la respuesta |

### Base de Datos

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `db` | `Optional[Union[BaseDb, AsyncBaseDb]]` | `None` | Base de datos para persistencia (sesiones, memorias, etc.) |

### Historial

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `add_history_to_context` | `bool` | `False` | Agregar mensajes del historial al contexto |
| `num_history_runs` | `Optional[int]` | `None` | Numero de runs historicos a incluir |
| `num_history_messages` | `Optional[int]` | `None` | Numero de mensajes historicos a incluir |
| `max_tool_calls_from_history` | `Optional[int]` | `None` | Maximo de tool calls del historial (None = sin limite) |

### Conocimiento (RAG)

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `knowledge` | `Optional[Union[KnowledgeProtocol, Callable]]` | `None` | Base de conocimiento para RAG |
| `knowledge_filters` | `Optional[Union[Dict, List[FilterExpr]]]` | `None` | Filtros para busqueda en knowledge |
| `enable_agentic_knowledge_filters` | `Optional[bool]` | `False` | El agente elige los filtros de busqueda |
| `add_knowledge_to_context` | `bool` | `False` | Agregar referencias de conocimiento al prompt |
| `knowledge_retriever` | `Optional[Callable]` | `None` | Funcion custom de recuperacion |
| `references_format` | `Literal["json", "yaml"]` | `"json"` | Formato de las referencias de conocimiento |

### Skills

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `skills` | `Optional[Skills]` | `None` | Skills con instrucciones estructuradas y docs de referencia |

### Herramientas

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `tools` | `Optional[Union[List[...], Callable]]` | `None` | Lista de herramientas (Toolkit, Callable, Function, Dict) o factory callable |
| `tool_call_limit` | `Optional[int]` | `None` | Maximo de llamadas a tools permitidas |
| `tool_choice` | `Optional[Union[str, Dict]]` | `None` | Control de seleccion: `"none"`, `"auto"`, o tool especifico |
| `tool_hooks` | `Optional[List[Callable]]` | `None` | Middleware alrededor de llamadas a tools |

### Hooks (Pre/Post Ejecucion)

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `pre_hooks` | `Optional[List[Union[Callable, BaseGuardrail, BaseEval]]]` | `None` | Ejecutados despues de cargar sesion, antes del modelo |
| `post_hooks` | `Optional[List[Union[Callable, BaseGuardrail, BaseEval]]]` | `None` | Ejecutados despues de generar la respuesta |

### Razonamiento

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `reasoning` | `bool` | `False` | Habilitar razonamiento paso a paso |
| `reasoning_model` | `Optional[Model]` | `None` | Modelo diferente para razonamiento |
| `reasoning_agent` | `Optional[Agent]` | `None` | Agente dedicado para razonamiento |
| `reasoning_min_steps` | `int` | `1` | Pasos minimos de razonamiento |
| `reasoning_max_steps` | `int` | `10` | Pasos maximos de razonamiento |

### Herramientas por Defecto

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `read_chat_history` | `bool` | `False` | Permitir al modelo leer historial de chat |
| `search_knowledge` | `bool` | `True` | Permitir RAG agentico (si knowledge esta configurado) |
| `add_search_knowledge_instructions` | `bool` | `True` | Agregar instrucciones de busqueda al system message |
| `update_knowledge` | `bool` | `False` | Permitir al agente actualizar knowledge |
| `read_tool_call_history` | `bool` | `False` | Permitir al modelo ver historial de tool calls |
| `send_media_to_model` | `bool` | `True` | Enviar media al LLM (vs solo a tools) |
| `store_media` | `bool` | `True` | Almacenar media en la respuesta |
| `store_tool_messages` | `bool` | `True` | Almacenar resultados de tools en la respuesta |
| `store_history_messages` | `bool` | `False` | Almacenar mensajes del historial |

### Mensaje del Sistema

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `system_message` | `Optional[Union[str, Callable, Message]]` | `None` | Mensaje del sistema personalizado completo |
| `system_message_role` | `str` | `"system"` | Rol del mensaje del sistema |
| `introduction` | `Optional[str]` | `None` | Mensaje de introduccion del agente |
| `build_context` | `bool` | `True` | Construir contexto automaticamente |
| `description` | `Optional[str]` | `None` | Descripcion del agente en system message |
| `instructions` | `Optional[Union[str, List[str], Callable]]` | `None` | Instrucciones (str, lista, o callable) |
| `use_instruction_tags` | `bool` | `False` | Envolver instrucciones en tags XML |
| `expected_output` | `Optional[str]` | `None` | Formato de salida esperado |
| `additional_context` | `Optional[str]` | `None` | Contexto adicional al final del system message |
| `markdown` | `bool` | `False` | Agregar instrucciones de formato Markdown |
| `add_name_to_context` | `bool` | `False` | Agregar nombre del agente al contexto |
| `add_datetime_to_context` | `bool` | `False` | Agregar fecha/hora actual |
| `add_location_to_context` | `bool` | `False` | Agregar ubicacion actual |
| `datetime_format` | `Optional[str]` | `None` | Formato personalizado de fecha/hora |
| `timezone_identifier` | `Optional[str]` | `None` | Zona horaria (formato TZ Database) |
| `resolve_in_context` | `bool` | `True` | Resolver variables en mensajes |

### Learning Machine

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `learning` | `Optional[Union[bool, LearningMachine]]` | `None` | Capacidad de aprendizaje continuo |
| `add_learnings_to_context` | `bool` | `True` | Agregar aprendizajes al system prompt |

### Respuesta

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `retries` | `int` | `0` | Numero de reintentos |
| `delay_between_retries` | `int` | `1` | Delay entre reintentos (segundos) |
| `exponential_backoff` | `bool` | `False` | Duplicar delay en cada reintento |

### Structured Output

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `input_schema` | `Optional[Type[BaseModel]]` | `None` | Schema de validacion de entrada |
| `output_schema` | `Optional[Union[Type[BaseModel], Dict]]` | `None` | Schema de formato de respuesta (Pydantic) |
| `parser_model` | `Optional[Model]` | `None` | Modelo secundario para parsear respuesta |
| `parser_model_prompt` | `Optional[str]` | `None` | Prompt para el parser model |
| `output_model` | `Optional[Model]` | `None` | Modelo para estructurar respuesta |
| `output_model_prompt` | `Optional[str]` | `None` | Prompt para output model |
| `parse_response` | `bool` | `True` | Convertir respuesta al output_schema |
| `structured_outputs` | `Optional[bool]` | `None` | Usar structured outputs nativos del modelo |
| `use_json_mode` | `bool` | `False` | Usar JSON schema en system message |
| `save_response_to_file` | `Optional[str]` | `None` | Guardar respuesta en archivo |

### Followups

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `followups` | `bool` | `False` | Generar prompts de seguimiento |
| `num_followups` | `int` | `3` | Numero de followups a generar |
| `followup_model` | `Optional[Model]` | `None` | Modelo para generar followups |

### Streaming

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `stream` | `Optional[bool]` | `None` | Hacer streaming de la respuesta |
| `stream_events` | `Optional[bool]` | `None` | Hacer streaming de pasos intermedios |
| `store_events` | `bool` | `False` | Persistir eventos en la respuesta |
| `events_to_skip` | `Optional[List[RunEvent]]` | `None` | Eventos a no almacenar/emitir |

### Equipo/Workflow

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `role` | `Optional[str]` | `None` | Rol del agente en un equipo |
| `team_id` | `Optional[str]` | `None` | ID del equipo |
| `workflow_id` | `Optional[str]` | `None` | ID del workflow |

### Compresion de Contexto

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `compress_tool_results` | `bool` | `False` | Comprimir resultados de tools |
| `compression_manager` | `Optional[CompressionManager]` | `None` | Gestor de compresion |

### Debug y Telemetria

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `debug_mode` | `bool` | `False` | Habilitar logs de debug |
| `debug_level` | `Literal[1, 2]` | `1` | Nivel de verbosidad (1=basico, 2=detallado) |
| `telemetry` | `bool` | `True` | Enviar telemetria anonima |
| `metadata` | `Optional[Dict[str, Any]]` | `None` | Metadata personalizada |

### Cache de Callables

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `cache_callables` | `bool` | `True` | Cachear resultados de callable factories |
| `callable_tools_cache_key` | `Optional[Callable]` | `None` | Key de cache para tools callable |
| `callable_knowledge_cache_key` | `Optional[Callable]` | `None` | Key de cache para knowledge callable |

---

## Metodos Principales

### Ejecucion

| Metodo | Descripcion |
|--------|-------------|
| `run(message, ...)` | Ejecucion sincrona. Retorna `RunOutput` |
| `arun(message, ...)` | Ejecucion asincrona. Retorna `RunOutput` |
| `print_response(message, stream=True)` | Ejecuta e imprime con formato rich |
| `aprint_response(message, stream=True)` | Version asincrona de print_response |
| `stream(message, ...)` | Retorna Iterator de `RunOutputEvent` |
| `astream(message, ...)` | Retorna AsyncIterator de `RunOutputEvent` |
| `cli_app()` | Inicia CLI interactivo en terminal |
| `acli_app()` | Version asincrona del CLI |

---

## RunOutput (Respuesta)

La respuesta de `agent.run()` es un objeto `RunOutput` con estos campos:

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `run_id` | `str` | ID unico del run |
| `content` | `Any` | Contenido principal de la respuesta |
| `content_type` | `str` | Tipo del contenido (`"str"` por defecto) |
| `reasoning_content` | `Optional[str]` | Contenido del razonamiento |
| `reasoning_steps` | `Optional[List[ReasoningStep]]` | Pasos de razonamiento estructurados |
| `model` | `Optional[str]` | Modelo usado |
| `messages` | `Optional[List[Message]]` | Todos los mensajes del run |
| `metrics` | `Optional[RunMetrics]` | Metricas (tokens, latencia, costo) |
| `tools` | `Optional[List[ToolExecution]]` | Tools ejecutados |
| `images` | `Optional[List[Image]]` | Imagenes generadas |
| `videos` | `Optional[List[Video]]` | Videos generados |
| `audio` | `Optional[List[Audio]]` | Audio generado |
| `files` | `Optional[List[File]]` | Archivos adjuntos |
| `citations` | `Optional[Citations]` | Citas de knowledge |
| `followups` | `Optional[List[str]]` | Prompts de seguimiento |
| `session_state` | `Optional[Dict]` | Estado de sesion actualizado |
| `status` | `RunStatus` | Estado: running, completed, paused, cancelled, error |
| `events` | `Optional[List[RunOutputEvent]]` | Stream de eventos |

### Propiedades de RunOutput

| Propiedad | Descripcion |
|-----------|-------------|
| `is_paused` | True si status == paused (esperando HITL) |
| `is_cancelled` | True si status == cancelled |
| `active_requirements` | Requisitos HITL sin resolver |
| `tools_requiring_confirmation` | Tools esperando confirmacion |
| `tools_requiring_user_input` | Tools esperando input del usuario |

---

## Eventos de Run (RunEvent)

```python
# Eventos del ciclo de vida
run_started, run_content, run_content_completed
run_completed, run_error, run_cancelled, run_paused, run_continued

# Hooks
pre_hook_started, pre_hook_completed
post_hook_started, post_hook_completed

# Tools
tool_call_started, tool_call_completed, tool_call_error

# Razonamiento
reasoning_started, reasoning_step, reasoning_content_delta, reasoning_completed

# Memoria
memory_update_started, memory_update_completed
session_summary_started, session_summary_completed

# Modelos auxiliares
parser_model_response_started, parser_model_response_completed
output_model_response_started, output_model_response_completed
model_request_started, model_request_completed

# Otros
compression_started, compression_completed
followups_started, followups_completed
custom_event
```
