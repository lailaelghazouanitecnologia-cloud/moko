# Tools - Catalogo Completo

> **Directorio fuente**: `libs/agno/agno/tools/` (173+ archivos)
> [Volver al indice](index.md)

## Descripcion

Agno incluye 173+ integraciones de herramientas listas para usar. Las herramientas se basan en la clase `Toolkit` y se registran automaticamente para ser usadas por los agentes.

---

## Crear Tools Custom

### Metodo 1: Funcion simple

```python
from agno.agent import Agent

def obtener_clima(ciudad: str) -> str:
    """Obtiene el clima actual de una ciudad.

    Args:
        ciudad: Nombre de la ciudad.

    Returns:
        Descripcion del clima.
    """
    return f"El clima en {ciudad} es soleado, 25°C"

agent = Agent(tools=[obtener_clima])
```

### Metodo 2: Decorador @tool

```python
from agno.tools.decorator import tool

@tool(
    show_result=True,
    stop_after_tool_call=False,
    cache_results=True,
    cache_ttl=3600,
)
def calcular_hipoteca(monto: float, tasa: float, anos: int) -> str:
    """Calcula el pago mensual de una hipoteca."""
    r = tasa / 100 / 12
    n = anos * 12
    pago = monto * (r * (1 + r)**n) / ((1 + r)**n - 1)
    return f"Pago mensual: ${pago:,.2f}"
```

### Metodo 3: Toolkit (clase)

```python
from agno.tools.toolkit import Toolkit

class MiAPITools(Toolkit):
    def __init__(self, api_key: str):
        super().__init__(name="mi_api")
        self.api_key = api_key
        self.register(self.buscar)
        self.register(self.crear)

    def buscar(self, query: str) -> str:
        """Busca en mi API."""
        # implementacion...
        return resultado

    def crear(self, nombre: str, datos: dict) -> str:
        """Crea un recurso en mi API."""
        # implementacion...
        return resultado
```

---

## Toolkit Base - Parametros

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `name` | `str` | `"toolkit"` | Nombre del toolkit |
| `tools` | `Sequence[Union[Callable, Function]]` | `[]` | Lista de herramientas |
| `instructions` | `Optional[str]` | `None` | Instrucciones del toolkit |
| `add_instructions` | `bool` | `False` | Agregar instrucciones al system message |
| `include_tools` | `Optional[list[str]]` | `None` | Whitelist de nombres de tools |
| `exclude_tools` | `Optional[list[str]]` | `None` | Blacklist de nombres de tools |
| `requires_confirmation_tools` | `Optional[list[str]]` | `None` | Tools que requieren confirmacion |
| `external_execution_required_tools` | `Optional[list[str]]` | `None` | Tools de ejecucion externa |
| `stop_after_tool_call_tools` | `Optional[List[str]]` | `None` | Tools que detienen al agente |
| `show_result_tools` | `Optional[List[str]]` | `None` | Tools con resultado visible |
| `cache_results` | `bool` | `False` | Cachear resultados |
| `cache_ttl` | `int` | `3600` | TTL del cache (segundos) |
| `cache_dir` | `Optional[str]` | `None` | Directorio del cache |

---

## Function - Parametros

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `name` | `str` | - | Nombre (a-z, 0-9, _, -; max 64 chars) |
| `description` | `Optional[str]` | `None` | Descripcion para el modelo |
| `parameters` | `Dict` | `{}` | JSON Schema de parametros |
| `entrypoint` | `Optional[Callable]` | `None` | Funcion a ejecutar |
| `show_result` | `bool` | `False` | Mostrar resultado al usuario |
| `stop_after_tool_call` | `bool` | `False` | Detener agente despues |
| `pre_hook` | `Optional[Callable]` | `None` | Hook antes de ejecucion |
| `post_hook` | `Optional[Callable]` | `None` | Hook despues de ejecucion |
| `requires_confirmation` | `Optional[bool]` | `None` | Requiere confirmacion del usuario |
| `requires_user_input` | `Optional[bool]` | `None` | Requiere input del usuario |
| `external_execution` | `Optional[bool]` | `None` | Ejecucion externa al loop |
| `approval_type` | `Optional[str]` | `None` | `"required"` (bloquea) o `"audit"` (no bloquea) |
| `cache_results` | `bool` | `False` | Cachear resultados |
| `cache_ttl` | `int` | `3600` | TTL del cache |

---

## Catalogo de Tools (173+)

### Busqueda Web y Crawling

| Tool | Import | Descripcion |
|------|--------|-------------|
| **DuckDuckGo** | `from agno.tools.duckduckgo import DuckDuckGoTools` | Busqueda web gratuita sin API key |
| **Brave Search** | `from agno.tools.bravesearch import BraveSearchTools` | Busqueda web con API |
| **Tavily** | `from agno.tools.tavily import TavilyTools` | Busqueda optimizada para IA |
| **Exa** | `from agno.tools.exa import ExaTools` | Busqueda semantica |
| **SearXNG** | `from agno.tools.searxng import SearxngTools` | Meta-buscador open source |
| **Serper** | `from agno.tools.serper import SerperTools` | Google Search API |
| **SerpAPI** | `from agno.tools.serpapi import SerpAPITools` | Multiples motores de busqueda |
| **Perplexity** | `from agno.tools.perplexity import PerplexityTools` | Busqueda con IA |
| **Jina** | `from agno.tools.jina import JinaTools` | Busqueda neural |
| **Firecrawl** | `from agno.tools.firecrawl import FirecrawlTools` | Web crawling avanzado |
| **Crawl4AI** | `from agno.tools.crawl4ai import Crawl4AITools` | Crawling para IA |
| **Trafilatura** | `from agno.tools.trafilatura import TrafilaturaTools` | Extraccion de texto web |
| **Newspaper4k** | `from agno.tools.newspaper4k import Newspaper4kTools` | Extraccion de articulos |
| **Newspaper** | `from agno.tools.newspaper import NewspaperTools` | Lectura de noticias |
| **AgentQL** | `from agno.tools.agentql import AgentQLTools` | Queries inteligentes en web |
| **Browserbase** | `from agno.tools.browserbase import BrowserbaseTools` | Navegador cloud |
| **BrightData** | `from agno.tools.brightdata import BrightDataTools` | Proxy y scraping |
| **Oxylabs** | `from agno.tools.oxylabs import OxylabsTools` | Proxy y scraping |
| **Apify** | `from agno.tools.apify import ApifyTools` | Automatizacion web |
| **ScapeGraph** | `from agno.tools.scrapegraph import ScapeGraphTools` | Scraping con IA |
| **Spider** | `from agno.tools.spider import SpiderTools` | Web spider |
| **Linkup** | `from agno.tools.linkup import LinkupTools` | Link analysis |
| **Baidu** | `from agno.tools.baidusearch import BaiduSearchTools` | Busqueda Baidu |

### Desarrollo y DevOps

| Tool | Import | Descripcion |
|------|--------|-------------|
| **GitHub** | `from agno.tools.github import GitHubTools` | Repos, PRs, issues |
| **GitLab** | `from agno.tools.gitlab import GitLabTools` | Repos, MRs, pipelines |
| **Bitbucket** | `from agno.tools.bitbucket import BitbucketTools` | Repos, PRs |
| **Docker** | `from agno.tools.docker import DockerTools` | Containers, images |
| **Shell** | `from agno.tools.shell import ShellTools` | Comandos de shell |
| **Coding** | `from agno.tools.coding import CodingTools` | Ejecucion de codigo |
| **Python** | `from agno.tools.python import PythonTools` | Ejecucion Python |
| **E2B** | `from agno.tools.e2b import E2BTools` | Sandbox de codigo |
| **Daytona** | `from agno.tools.daytona import DaytonaTools` | Entornos de desarrollo |

### Datos y Bases de Datos

| Tool | Import | Descripcion |
|------|--------|-------------|
| **DuckDB** | `from agno.tools.duckdb import DuckDbTools` | SQL analitico |
| **PostgreSQL** | `from agno.tools.postgres import PostgresTools` | Base de datos relacional |
| **SQL** | `from agno.tools.sql import SQLTools` | SQL generico |
| **Redshift** | `from agno.tools.redshift import RedshiftTools` | AWS data warehouse |
| **BigQuery** | `from agno.tools.google.bigquery import BigQueryTools` | Google data warehouse |
| **Pandas** | `from agno.tools.pandas import PandasTools` | DataFrames |
| **CSV** | `from agno.tools.csv_toolkit import CSVTools` | Archivos CSV |
| **Neo4j** | `from agno.tools.neo4j import Neo4jTools` | Base de datos grafos |

### Comunicacion

| Tool | Import | Descripcion |
|------|--------|-------------|
| **Email** | `from agno.tools.email import EmailTools` | Email generico |
| **Gmail** | `from agno.tools.gmail import GmailTools` | Google Gmail |
| **Slack** | `from agno.tools.slack import SlackTools` | Messaging |
| **Discord** | `from agno.tools.discord import DiscordTools` | Chat |
| **Telegram** | `from agno.tools.telegram import TelegramTools` | Messaging |
| **WhatsApp** | `from agno.tools.whatsapp import WhatsAppTools` | Messaging |
| **Twilio** | `from agno.tools.twilio import TwilioTools` | SMS/Voice |
| **Resend** | `from agno.tools.resend import ResendTools` | Email API |
| **AWS SES** | `from agno.tools.aws_ses import AWSSESTools` | Amazon email |

### Productividad

| Tool | Import | Descripcion |
|------|--------|-------------|
| **Jira** | `from agno.tools.jira import JiraTools` | Project management |
| **Linear** | `from agno.tools.linear import LinearTools` | Issue tracking |
| **ClickUp** | `from agno.tools.clickup import ClickUpTools` | Project management |
| **Notion** | `from agno.tools.notion import NotionTools` | Wiki/docs |
| **Confluence** | `from agno.tools.confluence import ConfluenceTools` | Wiki empresarial |
| **Trello** | `from agno.tools.trello import TrelloTools` | Kanban boards |
| **Asana** | `from agno.tools.asana import AsanaTools` | Project management |
| **Todoist** | `from agno.tools.todoist import TodoistTools` | Tareas |

### Google Suite

| Tool | Import | Descripcion |
|------|--------|-------------|
| **Google Calendar** | `from agno.tools.google.calendar import GoogleCalendarTools` | Calendario |
| **Google Drive** | `from agno.tools.google.drive import GoogleDriveTools` | Almacenamiento |
| **Google Sheets** | `from agno.tools.google.sheets import GoogleSheetsTools` | Hojas de calculo |
| **Google Maps** | `from agno.tools.google.maps import GoogleMapsTools` | Mapas y ubicacion |
| **Google Gmail** | `from agno.tools.google.gmail import GoogleGmailTools` | Email |

### Multimedia y Contenido

| Tool | Import | Descripcion |
|------|--------|-------------|
| **YouTube** | `from agno.tools.youtube import YouTubeTools` | Transcripciones |
| **Spotify** | `from agno.tools.spotify import SpotifyTools` | Musica |
| **DALL-E** | `from agno.tools.dalle import DallETools` | Generacion de imagenes |
| **FAL** | `from agno.tools.fal import FalTools` | Modelos generativos |
| **ElevenLabs** | `from agno.tools.eleven_labs import ElevenLabsTools` | Text-to-speech |
| **MoviePy** | `from agno.tools.moviepy_video import MoviePyTools` | Procesamiento video |
| **OpenCV** | `from agno.tools.opencv import OpenCVTools` | Vision por computador |
| **Giphy** | `from agno.tools.giphy import GiphyTools` | GIFs |
| **Unsplash** | `from agno.tools.unsplash import UnsplashTools` | Fotos stock |
| **Luma** | `from agno.tools.lumalab import LumaLabTools` | Video IA |
| **Replicate** | `from agno.tools.replicate import ReplicateTools` | ML models |
| **Cartesia** | `from agno.tools.cartesia import CartesiaTools` | Voz |

### Investigacion y Conocimiento

| Tool | Import | Descripcion |
|------|--------|-------------|
| **ArXiv** | `from agno.tools.arxiv import ArxivTools` | Papers academicos |
| **PubMed** | `from agno.tools.pubmed import PubMedTools` | Papers medicos |
| **Wikipedia** | `from agno.tools.wikipedia import WikipediaTools` | Enciclopedia |
| **Reddit** | `from agno.tools.reddit import RedditTools` | Foros |
| **HackerNews** | `from agno.tools.hackernews import HackerNewsTools` | Tech news |
| **X (Twitter)** | `from agno.tools.x import XTools` | Red social |

### Finanzas

| Tool | Import | Descripcion |
|------|--------|-------------|
| **YFinance** | `from agno.tools.yfinance import YFinanceTools` | Datos de acciones |
| **OpenBB** | `from agno.tools.openbb import OpenBBTools` | Terminal financiero |
| **Financial Datasets** | `from agno.tools.financial_datasets import FinancialDatasetsTools` | Datasets financieros |

### Archivos y Almacenamiento

| Tool | Import | Descripcion |
|------|--------|-------------|
| **File** | `from agno.tools.file import FileTools` | Operaciones de archivo |
| **Local FS** | `from agno.tools.local_file_system import LocalFileSystemTools` | Sistema de archivos local |
| **AWS Lambda** | `from agno.tools.aws_lambda import AWSLambdaTools` | Funciones serverless |

### Protocolos de Interoperabilidad

| Tool | Import | Descripcion |
|------|--------|-------------|
| **MCP** | `from agno.tools.mcp import MCPTools` | Model Context Protocol |
| **Multi MCP** | `from agno.tools.mcp import MultiMCPTools` | Multiples servidores MCP |
| **MCP Toolbox** | `from agno.tools.mcp_toolbox import MCPToolboxTools` | MCP toolbox |

```python
# Ejemplo MCP
from agno.tools.mcp import MCPTools

async with MCPTools("npx -y @modelcontextprotocol/server-github") as mcp:
    agent = Agent(tools=[mcp])
    await agent.aprint_response("Lista mis repos")
```

### Utilidades

| Tool | Import | Descripcion |
|------|--------|-------------|
| **Calculator** | `from agno.tools.calculator import CalculatorTools` | Calculos matematicos |
| **Weather** | `from agno.tools.openweather import OpenWeatherTools` | Clima |
| **Sleep** | `from agno.tools.sleep import SleepTools` | Delay/espera |
| **Reasoning** | `from agno.tools.reasoning import ReasoningTools` | Razonamiento |
| **Knowledge** | `from agno.tools.knowledge import KnowledgeTools` | Busqueda en knowledge |
| **Memory** | `from agno.tools.memory import MemoryTools` | Gestion de memoria |
| **Visualization** | `from agno.tools.visualization import VisualizationTools` | Graficos |
| **BrandFetch** | `from agno.tools.brandfetch import BrandfetchTools` | Datos de marcas |
| **Cal.com** | `from agno.tools.calcom import CalComTools` | Scheduling |

### Blockchain

| Tool | Import | Descripcion |
|------|--------|-------------|
| **EVM** | `from agno.tools.evm import EVMTools` | Ethereum/EVM |

### E-commerce y CRM

| Tool | Import | Descripcion |
|------|--------|-------------|
| **Shopify** | `from agno.tools.shopify import ShopifyTools` | E-commerce |
| **Zendesk** | `from agno.tools.zendesk import ZendeskTools` | Soporte al cliente |

---

## Tools Factory (Dinamico)

Asignar tools por usuario/sesion:

```python
def tools_por_rol(context: RunContext) -> List:
    if context.session_state.get("rol") == "admin":
        return [ShellTools(), GitHubTools(), DuckDbTools()]
    return [DuckDuckGoTools()]  # solo busqueda

agent = Agent(tools=tools_por_rol)
```
