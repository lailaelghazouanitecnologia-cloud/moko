"""
State Matrix — a virtual machine that tracks analysis state to minimize tokens.

Instead of dumping raw YAML, the matrix maintains a compressed representation
of what the LLM already knows. Each state transition adds only the DELTA
of new information.

States:
  INIT → MAPPED → FOCUSED → LOADED → ANALYZED → ANSWERED

The matrix acts as a "memory" that lets us:
1. Never send the same information twice (dedup across turns)
2. Progressively refine: overview first, details only when asked
3. Track which modules/files the LLM has already seen
4. Generate abstract "navigation hints" instead of raw YAML

The state matrix is the backbone of the compression pipeline.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class AnalysisState(Enum):
    """States of the analysis virtual machine."""
    INIT = "init"           # No context loaded
    MAPPED = "mapped"       # Workspace structure known (modules, layers, counts)
    FOCUSED = "focused"     # Scope narrowed to specific modules/files
    LOADED = "loaded"       # Relevant descriptors loaded and compressed
    ANALYZED = "analyzed"   # LLM has analyzed the loaded context
    ANSWERED = "answered"   # Response delivered, ready for follow-up


@dataclass
class ModuleDigest:
    """Compressed representation of a module — what the LLM needs to know."""
    name: str
    files: int
    lines: int
    types: int
    functions: int
    layer: str
    # Set by analysis — what has been loaded/seen
    loaded: bool = False
    key_types: list[str] = field(default_factory=list)
    key_functions: list[str] = field(default_factory=list)


@dataclass
class ProjectMap:
    """Abstract map of a project — enough for the LLM to navigate."""
    name: str
    total_files: int = 0
    total_lines: int = 0
    modules: list[ModuleDigest] = field(default_factory=list)
    patterns: list[str] = field(default_factory=list)
    layers: dict = field(default_factory=dict)   # {layer: {files, lines}}
    seen_files: set = field(default_factory=set)  # files already sent to LLM


class StateMatrix:
    """Virtual machine tracking what the LLM knows about the codebase.

    The matrix answers: "given what the LLM already knows, what's the
    minimum new information needed to answer this query?"

    Usage:
        matrix = StateMatrix()
        matrix.map_project("cline-core", workspace_data)
        # Now the LLM knows the structure but no details

        matrix.focus(["task", "hooks"])
        # Now we know which modules to load

        needed = matrix.what_to_load(query_hints, budget=8000)
        # Returns only the descriptors the LLM hasn't seen yet

        matrix.mark_loaded(["task/ToolExecutor.yaml", ...])
        # Track what's been sent
    """

    def __init__(self):
        self.state: AnalysisState = AnalysisState.INIT
        self.projects: dict[str, ProjectMap] = {}
        self.focus_modules: list[str] = []
        self.loaded_descriptors: set[str] = set()  # all-time set
        self.turn_count: int = 0
        self._abstract_context: str = ""  # compressed context for LLM

    def map_project(self, name: str, workspace_data: dict):
        """Transition INIT → MAPPED. Parse workspace into abstract map."""
        modules = []
        for m in workspace_data.get("modules", []):
            modules.append(ModuleDigest(
                name=m.get("name", ""),
                files=m.get("files", 0),
                lines=m.get("lines", 0),
                types=m.get("types", 0),
                functions=m.get("functions", 0),
                layer=m.get("layer", "logic"),
            ))

        self.projects[name] = ProjectMap(
            name=name,
            total_files=workspace_data.get("total_files", 0),
            total_lines=workspace_data.get("total_lines", 0),
            modules=modules,
            layers=workspace_data.get("layers", {}),
        )
        self.state = AnalysisState.MAPPED

    def focus(self, module_names: list[str]):
        """Transition MAPPED → FOCUSED. Narrow scope to specific modules."""
        self.focus_modules = module_names
        self.state = AnalysisState.FOCUSED

    def what_to_load(self, query_keywords: list[str], budget_chars: int,
                     already_loaded: set[str] = None) -> list[str]:
        """Given what's already loaded, what new descriptors should we load?

        Returns list of descriptor paths, prioritized by relevance to query,
        excluding anything already sent to the LLM.
        """
        already = already_loaded or self.loaded_descriptors
        # This is used by the pipeline to decide what to fetch
        # The actual prioritization is in the compressor
        return [f for f in self.focus_modules if f not in already]

    def mark_loaded(self, descriptor_paths: list[str]):
        """Track which descriptors have been sent to the LLM."""
        self.loaded_descriptors.update(descriptor_paths)
        for project in self.projects.values():
            for path in descriptor_paths:
                project.seen_files.add(path)
        if self.state == AnalysisState.FOCUSED:
            self.state = AnalysisState.LOADED

    def mark_analyzed(self):
        """Transition to ANALYZED after LLM response."""
        self.state = AnalysisState.ANALYZED
        self.turn_count += 1

    def mark_answered(self):
        """Transition to ANSWERED."""
        self.state = AnalysisState.ANSWERED

    def generate_abstract_context(self) -> str:
        """Generate a compressed context string that tells the LLM what it
        already knows, without repeating raw data.

        This is the key to token savings across turns: instead of re-sending
        descriptors, we send a digest of what was learned.
        """
        if not self.projects:
            return ""

        parts = []
        for name, project in self.projects.items():
            lines = [
                f"Project: {name} ({project.total_files} files, "
                f"{project.total_lines:,} lines)",
            ]

            # Module summary table (one line per module)
            if project.modules:
                lines.append("Modules:")
                for m in project.modules:
                    loaded_mark = "✓" if m.loaded else " "
                    types_str = ""
                    if m.key_types:
                        types_str = f" [{', '.join(m.key_types[:3])}]"
                    lines.append(
                        f"  {loaded_mark} {m.name}: {m.files}f/{m.lines}L "
                        f"({m.types}T/{m.functions}F) {m.layer}{types_str}"
                    )

            # What we've already loaded
            if self.loaded_descriptors:
                loaded_for_project = [
                    d for d in self.loaded_descriptors if d.startswith(name)
                ]
                if loaded_for_project:
                    lines.append(f"Already analyzed: {len(loaded_for_project)} descriptors")

            parts.append("\n".join(lines))

        self._abstract_context = "\n\n".join(parts)
        return self._abstract_context

    def get_coverage_for_project(self, project_name: str) -> dict:
        """Get coverage metrics for reporting."""
        project = self.projects.get(project_name)
        if not project:
            return {}
        loaded = len([d for d in self.loaded_descriptors if d.startswith(project_name)])
        total_yaml = sum(m.files for m in project.modules)
        return {
            "files_loaded": loaded,
            "files_available": total_yaml,
            "modules_total": len(project.modules),
            "modules_focused": len(self.focus_modules),
            "state": self.state.value,
        }
