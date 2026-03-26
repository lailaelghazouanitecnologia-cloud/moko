# Quality Engine — Analisis Detallado

**Ubicacion**: `src/agent/engines/quality/`
**LOC total**: 5,809 (9 archivos)
**Fecha**: 2026-03-25

---

## 1. Que Hace

Evalua y mejora la calidad del codigo TypeScript generado. Paralelo al FixEngine
(que maneja errores TSC), QualityEngine maneja la diferencia entre "compila" y
"production-ready".

---

## 2. Arquitectura en Capas

```
                                    ENTRADA
                                       │
                                       ▼
                        ┌──────────────────────────┐
                        │  Layer 0: Feature Extract │  0 tokens
                        │  quality_features.py      │
                        │  35 metricas regex/count  │
                        └────────────┬─────────────┘
                                     │ QualityFeatures
                                     ▼
                        ┌──────────────────────────┐
                        │  Layer 1: Issue Detection │  0 tokens
                        │  detect_issues()          │
                        │  11 categorias de issues  │
                        └────────────┬─────────────┘
                                     │ [(type, severity, desc)]
                                     ▼
                        ┌──────────────────────────┐
                        │  Layer 2: Classification  │  0 tokens (post-training)
                        │  quality_classifier.py    │
                        │  tree → DB → rules        │
                        └────────────┬─────────────┘
                                     │ QualityPrediction(action, strategy)
                                     ▼
                            ┌────────┴────────┐
                            │                 │
                     strategy="auto"    strategy="prompt_hint"
                            │                 │  o "llm_rewrite"
                            ▼                 ▼
              ┌─────────────────┐   ┌─────────────────────┐
              │  Layer 3: Auto  │   │  Layer 4: Prompt     │
              │  7 strategies   │   │  PromptHintStrategy  │
              │  0 tokens       │   │  + style hints       │
              └────────┬────────┘   └──────────┬──────────┘
                       │                       │
                       │                       ▼
                       │            ┌─────────────────────┐
                       │            │  Layer 5: LLM Call   │
                       │            │  max 3 calls/modulo  │
                       │            └──────────┬──────────┘
                       │                       │
                       └───────────┬───────────┘
                                   ▼
                        ┌──────────────────────────┐
                        │  Scoring Final            │
                        │  _compute_score()  (6 ejes, pesos adaptables)
                        │  o learned_scorer.score() (50+ dimensiones)
                        └────────────┬─────────────┘
                                     │
                                     ▼
                        ┌──────────────────────────┐
                        │  Learning Loop            │
                        │  QualityDB ← record       │
                        │  Classifier retrain (30+) │
                        │  StyleProfile update       │
                        └──────────────────────────┘
```

---

## 3. Flujo Detallado: `improve_module()`

```python
improve_module(module_name, files, llm, max_llm_calls=3)
    │
    │  # STEP 1: Analyze ─────────────────────────────
    ├── extractor.extract_module(files)           → QualityFeatures (35 metricas)
    ├── _compute_score(features)                  → quality_before (0-1)
    ├── for filename in files:
    │     ├── extractor.extract(code) + detect_issues()
    │     └── classifier.predict(issue_type, features) → QualityPrediction
    │
    │  # STEP 2: Auto-fixes (0 tokens) ──────────────
    ├── for filename, issues in file_issues:
    │     ├── if prediction.strategy == "auto":
    │     │     _apply_auto_fix(code, prediction)
    │     │       ├── "add_types"          → TypeStrategy.apply()
    │     │       ├── "rename"             → NamingStrategy.apply()
    │     │       ├── "restructure"        → StructureStrategy.apply()
    │     │       ├── "encapsulate"        → EncapsulationStrategy.apply()
    │     │       ├── "add_error_handling" → ErrorHandlingStrategy.apply()
    │     │       ├── "add_docs"           → DocStrategy.apply()
    │     │       └── "extract_constants"  → StructureStrategy.apply()
    │     └── db.record_quality(success=True, tokens=0)
    │
    │  # STEP 3: LLM fixes (tokens) ────────────────
    ├── for filename in files (while llm_calls < max):
    │     ├── re-detect remaining issues (post auto-fix)
    │     ├── filter: only severity "critical" | "major"
    │     ├── classifier.predict_all(issues)  → hints
    │     ├── style_profile.to_prompt_hints() → style hints
    │     ├── db.patterns_for_type()          → before/after examples
    │     ├── prompt_builder.build_prompt(code, issues, hints, examples)
    │     ├── _call_llm(prompt)               → improved code
    │     └── db.record_quality(success=True, strategy="llm_rewrite")
    │
    │  # STEP 4: Score final ────────────────────────
    ├── extractor.extract_module(improved_files) → QualityFeatures
    ├── _compute_score(features)                 → quality_after
    │
    │  # STEP 5: Learning ──────────────────────────
    └── if db.records >= 30: classifier.train()
```

---

## 4. Archivos — Responsabilidad Exacta

### 4.1 `__init__.py` (703 LOC) — Orquestador

**Clase**: `QualityEngine`
- Facade que conecta todos los componentes
- 3 APIs publicas: `analyze_file()`, `analyze_module()`, `improve_module()`
- Scoring con 6 ejes ponderados (type_safety, naming, algorithm, docs, structure, encapsulation)
- Learning: `learn_style_from_project()`, `learn_reference_profile()`
- Comparacion: `compare_projects()`, `score_project()`

**Modelos**: `QualityIssue`, `QualityResult`

### 4.2 `quality_features.py` (503 LOC) — Extraccion de Features

**Clase**: `QualityFeatureExtractor`
- Extrae 35 metricas de codigo TypeScript via regex puro
- 5 categorias: Structure(10), Types(8), Naming(5), Documentation(4), Patterns(8+3)
- `extract()` → por archivo, `extract_module()` → agrega multiples archivos

**Funcion**: `detect_issues()` — 11 tipos de issues:
```
stub_impl, weak_types, bad_naming, no_docs, shallow_algorithm,
private_access, code_typos, hardcoded_template, missing_error_handling,
poor_encapsulation, (weak_types variant: no unions)
```

### 4.3 `quality_classifier.py` (433 LOC) — Prediccion

**Clase**: `QualityClassifier`
- Predice la mejor accion para cada issue detectado
- 3 niveles de prediccion (en orden de prioridad):
  1. **Decision tree aprendido** (despues de 30+ records en QualityDB)
  2. **Similarity lookup en DB** (distancia euclidiana en 35 features)
  3. **Reglas hardcodeadas** (fallback, siempre funciona)
- Validacion: VALID_ACTIONS dict previene que tree/DB sugieran acciones invalidas

**Acciones posibles por issue**:
```
weak_types        → add_types (auto)
poor_encapsulation → encapsulate (auto)
missing_error_handling → add_error_handling (auto)
stub_impl         → rewrite_algorithm (llm_rewrite)
shallow_algorithm → rewrite_algorithm (llm_rewrite)
bad_naming        → rename (auto | prompt_hint)
no_docs           → add_docs (prompt_hint)
private_access    → restructure (prompt_hint)
code_typos        → fix_typos (prompt_hint)
hardcoded_template → extract_constants (auto)
```

### 4.4 `quality_strategies.py` (669 LOC) — 7 Auto-Fixes

Todas 0-token, regex puro:

| Estrategia | LOC | Que Hace |
|------------|-----|----------|
| **TypeStrategy** | ~55 | any→unknown en 15 posiciones (params, returns, fields, generics, casts) |
| **NamingStrategy** | ~95 | Renombra variables genericas (data→payload, result→outcome) con contexto |
| **StructureStrategy** | ~25 | this.x['field'] → this.x.field |
| **EncapsulationStrategy** | ~130 | Analiza constructor assigns → readonly; public _x → private _x |
| **ErrorHandlingStrategy** | ~155 | Validation guards en constructors + try/catch en metodos I/O |
| **DocStrategy** | ~100 | JSDoc stubs para metodos publicos sin documentar |
| **PromptHintStrategy** | ~50 | Construye prompt LLM con issues + hints + examples de DB |

### 4.5 `quality_db.py` (265 LOC) — Learning Database

**Clase**: `QualityDB`
- Append-only JSONL persistente
- Cada record: issue detectado + 35 features + accion tomada + resultado
- `find_similar()` — KNN con distancia euclidiana normalizada
- `best_action_for()` — voto ponderado (min 3 records, similarity > 0.3)
- `patterns_for_type()` — pares before/after para prompt hints

### 4.6 `style_profile.py` (654 LOC) — Perfil de Estilo

**Clases**: `StyleProfile`, `StyleAnalyzer`, `StylePreference`
- 27 dimensiones de estilo (naming, types, docs, structure, errors, code style)
- **Herencia**: CLAUDE_DEFAULT_STYLE → overrides de usuario
- **Bayesian update**: EMA con peso, confianza satura a 20 observaciones
- **Aprendizaje**: `learn_from_project()` (peso 0.5), `learn_from_correction()` (peso 3.0)
- `to_prompt_hints()` — max 10 hints priorizados: types > encapsulation > structure > naming
- `to_quality_weights()` — ajusta pesos del scoring segun preferencias del usuario
- `build_style_context()` — filtra hints que el contexto ya demuestra

### 4.7 `ts_analyzer.py` (684 LOC) — Analisis Estatico

**Clase**: `TypeScriptAnalyzer`
- Parser regex + bracket matching (sin dependencias externas)
- Parse: `parse_functions()`, `parse_classes()`, `parse_imports()`
- Metricas: `cognitive_complexity()` (SonarQube-style), `coupling_analysis()`, `duplicate_detection()`, `class_cohesion()` (LCOM)
- Solo usado por `learned_scorer.py` (ProfileExtractor)

### 4.8 `learned_scorer.py` (1,263 LOC) — Scoring por Referencia

**Clases**: `CodeProfile`, `ProfileExtractor`, `ScoreDimension`, `LearnedScorer`

**CodeProfile** (136 campos):
- Type system: readonly/generic/union/alias/any densities por 100 LOC
- Patrones sofisticados: discriminated unions, branded types, mapped types
- Arquitectura: class sizes, methods, private ratio, interfaces/classes
- Complejidad: cognitive complexity, nesting, function length
- Coupling: afferent/efferent, instability, circular deps
- Naming: identifier length, semantic score, convention uniformity
- Error handling: boundary coverage, empty catches, null safety
- Duplicacion: duplicate blocks, dead code, unused params
- Design patterns: DI ratio, immutability, factory patterns

**ProfileExtractor**:
- `extract_project()` → lee todos .ts, construye CodeProfile
- Usa `TypeScriptAnalyzer` internamente para metricas ricas

**LearnedScorer** (~50 dimensiones con pesos):
- Aprende de perfiles de referencia (e.g. proyectos Claude)
- Cada dimension: `higher_better`, `lower_better`, o `closer_better`
- Tolerancias calibradas desde varianza entre proyectos referencia
- Auto-calibracion: loosen dimensions hasta que refs scoren >= 80%
- `learn_weights_from_comparison()` — aprende pesos de good vs bad profiles
- Persistente: save/load JSON

---

## 5. Dos Sistemas de Scoring

### 5.1 Feature-based (`_compute_score()`)

6 ejes con pesos adaptables al estilo del usuario:

```
type_safety    25%  ← penaliza any, premia generics/unions/readonly
naming         15%  ← camelCase, semantic names, no generics
algorithm      20%  ← complejidad, no stubs, docs de algoritmo
documentation  10%  ← JSDoc coverage, comments
structure      15%  ← DI, events, helpers, no bracket access
encapsulation  15%  ← readonly ratio, private fields, public field ratio
```

Usado cuando NO hay perfil de referencia aprendido.

### 5.2 Reference-based (`learned_scorer.score()`)

~50 dimensiones con pesos aprendidos:

```
Type system (weight 0.5-3.0):
  readonly_density, generic_density, union_density,
  type_alias_density, any_density, discriminated_unions, branded_types

Architecture (weight 0.8-1.5):
  private_ratio, avg_class_size, interface_to_class

Complexity & Structure (weight 1.0-2.0):
  cognitive_complexity, max_nesting_depth, long_function_ratio,
  parameter_count_avg, early_return_ratio, single_responsibility

Coupling & Cohesion (weight 1.5-2.0):
  instability_index, circular_dependencies, cohesion_ratio, god_class_count

Naming & Legibility (weight 1.0-1.5):
  avg_identifier_length, semantic_name_score, magic_number_density

Error Handling (weight 1.5-2.0):
  error_boundary_coverage, empty_catch_count, null_safety_coverage

Code Conciseness (weight 0.5-2.0):
  optional_chaining, nullish_coalescing, boilerplate_ratio,
  unnecessary_comments, comment_density

Duplication & Dead Code (weight 1.0-2.0):
  duplicate_block_ratio, unused_parameter_ratio, commented_code_ratio

Design Patterns (weight 1.0-1.5):
  interface_segregation, dependency_injection, immutability_score, guard_clause_ratio
```

Usado cuando HAY perfiles de referencia aprendidos.

---

## 6. Dependencias Internas

```
quality_db.py          ← standalone
quality_features.py    ← standalone
ts_analyzer.py         ← standalone
quality_classifier.py  ← quality_db, quality_features
quality_strategies.py  ← standalone (solo re, dataclasses)
style_profile.py       ← standalone
learned_scorer.py      ← ts_analyzer

__init__.py            ← TODOS los anteriores
```

---

## 7. Dependencias Externas

Quien usa QualityEngine:
- `engines/__init__.py` — re-export
- `dev/cli.py` — CLI commands
- `dev/branch_pipeline.py` — quality checks en generacion

---

## 8. Problemas Identificados

### 8.1 Duplicacion de Regex (~200-300 LOC)

Tres archivos reimplementan los mismos regex para contar any, generics, unions,
naming patterns, docs:

| Metrica | quality_features | style_profile | learned_scorer |
|---------|:---:|:---:|:---:|
| `\bany\b` | x | x | x |
| `<[A-Z]\w*>` | x | x | x |
| `\w+\|\w+` | x | x | x |
| `type\s+\w+=` | x | x | x |
| camelCase ratio | x | x | - |
| JSDoc count | x | x | x |
| error handling | x | - | x |
| private count | x | x | x |

### 8.2 `learned_scorer.py` demasiado grande (1,263 LOC)

Contiene 3 responsabilidades distintas:
- `CodeProfile` dataclass (136 campos, ~140 LOC)
- `ProfileExtractor` clase (~430 LOC)
- `LearnedScorer` + `ScoreDimension` (~500 LOC)

### 8.3 `ts_analyzer.py` infrautilizado

Solo lo usa `learned_scorer.py`. Podria ser usado por quality_features para
parsing mas preciso (actualmente usa regex simple para contar funciones/clases).

### 8.4 `_get_value()` mapping manual (60 lineas)

En LearnedScorer, un dict manual mapea dim_name→profile attribute.
Si se agrega un campo a CodeProfile, hay que actualizar 3 sitios.

### 8.5 quality_delta hardcodeado

En `improve_module()`, `db.record_quality(quality_delta=0.1)` para auto-fixes
y `0.2` para LLM fixes. No mide el delta real.

---

## 9. Propuesta de Mejora

### 9.1 Extraer `metrics.py` (elimina duplicacion)

```python
# Nuevo: src/agent/engines/quality/metrics.py
class CodeMetrics:
    """Extracted metrics from TypeScript code. Computed once, shared everywhere."""
    any_count: int
    generic_count: int
    union_count: int
    type_alias_count: int
    readonly_count: int
    camel_case_ratio: float
    jsdoc_coverage: float
    # ... 20+ campos comunes

def extract_metrics(code: str) -> CodeMetrics:
    """Single source of truth for all regex-based metrics."""
```

Consumidores:
- `quality_features.py` → usa CodeMetrics para llenar QualityFeatures
- `style_profile.py` → usa CodeMetrics para signals
- `learned_scorer.py` → usa CodeMetrics para profile

### 9.2 Dividir `learned_scorer.py`

```
learned_scorer.py (1,263 LOC)
  → code_profile.py     (~150 LOC) — CodeProfile dataclass
  → profile_extractor.py (~450 LOC) — ProfileExtractor
  → learned_scorer.py    (~500 LOC) — LearnedScorer + ScoreDimension
```

### 9.3 Usar ts_analyzer en quality_features

Reemplazar el conteo simple de funciones/clases en `quality_features.py`
con el parser mas robusto de `ts_analyzer.py`.

### 9.4 Medir quality_delta real

```python
# En improve_module(), despues de cada fix:
features_after = self.extractor.extract(fixed_code)
score_after = self._compute_score(features_after)
real_delta = score_after - score_before
db.record_quality(quality_delta=real_delta, ...)
```
