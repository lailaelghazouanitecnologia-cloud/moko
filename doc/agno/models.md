# Models - Referencia Completa

> **Archivo fuente**: `libs/agno/agno/models/base.py` + 47 proveedores
> [Volver al indice](index.md)

## Descripcion

El sistema de modelos de Agno abstrae 47 proveedores de LLM bajo una interfaz comun. Cada modelo hereda de `Model` (ABC) y puede ser usado en Agent, Team, o Workflow.

---

## Modelo Base (Model ABC)

### Parametros Comunes a Todos los Modelos

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `id` | `str` | - | Identificador del modelo (ej: `"claude-sonnet-4-5"`, `"gpt-4o"`) |
| `name` | `Optional[str]` | `None` | Nombre para display |
| `provider` | `Optional[str]` | `None` | Nombre del proveedor |
| `model_type` | `ModelType` | `MODEL` | Rol: `MODEL`, `OUTPUT_MODEL`, `PARSER_MODEL` |
| `supports_native_structured_outputs` | `bool` | - | Soporte nativo de structured outputs |
| `supports_json_schema_outputs` | `bool` | - | Soporte de JSON schema |

### Cache de Respuestas

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `cache_response` | `bool` | `False` | Cachear respuestas (para desarrollo) |
| `cache_ttl` | `Optional[int]` | `None` | TTL del cache en segundos |
| `cache_dir` | `Optional[str]` | `None` | Directorio del cache |

### Reintentos

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `retries` | `int` | `0` | Reintentos en ModelProviderError |
| `delay_between_retries` | `int` | `1` | Delay entre reintentos (segundos) |
| `exponential_backoff` | `bool` | `False` | Backoff exponencial |
| `retry_with_guidance` | `bool` | `True` | Reintentar con mensajes guia en errores conocidos |
| `retry_with_guidance_limit` | `int` | `1` | Maximo reintentos con guia |

### Roles

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `tool_message_role` | `str` | `"tool"` | Rol para mensajes de tool |
| `assistant_message_role` | `str` | `"assistant"` | Rol para mensajes del asistente |

### Metodos Principales

| Metodo | Descripcion |
|--------|-------------|
| `invoke(messages, tools)` | Invocacion sincrona |
| `ainvoke(messages, tools)` | Invocacion asincrona |
| `invoke_stream(messages, tools)` | Streaming sincrono |
| `ainvoke_stream(messages, tools)` | Streaming asincrono |
| `count_tokens(messages)` | Conteo de tokens |

---

## Proveedores de Modelos (47)

### Tier 1 - Principales

#### Anthropic (Claude)

```python
from agno.models.anthropic import Claude

model = Claude(id="claude-sonnet-4-5")
```

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `id` | `str` | `"claude-sonnet-4-5-20250929"` | ID del modelo |
| `max_tokens` | `Optional[int]` | `8192` | Tokens maximos de salida |
| `temperature` | `Optional[float]` | `None` | Temperatura |
| `top_p` | `Optional[float]` | `None` | Top-p sampling |
| `top_k` | `Optional[int]` | `None` | Top-k sampling |
| `stop_sequences` | `Optional[List[str]]` | `None` | Secuencias de parada |
| `thinking` | `Optional[Dict]` | `None` | Configuracion de extended thinking |
| `cache_system_prompt` | `Optional[bool]` | `False` | Cachear system prompt |
| `extended_cache_time` | `Optional[bool]` | `False` | TTL extendido de cache |
| `betas` | `Optional[List[str]]` | `None` | Feature flags experimentales |
| `mcp_servers` | `Optional[List[MCPServerConfiguration]]` | `None` | Servidores MCP |
| `api_key` | `Optional[str]` | env `ANTHROPIC_API_KEY` | API key |
| `timeout` | `Optional[float]` | `None` | Timeout de request |

#### OpenAI

```python
from agno.models.openai import OpenAIChat

model = OpenAIChat(id="gpt-4o")
```

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `id` | `str` | `"gpt-4o"` | ID del modelo |
| `temperature` | `Optional[float]` | `None` | Temperatura (0-2) |
| `max_tokens` | `Optional[int]` | `None` | Tokens maximos |
| `max_completion_tokens` | `Optional[int]` | `None` | Tokens de completacion |
| `frequency_penalty` | `Optional[float]` | `None` | Penalizacion de frecuencia (-2 a 2) |
| `presence_penalty` | `Optional[float]` | `None` | Penalizacion de presencia (-2 a 2) |
| `seed` | `Optional[int]` | `None` | Seed para reproducibilidad |
| `stop` | `Optional[Union[str, List[str]]]` | `None` | Secuencias de parada |
| `reasoning_effort` | `Optional[str]` | `None` | Nivel de razonamiento (modelos o1) |
| `modalities` | `Optional[List[str]]` | `None` | Modalidades: `["text"]`, `["text", "audio"]` |
| `audio` | `Optional[Dict]` | `None` | Config de audio (voz, formato) |
| `store` | `Optional[bool]` | `None` | Almacenar requests |
| `service_tier` | `Optional[str]` | `None` | `"auto"`, `"default"`, `"flex"`, `"priority"` |
| `strict_output` | `bool` | `True` | Forzar adherencia al schema |
| `api_key` | `Optional[str]` | env `OPENAI_API_KEY` | API key |
| `organization` | `Optional[str]` | `None` | Organization ID |
| `base_url` | `Optional[str]` | `None` | Endpoint custom |

#### Google Gemini

```python
from agno.models.google import Gemini

model = Gemini(id="gemini-2.0-flash")
```

### Tier 2 - Cloud & Enterprise

| Proveedor | Import | ID ejemplo | Descripcion |
|-----------|--------|------------|-------------|
| **AWS Bedrock** | `from agno.models.aws import BedrockChat` | `"anthropic.claude-3-5-sonnet"` | Claude y otros via AWS |
| **Azure OpenAI** | `from agno.models.azure import AzureOpenAIChat` | `"gpt-4o"` | OpenAI via Azure |
| **Azure AI Foundry** | `from agno.models.azure import AzureAIFoundry` | - | Azure AI platform |
| **Vertex AI** | `from agno.models.vertexai import VertexAIClaude` | `"claude-sonnet-4-5"` | Claude via Google Cloud |
| **IBM WatsonX** | `from agno.models.ibm import WatsonX` | - | IBM AI platform |

### Tier 3 - Especializados

| Proveedor | Import | Descripcion |
|-----------|--------|-------------|
| **Groq** | `from agno.models.groq import Groq` | LPU ultra-rapido |
| **Mistral** | `from agno.models.mistral import MistralChat` | Modelos Mistral |
| **DeepSeek** | `from agno.models.deepseek import DeepSeek` | DeepSeek R1/V3 |
| **Cohere** | `from agno.models.cohere import CohereChat` | Command R+ |
| **Perplexity** | `from agno.models.perplexity import Perplexity` | Search-augmented |
| **xAI** | `from agno.models.xai import xAI` | Grok |
| **Meta Llama** | `from agno.models.meta import Llama` | Llama 3.x |
| **Cerebras** | `from agno.models.cerebras import Cerebras` | Hardware IA |

### Tier 4 - Open Source / Self-hosted

| Proveedor | Import | Descripcion |
|-----------|--------|-------------|
| **Ollama** | `from agno.models.ollama import OllamaChat` | Modelos locales |
| **LMStudio** | `from agno.models.lmstudio import LMStudio` | GUI para modelos locales |
| **Llama.cpp** | `from agno.models.llama_cpp import LlamaCpp` | Inferencia C++ local |
| **vLLM** | `from agno.models.vllm import vLLM` | Servidor de inferencia |
| **HuggingFace** | `from agno.models.huggingface import HuggingFace` | Hub de modelos |

### Tier 5 - Plataformas de Enrutamiento

| Proveedor | Import | Descripcion |
|-----------|--------|-------------|
| **OpenRouter** | `from agno.models.openrouter import OpenRouter` | Multi-proveedor |
| **Together** | `from agno.models.together import Together` | Modelos open-source en cloud |
| **Fireworks** | `from agno.models.fireworks import Fireworks` | Inferencia rapida |
| **LiteLLM** | `from agno.models.litellm import LiteLLM` | Proxy unificado |
| **Portkey** | `from agno.models.portkey import Portkey` | Gateway de IA |
| **DeepInfra** | `from agno.models.deepinfra import DeepInfra` | Inferencia serverless |
| **SambaNova** | `from agno.models.sambanova import SambaNova` | Hardware custom |

### Tier 6 - Regionales

| Proveedor | Import | Descripcion |
|-----------|--------|-------------|
| **DashScope** | `from agno.models.dashscope import DashScope` | Alibaba Cloud (Qwen) |
| **InternLM** | `from agno.models.internlm import InternLM` | Shanghai AI Lab |
| **Moonshot** | `from agno.models.moonshot import Moonshot` | Kimi (China) |
| **SiliconFlow** | `from agno.models.siliconflow import SiliconFlow` | China cloud |
| **Nebius** | `from agno.models.nebius import Nebius` | Russia/global |

### Tier 7 - Otros

| Proveedor | Import |
|-----------|--------|
| **NVIDIA** | `from agno.models.nvidia import Nvidia` |
| **LangDB** | `from agno.models.langdb import LangDB` |
| **CometAPI** | `from agno.models.cometapi import CometAPI` |
| **AIML API** | `from agno.models.aimlapi import AIMLAPI` |
| **Requesty** | `from agno.models.requesty import Requesty` |
| **Nexus** | `from agno.models.nexus import Nexus` |
| **N1N** | `from agno.models.n1n import N1N` |
| **Vercel** | `from agno.models.vercel import V0` |

---

## Patron Multi-Modelo

Agno permite usar multiples modelos en un solo agente:

```python
agent = Agent(
    model=Claude(id="claude-sonnet-4-5"),           # Modelo principal
    reasoning_model=Claude(id="claude-opus-4-5"),    # Para razonamiento
    parser_model=OpenAIChat(id="gpt-4o-mini"),       # Para parsear respuestas
    output_model=OpenAIChat(id="gpt-4o"),            # Para estructurar output
)
```

---

## OpenAI-Compatible (Like)

Para cualquier API compatible con OpenAI:

```python
from agno.models.openai import OpenAILike

model = OpenAILike(
    id="my-custom-model",
    base_url="https://mi-api.com/v1",
    api_key="mi-key",
)
```
