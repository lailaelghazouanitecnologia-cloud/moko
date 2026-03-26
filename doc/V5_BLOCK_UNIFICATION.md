# AVA v5 — Block Unification Plan

**Objetivo**: Unificar Block + BranchPipeline. Blocks como unidad atomica,
BranchPipeline como orquestador, xvm como microvm de agentes.

---

## Estado actual (v4)

Dos pipelines paralelos que no se hablan:

```
DevSupervisor (1,799 LOC):        BranchPipeline (2,278 LOC):
  ✓ Blocks con hash chain            ✓ Git branches por modulo
  ✓ Plan con topo sort                ✓ GoalReasoner + FunctionalSpec
  ✓ BlockVM navigation                ✓ DepthLoop + StrategySelector
  ✓ Discussions por block             ✓ ModuleReviewer + QualityEngine
  ✓ Abstraction post-block            ✓ FixEngine + CompileFixLoop
  ✓ Parallel batch (ThreadPool)       ✓ ProjectAnalyzer post-gen
  ✓ ActorRegistry dispatch            ✓ Knowledge + Workspace + Guardian
  ✗ No git branches                   ✗ No Blocks, no hash chain
  ✗ No fix engine                     ✗ No discussions
  ✗ No strategies                     ✗ No abstraction
  ✗ No quality loop                   ✗ No parallel batch
```

## Propuesta v5: Block + Branch unificado

### 1. ModuleTask contiene Blocks

```python
@dataclass
class ModuleTask:
    name: str
    branch_name: str
    depends_on: list[str]
    blocks: list[Block]   # ← NUEVO: secuencia de blocks para este modulo

    # Blocks auto-generados:
    # Block[0] ANALYZE → blueprint generation
    # Block[1..N] IMPLEMENT → translate_type per type
    # Block[N+1] REVIEW → ModuleReviewer
    # Block[N+2] REFACTOR → QualityEngine
    # Block[N+3] TEST → tsc + ProjectAnalyzer
    # Block[N+4] ABSTRACT → extract learnings
```

### 2. BranchPipeline ejecuta Blocks

```python
def _process_module(self, task, project_dir, ...):
    self.git.checkout_branch(task.branch_name)

    for block in task.blocks:
        self.vm.goto(block)
        block.start()

        handler = self.registry.get(block.block_type)
        result = handler.execute(block, context)

        block.complete(result)
        block.compute_hash()  # chain integrity
        self.state_mgr.save_block(block)

    self.git.merge(task.branch_name, "main")
```

### 3. ActorRegistry mapea BlockType → Engine

```python
registry = ActorRegistry()
registry.register(BlockType.ANALYZE, BlueprintActor(translator))
registry.register(BlockType.IMPLEMENT, TranslateActor(translator, strategies))
registry.register(BlockType.REVIEW, ReviewActor(module_reviewer))
registry.register(BlockType.REFACTOR, QualityActor(quality_engine))
registry.register(BlockType.TEST, TestActor(fix_engine, analyzer))
registry.register(BlockType.ABSTRACT, AbstractionActor(knowledge))
```

### 4. xvm = Agent MicroVM

```python
class AgentVM:
    """MicroVM for running agents with Block navigation."""
    plan: Plan
    current_block: Block
    registry: list[RegisteredInsight]
    budget: ContextBudget

    def goto(self, block): ...
    def register(self, insight): ...
    def discard(self, item): ...
    def navigate_context(self, query): ...  # RLM-style navigation
```

### 5. StateManager unificado

```
SessionState = Plan state (persiste entre modules)
TurnState = Block state (efimero por block)
Block.hash chain = integridad verificable
Block.abstraction = learnings por block
Block.discussions = decisions por block (via ExperimentEngine)
```

---

## Orden de implementacion

```
Fase 1: ModuleTask + Blocks
  - ModuleTask genera Blocks automaticamente
  - _process_module itera Blocks en vez de logica inline
  - Hash chain activo

Fase 2: ActorRegistry + Handlers
  - BlueprintActor, TranslateActor, ReviewActor, etc.
  - Cada handler = 1 engine wrappeado como actor
  - ActorRegistry dispatch por BlockType

Fase 3: AgentVM (xvm repurposed)
  - BlockVM → AgentVM con context navigation
  - RLM-style: el agente navega con herramientas
  - Budget tracking por block

Fase 4: Unificar state
  - SessionState = Plan
  - TurnState = Block
  - Eliminar RunState (reemplazado por Plan persistence)
  - Eliminar DevSupervisor (reemplazado por BranchPipeline + Blocks)
```
