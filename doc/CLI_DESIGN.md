# AVA CLI Design

## Comandos propuestos

```
ava                                     # Interactive agent (REPL)
ava dev "goal" -t target                # Generate project
ava dev --inspect target                # Inspect last run (prompts, blocks, strategies)
ava dev --health target                 # Project health analysis
ava dev --plan "goal" -t target         # Show plan, wait for approval
ava dev --resume target                 # Resume interrupted run

ava add name /path/to/repo              # Register reference project
ava list                                # List registered projects
ava refresh name                        # Regenerate descriptors
ava remove name                         # Unregister project
ava info name                           # Project details

ava analyze name --mode arch|deps|sec   # LLM analysis of project
ava intel name                          # Generate Project Intelligence
ava features name                       # Browse Feature AST
ava synth name1 name2                   # Cross-project comparison
ava duel -t target                      # A/B testing

ava config                              # Show current config
ava config set key value                # Set config value
ava config init                         # Generate .ava/config.yaml template
ava status target                       # Current session state + blocks
```

## .ava/ directory structure

```
proyecto/.ava/
├── config.yaml         # RuntimeConfig: models, strategies, budgets
├── rules.md            # Project rules (like AGENTS.md)
├── rules/              # Additional rule files
│   ├── naming.md
│   └── architecture.md
└── ava.md              # Quick project instructions (free-form)

~/.ava/
├── config.yaml         # Global defaults
├── rules.md            # Global rules (apply everywhere)
└── knowledge/          # Cross-project knowledge store
```

## ava.md format (like AGENTS.md)

```markdown
# Project: chip8

## Architecture
- Each module owns its state via interfaces
- CPU receives dependencies via constructor (DI)
- Never duplicate state owned by another module

## Naming
- camelCase for methods
- PascalCase for classes and interfaces
- I prefix for interfaces (ICpu, IMemory)

## Testing
- Run: npx tsc --noEmit
- All modules must compile independently

## Style
- No 'any' type ever
- Use private readonly for injected deps
- Use discriminated unions for state
```

## config.yaml format

```yaml
provider: groq

models:
  root: moonshotai/kimi-k2-instruct-0905
  worker: moonshotai/kimi-k2-instruct-0905
  micro: llama-3.1-8b-instant
  sub: llama-3.1-8b-instant

quality:
  embedding_backend: auto     # auto | tfidf | minilm
  use_ast_grep: true

strategies:
  skeleton_fill_min_methods: 10
  rlm_min_methods: 20
  compaction_min_history: 20

budgets:
  root_max_output: 4000
  worker_max_output: 12000
  micro_max_output: 2000
  sub_max_output: 8000

features:
  goal_reasoner: true
  depth_loop: true
  strategy_selector: true
  knowledge_injection: true
  module_reviewer: true
  workspace_model: true
  project_analyzer: true

guardrails:
  max_tokens_per_run: 500000
  max_iterations: 50
```

## ava dev --inspect (lo que el usuario necesita ver)

```
ava dev --inspect chip8

SESSION abc123 | 2026-03-25 14:32
  Goal: "Build a CHIP-8 emulator"
  Status: completed (6/6 modules)
  Duration: 94s | Tokens: 91K | Cost: ~$0.07

CONFIG:
  Provider: groq | Model: kimi-k2-instruct-0905
  Features: GoalReasoner, DepthLoop, Strategies, Knowledge, Reviewer
  Rules: .ava/rules.md (12 lines)

SPEC (GoalReasoner):
  Domain: emulator | 15 requirements | 6 components | ~750 LOC est.
  Integration: "CPU uses memory.read(), not own RAM"

BLOCKS (42 total, hash chain VALID):
  memory:  ANALYZE → IMPLEMENT×2 → REVIEW(3 issues) → REFACTOR → TEST → ABSTRACT  ✓
  display: ANALYZE → IMPLEMENT×2 → REVIEW(2 issues) → REFACTOR → TEST → ABSTRACT  ✓
  cpu:     ANALYZE → IMPLEMENT×2 → REVIEW(3 issues) → REFACTOR → TEST → ABSTRACT  ✓

STRATEGIES:
  memory: big_context (9 methods, 80 LOC)
  cpu:    skeleton_fill (11 methods, 311 LOC)

PROMPTS USED:
  System: modular (498 tokens) — role + rules + integration + output
  Variants: default (3K budget)
  Style hints: 8 injected (types_strict, readonly, DI, etc.)

REVIEWER FINDINGS:
  memory: "loadFonts public, missing bounds check, reset ordering"
  cpu:    "missing DI, empty constructor, no stack overflow check"

KNOWLEDGE:
  Injected: 540 chars from 2 previous runs
  Extracted: 6 new learnings

HEALTH: 82/100
  ✓ 0 TSC errors
  ⚠ 4 missing DI | 6 dead exports | cohesion 0.12

TOKEN BREAKDOWN:
  root:     500 in / 2,000 out (reasoning)
  worker: 30,000 in / 55,000 out (generation)
  micro:    200 in / 100 out (classification)
```
