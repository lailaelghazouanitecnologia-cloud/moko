# QualityEngine v3 — Plan de Implementacion (propuesta externa)

**Base**: Cambios 1-10 ya implementados (StrategyResult, delta real, GlobalQualityDB, etc.)
**Objetivo**: sqlite-vec, ast-grep, embeddings pluggables, multi-lenguaje, pre-training
**Fecha**: 2026-03-25

---

## Estado: Que hay vs que falta

| Componente | Estado | Propuesta |
|------------|--------|-----------|
| StrategyResult con applied | HECHO | OK |
| Delta real medido | HECHO | OK |
| ImprovementReport | HECHO | OK |
| GlobalQualityDB SQLite | HECHO (KNN Python) | Migrar a sqlite-vec |
| ModuleContextMetrics | HECHO | OK |
| Cross-project classifier | HECHO | Ampliar con features lang |
| sqlite-vec (KNN vectorial) | FALTA | Reemplaza KNN Python |
| ast-grep (AST detection) | FALTA | Reemplaza regex en features |
| QualityEmbedder pluggable | FALTA | TF-IDF → MiniLM → CodeBERT |
| CodeMetrics UNIVERSAL/NORM/TS | FALTA | Redisenar metrics.py |
| LanguageAdapter | FALTA | Multi-lang con mismo API |
| Pre-training LLM | FALTA | 4,000 records sinteticos |
| Pesos semanticos por issue | FALTA | En KNN hibrido |

---

## Orden de Implementacion

### Semana 1: sqlite-vec + ast-grep (fundamentos)

**1. sqlite-vec en GlobalQualityDB**
- `pip install sqlite-vec`
- Modificar `global_db.py`: load extension, crear tabla vec_quality
- KNN nativo SQL con partition key por issue_type
- Mantener fallback sin extension (degradacion elegante)

**2. ast-grep en quality_features.py**
- `pip install ast-grep-py`
- Nuevo `ast_detection.py` que usa SgRoot para deteccion
- Reemplaza regex para: any_count, generic_usage, union_types
- Fallback a regex si ast-grep no instalado

### Semana 2: Embeddings + CodeMetrics rediseñado

**3. QualityEmbedder pluggable**
- Nuevo `embedder.py` con Protocol EmbeddingBackend
- TFIDFEmbedder (0 deps, default)
- MiniLMEmbedder (80MB, optional)
- build_embedder("auto") detecta lo disponible
- Campo emb_model en quality_records

**4. CodeMetrics con scopes**
- Refactorizar `metrics.py`: FeatureScope enum
- 12 UNIVERSAL, 3 NORMALIZED, 13 TS_ONLY
- to_knn_vector(cross_language=True) filtra a UNIVERSAL+NORMALIZED
- TS_ONLY = Optional[int] (None en otros lenguajes)

### Semana 3: Multi-lenguaje + KNN hibrido

**5. LanguageAdapter base**
- Nuevo `adapters.py` con ABC LanguageAdapter
- TypeScriptAdapter (actual, default)
- Estructura para PythonAdapter futuro
- QualityEngine recibe adapter en init

**6. KNN hibrido con pesos semanticos**
- find_similar() combina: distancia numerica + distancia sqlite-vec
- SEMANTIC_WEIGHT dict por issue_type
- Records sinteticos pesan 0.5x

### Semana 4: Pre-training

**7. Script de pre-training**
- Genera 4,000 records sinteticos via LLM
- Valida con _compute_score() real (no estimacion LLM)
- Marca project_name="__synthetic__"
- Carga en global.db

---

## Dependencias

```
# Requeridas
pip install sqlite-vec     # KNN vectorial, C puro
pip install ast-grep-py    # AST detection, PyO3

# Opcionales
pip install sentence-transformers  # MiniLM embeddings (80MB)
```
