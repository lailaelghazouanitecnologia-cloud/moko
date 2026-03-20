# Team - Referencia Completa

> **Archivo fuente**: `libs/agno/agno/team/team.py` (1,783 lineas)
> [Volver al indice](index.md)

## Descripcion

El `Team` permite coordinar multiples agentes (y sub-equipos) con 4 modos de ejecucion. Soporta composicion recursiva: un Team puede contener otros Teams como miembros.

---

## Modos de Ejecucion (TeamMode)

| Modo | Descripcion | Uso tipico |
|------|-------------|------------|
| `coordinate` | **Default**. Un lider elige miembros, asigna tareas, sintetiza respuestas | Tareas que requieren multiples perspectivas |
| `route` | El lider enruta al especialista correcto y retorna su respuesta directamente | Cuando hay agentes especializados por dominio |
| `broadcast` | Delega la misma tarea a todos los miembros simultaneamente | Cuando necesitas multiples opiniones independientes |
| `tasks` | Loop autonomo de tareas. El lider descompone el objetivo en tareas, las asigna, y itera hasta completar | Proyectos complejos con sub-tareas |

---

## Uso

```python
from agno.agent import Agent
from agno.team.team import Team
from agno.team.mode import TeamMode
from agno.models.anthropic import Claude

# Modo coordinate (default)
equipo = Team(
    name="Equipo de Analisis",
    members=[investigador, analista, escritor],
    mode=TeamMode.coordinate,
    model=Claude(id="claude-sonnet-4-5"),
    instructions="Coordina un analisis completo.",
    markdown=True,
)
equipo.print_response("Analiza el mercado de IA en 2026")

# Modo route
router = Team(
    name="Router de Soporte",
    members=[agente_tecnico, agente_ventas, agente_billing],
    mode=TeamMode.route,
    model=Claude(id="claude-sonnet-4-5"),
)

# Modo broadcast
panel = Team(
    name="Panel de Expertos",
    members=[optimista, pesimista, neutral],
    mode=TeamMode.broadcast,
    model=Claude(id="claude-sonnet-4-5"),
)

# Modo tasks (streaming de eventos)
proyecto = Team(
    name="Equipo de Proyecto",
    members=[investigador, desarrollador, tester],
    mode=TeamMode.tasks,
    max_iterations=10,
    model=Claude(id="claude-sonnet-4-5"),
)
for event in proyecto.run("Construye un CLI en Python", stream_events=True):
    if isinstance(event, TaskCreatedEvent):
        print(f"Nueva tarea: {event.task.name}")
```

---

## Todos los Parametros

### Composicion

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `members` | `Union[List[Union[Agent, Team]], Callable]` | **requerido** | Miembros del equipo (agentes o sub-equipos) |
| `id` | `Optional[str]` | auto-UUID | ID unico del equipo |
| `name` | `Optional[str]` | `None` | Nombre del equipo |
| `role` | `Optional[str]` | `None` | Rol si es parte de un equipo padre |
| `model` | `Optional[Model]` | `None` | Modelo para el lider del equipo |

### Ejecucion

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `mode` | `Optional[TeamMode]` | `None` | Modo de ejecucion (coordinate, route, broadcast, tasks) |
| `respond_directly` | `bool` | `False` | Retornar respuestas de miembros sin procesar |
| `delegate_to_all_members` | `bool` | `False` | Delegar a todos los miembros (no subset) |
| `determine_input_for_members` | `bool` | `True` | Procesar input antes de enviar a miembros |
| `max_iterations` | `int` | `10` | Iteraciones maximas para modo tasks |

### Historial e Interacciones

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `add_team_history_to_members` | `bool` | `False` | Enviar historial del equipo a miembros |
| `num_team_history_runs` | `int` | `3` | Runs historicos a incluir |
| `share_member_interactions` | `bool` | `False` | Compartir interacciones entre miembros durante el run |

### Sesion y Memoria

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `user_id` | `Optional[str]` | `None` | ID del usuario |
| `session_id` | `Optional[str]` | auto-UUID | ID de sesion |
| `session_state` | `Optional[Dict]` | `None` | Estado de sesion persistente |
| `db` | `Optional[Union[BaseDb, AsyncBaseDb]]` | `None` | Base de datos para persistencia |
| `memory_manager` | `Optional[MemoryManager]` | `None` | Gestor de memoria |
| `enable_agentic_memory` | `bool` | `False` | Memoria agentica |
| `update_memory_on_run` | `bool` | `False` | Actualizar memorias al final |

### Knowledge

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `knowledge` | `Optional[Union[KnowledgeProtocol, Callable]]` | `None` | Base de conocimiento |
| `search_knowledge` | `bool` | `True` | Tool de busqueda en knowledge |
| `update_knowledge` | `bool` | `False` | Tool para actualizar knowledge |

### Herramientas

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `tools` | `Optional[Union[List[...], Callable]]` | `None` | Herramientas del equipo |
| `tool_choice` | `Optional[Union[str, Dict]]` | `None` | Control de seleccion de tools |
| `tool_call_limit` | `Optional[int]` | `None` | Limite de llamadas a tools |
| `tool_hooks` | `Optional[List[Callable]]` | `None` | Hooks de tools |
| `get_member_information_tool` | `bool` | `False` | Tool para info de miembros |

### Hooks y Guardrails

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `pre_hooks` | `Optional[List[...]]` | `None` | Hooks antes de ejecucion |
| `post_hooks` | `Optional[List[...]]` | `None` | Hooks despues de ejecucion |

### Structured Output

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `input_schema` | `Optional[Type[BaseModel]]` | `None` | Validacion de entrada |
| `output_schema` | `Optional[Union[Type[BaseModel], Dict]]` | `None` | Schema de respuesta |
| `parser_model` | `Optional[Model]` | `None` | Modelo parser |

### Razonamiento

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `reasoning` | `bool` | `False` | Habilitar razonamiento |
| `reasoning_model` | `Optional[Model]` | `None` | Modelo de razonamiento |
| `reasoning_min_steps` | `int` | `1` | Pasos minimos |
| `reasoning_max_steps` | `int` | `10` | Pasos maximos |

### Streaming

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `stream` | `Optional[bool]` | `None` | Streaming de respuesta |
| `stream_events` | `Optional[bool]` | `None` | Streaming de pasos intermedios |
| `stream_member_events` | `bool` | `True` | Streaming de eventos de miembros |
| `store_events` | `bool` | `False` | Persistir eventos |
| `store_member_responses` | `bool` | `False` | Almacenar respuestas de miembros |

### Sistema de Mensajes

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `description` | `Optional[str]` | `None` | Descripcion del equipo |
| `instructions` | `Optional[Union[str, List[str], Callable]]` | `None` | Instrucciones |
| `system_message` | `Optional[Union[str, Callable, Message]]` | `None` | System message personalizado |
| `markdown` | `bool` | `False` | Formato Markdown |
| `add_datetime_to_context` | `bool` | `False` | Agregar fecha/hora |
| `add_member_tools_to_context` | `bool` | `False` | Agregar tools de miembros al contexto |

### Debug

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `debug_mode` | `bool` | `False` | Modo debug |
| `debug_level` | `Literal[1, 2]` | `1` | Nivel de debug |
| `show_members_responses` | `bool` | `False` | Mostrar logs de miembros |

---

## Eventos de Team

Ademas de los RunEvent del Agent, Team emite:

```python
# Eventos especificos de Team
team_run_started, team_run_completed, team_run_error
member_run_started, member_run_completed
task_created, task_updated, task_state_updated  # modo tasks
```
