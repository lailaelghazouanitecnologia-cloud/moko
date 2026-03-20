# Agno Framework - Documentacion Completa

> **Repositorio**: [github.com/agno-agi/agno](https://github.com/agno-agi/agno)
> **Licencia**: Apache 2.0 | **Lenguaje**: Python 3.10+ | **Estrellas**: ~38,800

---

## Que es Agno

Agno es el **runtime para software agentico**. Permite construir agentes de IA, equipos multi-agente y workflows complejos, ejecutarlos como servicios escalables en produccion, y monitorearlos a traves de AgentOS.

### Numeros del Repositorio

| Metrica | Valor |
|---------|-------|
| Lineas de codigo Python | 641,711 |
| Archivos Python | 3,436 |
| Archivos de test | 782 |
| Ejemplos (cookbook) | 1,757 |
| Proveedores de modelos IA | 47 |
| Integraciones de herramientas | 173+ |
| Vector databases soportadas | 22 |
| Backends de almacenamiento | 13+ |
| GitHub Actions workflows | 8 |

### Performance

- **529x mas rapido** que LangGraph en instanciacion de agentes
- **57x mas rapido** que PydanticAI
- **70x mas rapido** que CrewAI

---

## Arquitectura de 3 Capas

```
┌──────────────────────────────────────────────────────────────┐
│                     CONTROL PLANE                             │
│            AgentOS UI - Monitoreo, gestion, trazas            │
│         Scheduler · RBAC · Metricas · Observabilidad          │
├──────────────────────────────────────────────────────────────┤
│                       RUNTIME                                 │
│          FastAPI backend · Stateless · Session-scoped         │
│     WebSocket streaming · Escalamiento horizontal · MCP       │
├──────────────────────────────────────────────────────────────┤
│                      FRAMEWORK                                │
│                                                               │
│   ┌─────────┐   ┌─────────┐   ┌───────────┐                 │
│   │  Agent   │──▶│  Team   │──▶│ Workflow  │                 │
│   └────┬────┘   └────┬────┘   └─────┬─────┘                 │
│        │             │              │                         │
│   ┌────┴─────────────┴──────────────┴────┐                   │
│   │  Memory · Knowledge · Tools · Guards  │                   │
│   │  Reasoning · Learning · Compression   │                   │
│   │  Hooks · Approvals · Evaluations      │                   │
│   └──────────────────────────────────────┘                   │
│                                                               │
│   47 Modelos · 173 Tools · 22 VectorDBs · 13 Storage         │
└──────────────────────────────────────────────────────────────┘
```

---

## Indice de Documentacion

### Componentes Core

| Documento | Descripcion |
|-----------|-------------|
| [Agent](agent.md) | La unidad fundamental. Agente autonomo con modelo, herramientas, memoria y contexto. 80+ parametros configurables. |
| [Team](team.md) | Coordinacion multi-agente con 4 modos: coordinate, route, broadcast, tasks. Composicion recursiva (Teams de Teams). |
| [Workflow](workflow.md) | Orquestacion compleja con Steps, Loops, Parallel, Conditions, Routers. Soporte para ejecucion de larga duracion con pause/resume. |

### Integraciones

| Documento | Descripcion |
|-----------|-------------|
| [Models](models.md) | 47 proveedores de modelos IA: Anthropic, OpenAI, Google, AWS, Azure, Groq, Ollama, DeepSeek, Mistral, y 38 mas. API base y configuracion por proveedor. |
| [Tools](tools.md) | 173+ herramientas organizadas en 15 categorias: busqueda web, desarrollo, datos, comunicacion, productividad, multimedia, y mas. Como crear tools custom. |

### Datos y Conocimiento

| Documento | Descripcion |
|-----------|-------------|
| [Knowledge & Memory](knowledge.md) | Sistema RAG completo (chunking, embeddings, hybrid search, reranking). MemoryManager para memoria entre sesiones. 22 VectorDBs y 13 storage backends. |

### Seguridad y Gobernanza

| Documento | Descripcion |
|-----------|-------------|
| [Guardrails & Governance](guardrails.md) | Guardrails (PII, inyeccion, moderacion), Hooks (pre/post ejecucion), Approvals (HITL), Evaluaciones (accuracy, reliability, performance), Reasoning, Compression, Learning Machine. |

---

## Quick Start

### Instalacion

```bash
pip install agno
```

### Agente Basico

```python
from agno.agent import Agent
from agno.models.anthropic import Claude

agent = Agent(
    model=Claude(id="claude-sonnet-4-5"),
    markdown=True,
)
agent.print_response("Que es la computacion cuantica?", stream=True)
```

### Agente con Herramientas

```python
from agno.agent import Agent
from agno.models.anthropic import Claude
from agno.tools.duckduckgo import DuckDuckGoTools

agent = Agent(
    model=Claude(id="claude-sonnet-4-5"),
    tools=[DuckDuckGoTools()],
    instructions="Busca informacion actualizada antes de responder.",
    show_tool_calls=True,
    markdown=True,
)
agent.print_response("Cuales son las ultimas noticias sobre IA?", stream=True)
```

### Agente con Memoria Persistente

```python
from agno.agent import Agent
from agno.models.anthropic import Claude
from agno.memory.manager import MemoryManager
from agno.db.sqlite import SqliteDb

db = SqliteDb(name="mi_app", db_file="data.db")

agent = Agent(
    model=Claude(id="claude-sonnet-4-5"),
    memory_manager=MemoryManager(db=db),
    enable_agentic_memory=True,
    db=db,
    add_history_to_context=True,
    markdown=True,
)
agent.print_response("Me llamo Carlos y trabajo en finanzas", user_id="carlos")
# En la siguiente sesion, el agente recordara esta informacion
```

### Agente con Knowledge Base (RAG)

```python
from agno.agent import Agent
from agno.models.anthropic import Claude
from agno.knowledge.knowledge import Knowledge
from agno.vectordb.chroma import ChromaDb
from agno.db.sqlite import SqliteDb

knowledge = Knowledge(
    vector_db=ChromaDb(collection="docs", path="./chroma_db"),
    contents_db=SqliteDb(name="knowledge", db_file="knowledge.db"),
)
# Insertar documentos
knowledge.insert(path="./docs/manual.pdf")
knowledge.insert(url="https://ejemplo.com/guia")

agent = Agent(
    model=Claude(id="claude-sonnet-4-5"),
    knowledge=knowledge,
    search_knowledge=True,
    markdown=True,
)
agent.print_response("Que dice el manual sobre configuracion?", stream=True)
```

### Equipo Multi-Agente

```python
from agno.agent import Agent
from agno.team.team import Team
from agno.team.mode import TeamMode
from agno.models.anthropic import Claude
from agno.tools.duckduckgo import DuckDuckGoTools
from agno.tools.yfinance import YFinanceTools

investigador = Agent(
    name="Investigador",
    role="Busca informacion actualizada",
    model=Claude(id="claude-sonnet-4-5"),
    tools=[DuckDuckGoTools()],
)

analista = Agent(
    name="Analista Financiero",
    role="Analiza datos financieros",
    model=Claude(id="claude-sonnet-4-5"),
    tools=[YFinanceTools(stock_price=True, analyst_recommendations=True)],
)

equipo = Team(
    name="Equipo de Investigacion",
    members=[investigador, analista],
    mode=TeamMode.coordinate,
    model=Claude(id="claude-sonnet-4-5"),
    markdown=True,
)
equipo.print_response("Analiza si Apple es buena inversion ahora")
```

### Workflow con Branching

```python
from agno.workflow.workflow import Workflow
from agno.workflow.step import Step
from agno.workflow.router import Router

workflow = Workflow(
    name="Pipeline de Contenido",
    steps=[
        Step(name="Investigacion", agent=investigador),
        Router(
            name="Seleccionar formato",
            choices=[
                Step(name="Blog", agent=escritor_blog),
                Step(name="Tweet", agent=escritor_social),
            ],
            selector=lambda inp: seleccionar_formato(inp),
        ),
        Step(name="Revision", agent=editor),
    ],
)
workflow.run("Escribe sobre tendencias IA 2026")
```

### Structured Output

```python
from pydantic import BaseModel
from agno.agent import Agent
from agno.models.anthropic import Claude

class AnalisisStock(BaseModel):
    ticker: str
    precio_actual: float
    recomendacion: str  # "comprar", "mantener", "vender"
    justificacion: str
    riesgo: int  # 1-10

agent = Agent(
    model=Claude(id="claude-sonnet-4-5"),
    output_schema=AnalisisStock,
)
resultado = agent.run("Analiza la accion de Tesla")
analisis: AnalisisStock = resultado.content  # Tipado y validado
```

### Despliegue con AgentOS

```python
from agno.os.app import AgentOS
from agno.db.postgres import PostgresDb

db = PostgresDb(host="localhost", db_name="agentes")

app = AgentOS(
    agents=[mi_agente],
    teams=[mi_equipo],
    db=db,
    authorization=True,
)
# Expone REST API + WebSocket en FastAPI
# uvicorn main:app --host 0.0.0.0 --port 8000
```

---

## Estructura del Repositorio

```
agno-agi/agno/
├── libs/agno/agno/              # Codigo fuente principal
│   ├── agent/                   # Agent core (17 archivos, ~696KB)
│   │   ├── agent.py             # Clase Agent (1,714 lineas)
│   │   ├── _run.py              # Motor de ejecucion (4,576 lineas)
│   │   ├── _messages.py         # Construccion de mensajes
│   │   ├── _response.py         # Manejo de respuestas
│   │   └── _storage.py          # Persistencia de sesion
│   ├── team/                    # Multi-agent teams (20 archivos)
│   │   ├── team.py              # Clase Team (1,783 lineas)
│   │   ├── _run.py              # Ejecucion de equipo (6,262 lineas)
│   │   └── mode.py              # TeamMode enum
│   ├── workflow/                # Workflows (12 archivos, ~768KB)
│   │   ├── workflow.py          # Clase Workflow (7,690 lineas)
│   │   ├── step.py              # Step definitions
│   │   ├── router.py            # Enrutamiento dinamico
│   │   ├── loop.py              # Ejecucion iterativa
│   │   ├── parallel.py          # Ejecucion concurrente
│   │   └── condition.py         # Branching condicional
│   ├── models/                  # 47 proveedores LLM
│   ├── tools/                   # 173+ integraciones
│   ├── vectordb/                # 22 vector databases
│   ├── knowledge/               # Sistema RAG
│   ├── db/                      # 13+ storage backends
│   ├── memory/                  # Memory manager
│   ├── reasoning/               # Extended thinking
│   ├── guardrails/              # Safety (PII, inyeccion, moderacion)
│   ├── hooks/                   # Pre/post execution hooks
│   ├── approval/                # Human-in-the-loop approvals
│   ├── eval/                    # Evaluaciones (accuracy, reliability)
│   ├── learn/                   # Learning machine
│   ├── compression/             # Compresion de contexto
│   ├── os/                      # AgentOS (FastAPI runtime)
│   ├── run/                     # RunResponse, eventos, metricas
│   ├── session/                 # Gestion de sesiones
│   └── tracing/                 # Observabilidad
├── cookbook/                     # 1,757 ejemplos organizados
│   ├── 00_quickstart/           # 20 ejemplos esenciales
│   ├── 02_agents/               # 137 ejemplos de agentes
│   ├── 03_teams/                # 127 ejemplos de equipos
│   ├── 04_workflows/            # 18 workflows
│   ├── 05_agent_os/             # 85+ deployment
│   ├── 07_knowledge/            # Patrones RAG
│   └── 90_models/               # 40+ modelos
├── scripts/                     # 21 scripts de automatizacion
└── .github/workflows/           # 8 CI/CD pipelines
```

---

## Siguiente Lectura

1. **[Agent](agent.md)** — Comienza aqui. Aprende todos los parametros del agente.
2. **[Tools](tools.md)** — Explora las 173+ herramientas disponibles.
3. **[Models](models.md)** — Elige entre 47 proveedores de modelos.
4. **[Knowledge](knowledge.md)** — Implementa RAG y memoria persistente.
5. **[Team](team.md)** — Coordina multiples agentes.
6. **[Workflow](workflow.md)** — Orquesta pipelines complejos.
7. **[Guardrails](guardrails.md)** — Seguridad y gobernanza en produccion.
