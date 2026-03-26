# Project Intelligence: kilocode

> 
> **Domain**:  | **Language**: typescript | **Size**: medium | **Maturity**: 

## Metrics

| Metric | Value |
|--------|-------|
| Total LOC | 5,913 |
| Modules | 3 |
| Types | 17 |
| Functions | 45 |
| Avg LOC/module | 1971 |
| Median LOC/type | 7 |
| Avg methods/type | 0.8 |
| Async ratio | 54% |

## Programming Style

**Naming**: snake_case modules, PascalCase classes, camelCase methods
  Examples: `BaseRes`, `createModel`, `answerContentToText`
**Error handling**: mixed
**Async**: asyncio
**Typing**: moderate, generics, dataclasses
**Docs**: brief module docs, sparse comments
**Organization**: mostly file-per-class, barrel exports: no

## Dependency Graph

**Style**: flat | **Coupling**: loose | **Hub**: extension
```
  L0: [extension, shared, webview]
```

## Quality Calibration

| Metric | P25 | Median | P75 | Max |
|--------|-----|--------|-----|-----|
| LOC/type | 4 | 7 | 23 | 165 |
| Methods/type | 0 | 0 | 0 | 12 |
| LOC/function | 6 | 12 | 32 | 168 |
| Error handling: moderate | Test coverage: none |
