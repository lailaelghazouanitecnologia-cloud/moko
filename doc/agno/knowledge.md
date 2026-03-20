# Knowledge & Memory - Referencia Completa

> **Archivos fuente**: `libs/agno/agno/knowledge/`, `libs/agno/agno/memory/`, `libs/agno/agno/vectordb/`, `libs/agno/agno/db/`
> [Volver al indice](index.md)

## Descripcion

Agno tiene un sistema integrado de Knowledge (RAG) y Memory que permite a los agentes acceder a bases de conocimiento y recordar informacion entre sesiones.

---

## 1. Knowledge Base (RAG)

### Arquitectura

```
Documentos ──▶ Readers ──▶ Chunking ──▶ Embeddings ──▶ VectorDB ──▶ Busqueda
   │              │           │             │              │
   ├─ PDF         ├─ PDF      ├─ Semantic   ├─ HuggingFace ├─ Similarity
   ├─ DOCX        ├─ DOCX     ├─ Recursive  ├─ OpenAI      ├─ Hybrid (RRF)
   ├─ PPTX        ├─ PPTX     ├─ Agentic    ├─ Google      ├─ Keyword
   ├─ Markdown    ├─ Markdown ├─ Sliding    ├─ Ollama      └─ Reranking
   ├─ CSV/Excel   ├─ CSV        Window      └─ Custom        (Jina, Cohere)
   ├─ Web/URLs    ├─ Web
   └─ YouTube     └─ YouTube
```

### Uso Basico

```python
from agno.knowledge.knowledge import Knowledge
from agno.vectordb.chroma import ChromaDb
from agno.db.sqlite import SqliteDb

# Crear knowledge base
knowledge = Knowledge(
    vector_db=ChromaDb(collection="mis_docs", path="./chroma_db"),
    contents_db=SqliteDb(name="knowledge", db_file="knowledge.db"),
    max_results=10,
)

# Insertar contenido
knowledge.insert(path="./docs/manual.pdf")
knowledge.insert(url="https://ejemplo.com/guia")
knowledge.insert(text_content="Informacion importante sobre el producto...")

# Insertar multiples
knowledge.insert_many(
    paths=["./doc1.pdf", "./doc2.pdf"],
    urls=["https://a.com", "https://b.com"],
    metadata={"proyecto": "mi_app"},
    topics=["documentacion", "guias"],
)

# Usar con agente
agent = Agent(
    model=Claude(id="claude-sonnet-4-5"),
    knowledge=knowledge,
    search_knowledge=True,  # Agente busca cuando necesita
)
```

### Parametros de Knowledge

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `name` | `Optional[str]` | `None` | Nombre de la knowledge base |
| `description` | `Optional[str]` | `None` | Descripcion |
| `vector_db` | `Optional[VectorDb]` | `None` | Base de datos vectorial |
| `contents_db` | `Optional[Union[BaseDb, AsyncBaseDb]]` | `None` | BD para contenido completo |
| `max_results` | `int` | `10` | Resultados maximos por busqueda |
| `readers` | `Optional[Dict[str, Reader]]` | `None` | Lectores custom por tipo de archivo |
| `content_sources` | `Optional[List[BaseStorageConfig]]` | `None` | Fuentes en cloud (S3, GCS, Azure) |
| `isolate_vector_search` | `bool` | `False` | Aislar busquedas a contenido vinculado |

### Parametros de Insert

| Parametro | Tipo | Descripcion |
|-----------|------|-------------|
| `path` | `Optional[str]` | Ruta de archivo local |
| `url` | `Optional[str]` | URL para descargar |
| `text_content` | `Optional[str]` | Texto directo |
| `metadata` | `Optional[Dict]` | Metadata personalizada |
| `topics` | `Optional[List[str]]` | Tags de temas |
| `reader` | `Optional[Reader]` | Lector custom |
| `include` | `Optional[List[str]]` | Patrones glob a incluir |
| `exclude` | `Optional[List[str]]` | Patrones glob a excluir |
| `upsert` | `bool` | Actualizar si existe (default: True) |
| `skip_if_exists` | `bool` | Saltar si ya existe (default: False) |

### Modos de RAG

**Context Injection** (agregar al prompt):
```python
agent = Agent(
    knowledge=knowledge,
    add_knowledge_to_context=True,  # Siempre agrega al prompt
)
```

**Agentic RAG** (el agente decide):
```python
agent = Agent(
    knowledge=knowledge,
    search_knowledge=True,  # El agente busca cuando necesita
)
```

---

## 2. Vector Databases (22)

### Interfaz Base (VectorDb)

| Metodo | Descripcion |
|--------|-------------|
| `create()` | Crear estructura de BD |
| `insert(documents)` | Insertar documentos |
| `upsert(documents)` | Insertar o actualizar |
| `search(query, limit, filters)` | Busqueda semantica |
| `delete(ids)` | Eliminar documentos |
| `drop()` | Eliminar BD completa |
| `exists()` | Verificar existencia |

### Parametros Base

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `id` | `Optional[str]` | auto | ID de la BD vectorial |
| `name` | `Optional[str]` | clase | Nombre |
| `similarity_threshold` | `Optional[float]` | `None` | Umbral de similitud (0.0-1.0) |

### Proveedores Disponibles

| VectorDB | Import | Tipo |
|----------|--------|------|
| **ChromaDB** | `from agno.vectordb.chroma import ChromaDb` | Open source, local/cloud |
| **PGVector** | `from agno.vectordb.pgvector import PgVector` | PostgreSQL extension |
| **Pinecone** | `from agno.vectordb.pinecone import Pinecone` | Cloud managed |
| **Qdrant** | `from agno.vectordb.qdrant import Qdrant` | Open source, cloud |
| **Weaviate** | `from agno.vectordb.weaviate import Weaviate` | Open source, cloud |
| **Milvus** | `from agno.vectordb.milvus import Milvus` | Open source, cloud |
| **LanceDB** | `from agno.vectordb.lancedb import LanceDb` | Serverless |
| **ClickHouse** | `from agno.vectordb.clickhouse import ClickHouse` | OLAP + vectores |
| **Redis** | `from agno.vectordb.redis import Redis` | In-memory |
| **Upstash** | `from agno.vectordb.upstash import Upstash` | Serverless Redis |
| **Neo4j** | `from agno.vectordb.neo4j import Neo4j` | Grafos + vectores |
| **Cassandra** | `from agno.vectordb.cassio import CassandraDb` | Distribuida |
| **Couchbase** | `from agno.vectordb.couchbase import Couchbase` | NoSQL |
| **SingleStore** | `from agno.vectordb.singlestore import SingleStore` | SQL distribuido |
| **SurrealDB** | `from agno.vectordb.surrealdb import SurrealDb` | Multi-model |
| **LangChain** | `from agno.vectordb.langchain import LangChain` | Adaptador LangChain |
| **LlamaIndex** | `from agno.vectordb.llamaindex import LlamaIndex` | Adaptador LlamaIndex |
| **LightRAG** | `from agno.vectordb.lightrag import LightRAG` | RAG ligero |

### Ejemplo con PGVector (Produccion)

```python
from agno.vectordb.pgvector import PgVector

vector_db = PgVector(
    table_name="documentos",
    db_url="postgresql://user:pass@localhost/midb",
    search_type="hybrid",  # similarity + keyword (RRF)
)

knowledge = Knowledge(vector_db=vector_db)
```

---

## 3. Memory Manager

### Descripcion

El `MemoryManager` extrae y almacena hechos sobre el usuario entre sesiones. Distingue entre:
- **Historial de chat** (session storage): Mensajes de la conversacion actual
- **Memorias de usuario** (memory): Hechos persistentes sobre el usuario

### Uso

```python
from agno.memory.manager import MemoryManager
from agno.db.sqlite import SqliteDb

db = SqliteDb(name="mi_app", db_file="app.db")

memory_manager = MemoryManager(
    db=db,
    model=Claude(id="claude-sonnet-4-5"),  # Para procesar memorias
)

agent = Agent(
    model=Claude(id="claude-sonnet-4-5"),
    memory_manager=memory_manager,
    db=db,
    # Opcion 1: El agente decide cuando recordar/almacenar (eficiente)
    enable_agentic_memory=True,
    # Opcion 2: Siempre captura memorias (garantizado, mayor costo)
    # update_memory_on_run=True,
)

# Primera sesion
agent.print_response("Me llamo Ana, trabajo en marketing digital", user_id="ana")

# Segunda sesion - recuerda a Ana
agent.print_response("Que sabes sobre mi?", user_id="ana")
```

### Parametros de MemoryManager

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `model` | `Optional[Model]` | OpenAI gpt-4o | Modelo para procesamiento de memorias |
| `db` | `Optional[Union[BaseDb, AsyncBaseDb]]` | `None` | BD para almacenar memorias |
| `system_message` | `Optional[str]` | `None` | System prompt custom |
| `memory_capture_instructions` | `Optional[str]` | `None` | Instrucciones de captura |
| `additional_instructions` | `Optional[str]` | `None` | Instrucciones adicionales |
| `delete_memories` | `bool` | `True` | Permitir borrar memorias |
| `clear_memories` | `bool` | `True` | Permitir limpiar todas |
| `update_memories` | `bool` | `True` | Permitir actualizar |
| `add_memories` | `bool` | `True` | Permitir agregar nuevas |
| `debug_mode` | `bool` | `False` | Modo debug |

### Metodos de MemoryManager

| Metodo | Descripcion |
|--------|-------------|
| `get_user_memories(user_id)` | Obtener todas las memorias del usuario |
| `add_user_memory(user_id, memory)` | Agregar nueva memoria |
| `replace_user_memory(user_id, id, memory)` | Reemplazar memoria existente |
| `delete_user_memory(user_id, id)` | Eliminar memoria especifica |
| `clear_user_memories(user_id)` | Limpiar todas las memorias |

---

## 4. Learning Machine

### Descripcion

El `LearningMachine` permite a los agentes mejorar continuamente basado en interacciones. Soporta multiples tipos de "stores" para diferentes tipos de aprendizaje.

### Stores Disponibles

| Store | Descripcion |
|-------|-------------|
| `UserProfile` | Preferencias y caracteristicas del usuario |
| `UserMemory` | Historial de interacciones persistente |
| `SessionContext` | Estado de sesion actual |
| `EntityMemory` | Conocimiento sobre entidades externas (personas, empresas) |
| `LearnedKnowledge` | Insights reutilizables (auto-habilitado con knowledge base) |

### Uso

```python
from agno.learn.machine import LearningMachine

learning = LearningMachine(
    db=db,
    model=Claude(id="claude-sonnet-4-5"),
    user_profile=True,
    entity_memory=True,
    learned_knowledge=True,
)

agent = Agent(
    model=Claude(id="claude-sonnet-4-5"),
    learning=learning,
    add_learnings_to_context=True,
    db=db,
)
```

---

## 5. Storage Backends (13+)

### Interfaz Base (BaseDb)

| Tabla | Default | Descripcion |
|-------|---------|-------------|
| `session_table` | `agno_sessions` | Sesiones de agente/equipo |
| `memory_table` | `agno_memories` | Memorias de usuario |
| `knowledge_table` | `agno_knowledge` | Contenido de knowledge |
| `metrics_table` | `agno_metrics` | Metricas de ejecucion |
| `eval_table` | `agno_eval_runs` | Resultados de evaluaciones |
| `traces_table` | `agno_traces` | Datos de tracing |
| `learnings_table` | `agno_learnings` | Aprendizajes |
| `approvals_table` | `agno_approvals` | Aprobaciones HITL |
| `schedules_table` | `agno_schedules` | Programaciones |

### Proveedores Disponibles

| Backend | Import | Descripcion |
|---------|--------|-------------|
| **SQLite** | `from agno.db.sqlite import SqliteDb` | Desarrollo local |
| **PostgreSQL** | `from agno.db.postgres import PostgresDb` | Produccion SQL |
| **MySQL** | `from agno.db.mysql import MySQLDb` | SQL relacional |
| **MongoDB** | `from agno.db.mongo import MongoDb` | NoSQL documentos |
| **DynamoDB** | `from agno.db.dynamodb import DynamoDb` | AWS serverless |
| **Firestore** | `from agno.db.firestore import FirestoreDb` | Google Cloud |
| **Redis** | `from agno.db.redis import RedisDb` | In-memory cache |
| **SingleStore** | `from agno.db.singlestore import SingleStoreDb` | SQL distribuido |
| **SurrealDB** | `from agno.db.surrealdb import SurrealDb` | Multi-model |
| **GCS** | `from agno.db.gcs import GCSDb` | Google Cloud Storage |
| **JSON File** | `from agno.db.json import JsonDb` | Archivo JSON local |
| **In-Memory** | `from agno.db.memory import MemoryDb` | Solo testing |

### Ejemplo Produccion (PostgreSQL)

```python
from agno.db.postgres import PostgresDb

db = PostgresDb(
    host="localhost",
    port=5432,
    db_name="mi_app",
    user="usuario",
    password="secreto",
)

agent = Agent(
    model=Claude(id="claude-sonnet-4-5"),
    db=db,
    memory_manager=MemoryManager(db=db),
    add_history_to_context=True,
)
```

### Async Support

Todos los backends tienen versiones async:

```python
from agno.db.postgres import AsyncPostgresDb
from agno.db.sqlite import AsyncSqliteDb
from agno.db.mongo import AsyncMongoDb
```
