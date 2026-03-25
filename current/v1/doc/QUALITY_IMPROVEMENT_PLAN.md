# QualityEngine — Plan de Mejora Completa

**Engine**: `src/agent/engines/quality/` · 5,809 LOC · 10 archivos
**Fecha**: 2026-03-25

---

## Estado Actual

```
Codigo TS
    │
    ▼
Layer 0: Feature extraction     → 37 metricas via regex (metrics.py)
Layer 1: Issue detection         → 11 tipos de issues (quality_features.py)
Layer 2: Classification          → arbol decision → DB lookup → reglas (quality_classifier.py)
Layer 3: Auto-fix                → 7 estrategias 0-token (quality_strategies.py)
Layer 4: LLM fix                 → solo issues criticos que sobreviven L0-L2
    │
    ▼
Learning loop: cada fix → .quality_db.jsonl → retrain a 30+ records
```

Stores por proyecto:
```
proyecto/
├── .quality_db.jsonl       ← learning DB (issues + acciones + resultados)
├── .style_profile.json     ← preferencias de estilo (27 dimensiones)
└── .learned_scorer.json    ← pesos de scoring vs referencia (52 dims)
```

---

## Problemas Identificados

### P1 — Aprendizaje en silos (critico)

Cada proyecto tiene su propio `.quality_db.jsonl`. Conocimiento de proyecto A
nunca beneficia a proyecto B. En el proyecto 50, el clasificador sigue
empezando con reglas hardcodeadas hasta acumular 30 records locales.

### P2 — Quality delta hardcodeado (corregido parcialmente)

Corregido en el commit anterior: `improve_module()` ahora mide delta real.
Pero el `StrategyResult` actual no reporta si la estrategia aplico algo.

### P3 — Strategies no reportan si aplicaron algo

`_apply_auto_fix()` devuelve `Optional[StrategyResult]` pero no distingue
entre "aplique 5 cambios" y "no pude aplicar nada". El clasificador aprende
`success=True` para fixes que no hicieron nada.

### P4 — KNN O(n) sin indice

`find_similar()` calcula distancia contra TODOS los records. Con store global
acumulando miles de records, bottleneck real en hot path.

### P5 — StyleProfile empieza neutro

Existen StyleProfiles en `.pi.yaml` de 23 proyectos de referencia. El primer
run podria inicializar desde la referencia mas cercana.

### P6 — QualityEngine re-parsea lo que LiveIndex ya tiene

`extractor.extract(code)` re-parsea cada archivo. LiveIndex (in-memory) ya
tiene type_registry, call_graph, export_map.

### P7 — Metricas sin contexto de modulo

37 metricas son todas a nivel archivo. No hay module_role, consumers_count,
dependency_depth. Un `any` en types/ es diferente a uno en services/.

### P8 — Sin schema versioning en la DB

Anadir campo a QualityRecord rompe deserializacion de records anteriores.

### P9 — improve_module() no devuelve nada util

No hay observabilidad: cuantos issues, cuantos resueltos, que estrategias,
que archivos mejoraron.

---

## Plan de Cambios

### Semana 1: Senal limpia + observabilidad

#### Cambio 1 — StrategyResult con applied/changes

Refactorizar `StrategyResult` para que reporte:
- `applied: bool` — si la estrategia realmente modifico codigo
- `changes: list[str]` — descripciones de los cambios
- `lines_modified: int`

Todas las 7 strategies retornan `StrategyResult` con informacion real.
Si `applied=False` repetidamente → escalar a `prompt_hint`.

**Archivos**: `quality_strategies.py`

#### Cambio 2 — Delta real completo

Conectar `StrategyResult.applied` con el recording en global DB.
`score_before` y `score_after` medidos en cada fix.
`applied=False` → `quality_delta=0, applied=0` en el record.

**Archivos**: `__init__.py`

#### Cambio 3 — ImprovementReport

Nuevo dataclass que `improve_module()` retorna con observabilidad:
- score_before/after, delta
- issues detectados/resueltos por tipo
- auto_fixes applied/failed por estrategia
- escalations a LLM
- tokens usados
- archivos mejorados/sin cambios

**Archivos**: `__init__.py`

### Semana 2: Global store + cross-project

#### Cambio 4 — GlobalQualityDB (SQLite)

Nuevo archivo `global_db.py` con SQLite en `data/quality/global.db`.

Schema con: schema_version, project_name, issue_type, severity,
features (JSON), module_role, consumers_count, dependency_depth,
action, strategy, applied, score_before, score_after, quality_delta,
tokens_used, corrected, timestamp, run_id.

Indices por issue_type, project, timestamp.
Vista `training_records` para entrenar classifier.

JSONL local se mantiene como audit log.

**Archivos**: `global_db.py` (NUEVO)

#### Cambio 5 — Migracion JSONL → SQLite

`migrate_from_jsonl()` importa records existentes. Records v1
(delta hardcodeado 0.1/0.2) se migran con delta=0.05 (senal debil).

**Archivos**: `global_db.py`

#### Cambio 9 — Cross-project classifier

Classifier entrena con TODOS los records del global store.
Re-entrena cuando 50+ nuevos records o 7+ dias desde ultimo training.
Prediccion: tree global → KNN global → reglas fallback.

**Archivos**: `quality_classifier.py`

### Semana 3: Contexto + integracion

#### Cambio 6 — ModuleContextMetrics

Nuevo archivo `context_metrics.py` con:
- `ModuleContextMetrics`: module_role, consumers_count, dependency_depth,
  is_entry_point, exports_count, imports_count, is_barrel
- `infer_module_role()`: desde path sin LiveIndex
- `extract_context_metrics()`: desde LiveIndex si disponible, degradacion elegante

QualityFeatures gana 3 campos: module_role, consumers_count, dependency_depth.

**Archivos**: `context_metrics.py` (NUEVO), `quality_features.py`

#### Cambio 7 — LiveIndex integration

QualityEngine recibe `context_engine` opcional. Cuando disponible:
- Consulta type_registry para poor_encapsulation mas precisa
- Verifica accesos externos reales antes de flaggear public fields
- Prioriza issues por consumers_count

**Archivos**: `__init__.py`

#### Cambio 8 — StyleProfile desde referencia

`StyleProfile.from_project_intelligence()` inicializa desde `.pi.yaml`
con confianza inicial 0.3. Mapea reference/StyleProfile → quality/StyleProfile.

**Archivos**: `style_profile.py`

#### Cambio 10 — KNN decay temporal

En `global_db.find_similar()`: filtro por issue_type (O(n_type) vs O(n)),
decay exponencial con half-life 90 dias. Records recientes pesan mas.

**Archivos**: `global_db.py`

---

## Orden de Implementacion

```
Semana 1:  1 → 2 → 3     (senal limpia + observabilidad)
Semana 2:  4 → 5 → 9     (global store + cross-project learning)
Semana 3:  6 → 7 → 8 → 10 (contexto + integracion + adaptacion)
```

| # | Cambio | Prereq | Esfuerzo | Impacto |
|---|--------|--------|----------|---------|
| 1 | StrategyResult + applied | — | 1-2h | ML signal |
| 2 | Delta real completo | 1 | 1h | ML signal critico |
| 3 | ImprovementReport | 1,2 | 2h | Observabilidad |
| 4 | GlobalQualityDB SQLite | 1,2 | 4-6h | Cross-project |
| 5 | Migracion JSONL → SQLite | 4 | 2h | Preservar datos |
| 6 | ModuleContextMetrics | — | 2-3h | Precision |
| 7 | LiveIndex integration | 6 | 2h | Precision+perf |
| 8 | StyleProfile .pi.yaml | — | 2h | Primer run |
| 9 | Cross-project classifier | 4 | 3h | ML cross-project |
| 10 | KNN decay temporal | 4 | 1h | ML adaptacion |

---

## Metricas Antes y Despues

| Capa | Antes | Despues |
|------|-------|---------|
| Features por archivo | 37 | 40 (+module_role, consumers, depth) |
| Store | JSONL por proyecto | SQLite global + JSONL audit |
| KNN | O(n_total) | O(n_issue_type) con decay |
| Classifier | 30 records locales | Cross-project desde dia 1 |
| StyleProfile init | CLAUDE_DEFAULT neutro | Desde .pi.yaml referencia |
| LiveIndex | No usado | Consulta type_registry |
| Delta | Hardcoded 0.1/0.2 | Medido real |
| Observabilidad | Ninguna | ImprovementReport completo |

---

## Dependencias Post-Mejora

```
data/quality/global.db          ← NUEVO — store global SQLite
    ▲
    │ record / query
quality/global_db.py            ← NUEVO — GlobalQualityDB
    ▲
quality/__init__.py             ← QualityEngine (orquestador)
    │
    ├── quality/context_metrics.py    ← NUEVO — ModuleContextMetrics
    │       └── engines/context/      ← LiveIndex (si disponible)
    │
    ├── quality/quality_classifier.py ← cross-project (usa global_db)
    │
    ├── quality/quality_strategies.py ← retorna StrategyResult mejorado
    │
    ├── quality/style_profile.py      ← init desde .pi.yaml
    │       └── engines/reference/    ← ProjectIntelligence
    │
    ├── quality/quality_features.py   ← + 3 campos contexto
    ├── quality/metrics.py
    ├── quality/quality_db.py         ← se mantiene como audit log local
    ├── quality/ts_analyzer.py
    ├── quality/code_profile.py
    ├── quality/profile_extractor.py
    └── quality/learned_scorer.py
```
