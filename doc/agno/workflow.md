# Workflow - Referencia Completa

> **Archivo fuente**: `libs/agno/agno/workflow/workflow.py` (7,690 lineas)
> [Volver al indice](index.md)

## Descripcion

El `Workflow` permite orquestar pipelines complejos con Steps secuenciales, Loops iterativos, ejecucion Parallel, Conditions condicionales, y Routers dinamicos. Soporta ejecucion de larga duracion con pause/resume y Human-in-the-Loop.

---

## Uso

```python
from agno.workflow.workflow import Workflow
from agno.workflow.step import Step
from agno.workflow.router import Router
from agno.workflow.loop import Loop
from agno.workflow.parallel import Parallel

workflow = Workflow(
    name="Pipeline de Analisis",
    steps=[
        Step(name="Recopilar datos", agent=recopilador),
        Parallel(
            Step(name="Analisis tecnico", agent=analista_tecnico),
            Step(name="Analisis fundamental", agent=analista_fundamental),
        ),
        Step(name="Sintesis", agent=sintetizador),
    ],
)
result = workflow.run("Analiza Tesla para inversion")
```

---

## Parametros del Workflow

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `name` | `Optional[str]` | `None` | Nombre del workflow |
| `id` | `Optional[str]` | auto-UUID | ID unico |
| `description` | `Optional[str]` | `None` | Descripcion |
| `steps` | `Optional[WorkflowSteps]` | `None` | Pasos del workflow |
| `agent` | `Optional[WorkflowAgent]` | `None` | Agente agentico del workflow |
| `db` | `Optional[Union[BaseDb, AsyncBaseDb]]` | `None` | Base de datos |
| `session_id` | `Optional[str]` | auto-UUID | ID de sesion |
| `user_id` | `Optional[str]` | `None` | ID de usuario |
| `session_state` | `Optional[Dict]` | `None` | Estado de sesion |
| `overwrite_db_session_state` | `bool` | `False` | Sobreescribir estado en BD |
| `stream` | `Optional[bool]` | `None` | Streaming de respuesta |
| `stream_events` | `bool` | `False` | Streaming de eventos |
| `stream_executor_events` | `bool` | `True` | Streaming de eventos de ejecutores |
| `store_events` | `bool` | `False` | Persistir eventos |
| `store_executor_outputs` | `bool` | `True` | Almacenar respuestas de ejecutores |
| `input_schema` | `Optional[Type[BaseModel]]` | `None` | Validacion de entrada |
| `dependencies` | `Optional[Dict]` | `None` | Dependencias |
| `add_dependencies_to_context` | `Optional[bool]` | `None` | Agregar dependencias al contexto |
| `add_session_state_to_context` | `Optional[bool]` | `None` | Agregar session_state |
| `add_workflow_history_to_steps` | `bool` | `False` | Historial en pasos |
| `num_history_runs` | `int` | `3` | Runs historicos |
| `debug_mode` | `Optional[bool]` | `False` | Modo debug |
| `metadata` | `Optional[Dict]` | `None` | Metadata |
| `telemetry` | `bool` | `True` | Telemetria |

---

## Tipos de Step

### Step - Unidad Basica

```python
Step(
    name="Investigar",
    agent=mi_agente,       # o team=mi_equipo, o executor=mi_funcion
    description="Investiga el tema",
    max_retries=3,
    skip_on_failure=False,
)
```

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `name` | `Optional[str]` | `None` | Nombre del paso |
| `agent` | `Optional[Agent]` | `None` | Agente ejecutor |
| `team` | `Optional[Team]` | `None` | Equipo ejecutor |
| `executor` | `Optional[StepExecutor]` | `None` | Funcion custom ejecutora |
| `step_id` | `Optional[str]` | auto-UUID | ID del paso |
| `description` | `Optional[str]` | `None` | Descripcion |
| `max_retries` | `int` | `3` | Reintentos maximos |
| `skip_on_failure` | `bool` | `False` | Saltar paso si falla |
| `strict_input_validation` | `bool` | `False` | Validacion estricta de entrada |
| `add_workflow_history` | `Optional[bool]` | `None` | Incluir historial del workflow |
| `num_history_runs` | `int` | `3` | Runs historicos |
| `on_error` | `Union[OnError, str]` | `OnError.skip` | Accion en error |

#### HITL en Steps

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `requires_confirmation` | `bool` | `False` | Pausar para confirmacion |
| `confirmation_message` | `Optional[str]` | `None` | Mensaje de confirmacion |
| `on_reject` | `Union[OnReject, str]` | `OnReject.skip` | Accion al rechazar |
| `requires_user_input` | `bool` | `False` | Pausar para input del usuario |
| `user_input_message` | `Optional[str]` | `None` | Mensaje de solicitud |
| `user_input_schema` | `Optional[List[Dict]]` | `None` | Schema del input |

---

### Router - Enrutamiento Dinamico

```python
Router(
    name="Seleccionar formato",
    choices=[
        Step(name="Blog", agent=escritor_blog),
        Step(name="Tweet", agent=escritor_social),
        Step(name="Email", agent=escritor_email),
    ],
    selector=lambda inp: seleccionar_por_tipo(inp),
)
```

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `choices` | `WorkflowSteps` | **requerido** | Pasos disponibles |
| `selector` | `Optional[Union[Callable, str]]` | `None` | Funcion de seleccion o expresion CEL |
| `name` | `Optional[str]` | `None` | Nombre del router |
| `description` | `Optional[str]` | `None` | Descripcion |
| `requires_user_input` | `bool` | `False` | El usuario selecciona (HITL) |
| `user_input_message` | `Optional[str]` | `None` | Mensaje para seleccion |
| `allow_multiple_selections` | `bool` | `False` | Permitir multiples rutas |
| `requires_confirmation` | `bool` | `False` | Confirmar antes de ejecutar |
| `on_reject` | `Union[OnReject, str]` | `OnReject.skip` | Accion al rechazar |

#### Selectores CEL

```python
# Variables disponibles en CEL:
# input, previous_step_content, previous_step_outputs,
# additional_data, session_state, step_choices

Router(
    choices=[paso_a, paso_b],
    selector="input.contains('urgente') ? 'paso_a' : 'paso_b'",
)
```

---

### Loop - Ejecucion Iterativa

```python
Loop(
    name="Refinar documento",
    steps=[Step(name="Escribir", agent=escritor), Step(name="Revisar", agent=editor)],
    max_iterations=5,
    end_condition=lambda outputs: "aprobado" in outputs[-1].content,
)
```

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `steps` | `WorkflowSteps` | **requerido** | Pasos a iterar |
| `name` | `Optional[str]` | `None` | Nombre del loop |
| `max_iterations` | `int` | `3` | Iteraciones maximas |
| `end_condition` | `Optional[Union[Callable, str]]` | `None` | Condicion de fin (callable o CEL) |
| `forward_iteration_output` | `bool` | `False` | Pasar output como input de siguiente iteracion |
| `requires_confirmation` | `bool` | `False` | Confirmar antes de empezar |
| `on_reject` | `Union[OnReject, str]` | `OnReject.skip` | Accion al rechazar |

#### End Condition CEL

```python
# Variables disponibles:
# current_iteration, max_iterations, all_success,
# last_step_content, step_outputs

Loop(
    steps=[...],
    end_condition="current_iteration >= 3 || last_step_content.contains('listo')",
)
```

---

### Parallel - Ejecucion Concurrente

```python
Parallel(
    Step(name="Buscar en web", agent=buscador_web),
    Step(name="Buscar en BD", agent=buscador_bd),
    Step(name="Buscar en docs", agent=buscador_docs),
)
```

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `steps` | `WorkflowSteps` | `[]` | Pasos a ejecutar en paralelo |
| `name` | `Optional[str]` | `None` | Nombre |
| `description` | `Optional[str]` | `None` | Descripcion |

Constructores flexibles:
```python
Parallel(step1, step2, step3)                    # Solo pasos
Parallel(step1, step2, name="mi_paralelo")       # Nombre como kwarg
Parallel("mi_paralelo", step1, step2)            # Nombre como primer arg
```

---

## Ejemplo Completo

```python
from agno.workflow.workflow import Workflow
from agno.workflow.step import Step
from agno.workflow.router import Router
from agno.workflow.loop import Loop
from agno.workflow.parallel import Parallel

workflow = Workflow(
    name="Pipeline de Contenido",
    steps=[
        # 1. Investigacion en paralelo
        Parallel(
            "Investigacion",
            Step(name="Web", agent=buscador_web),
            Step(name="Papers", agent=buscador_academico),
        ),
        # 2. Seleccionar formato segun el tema
        Router(
            name="Formato",
            choices=[
                Step(name="Articulo", agent=escritor_largo),
                Step(name="Resumen", agent=escritor_corto),
            ],
            selector=lambda inp: elegir_formato(inp),
        ),
        # 3. Loop de revision hasta aprobar
        Loop(
            name="Revision",
            steps=[
                Step(name="Revisar", agent=editor),
                Step(name="Corregir", agent=corrector),
            ],
            max_iterations=3,
            end_condition=lambda outputs: "aprobado" in str(outputs[-1].content),
        ),
        # 4. Publicacion final
        Step(name="Publicar", agent=publicador),
    ],
    stream_events=True,
)
result = workflow.run("Escribe sobre quantum computing en 2026")
```
