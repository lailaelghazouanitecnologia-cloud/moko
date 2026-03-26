"""
ProposalGenerator — analyzes a workspace and proposes data-driven improvements.

Not opinions. Data: "3 functions duplicated between X and Y. Unify saves 40 LOC."
The user decides what to accept. Default: low effort + high impact.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from ..context import ContextEngine
    from ..quality import QualityEngine


@dataclass
class Proposal:
    """A concrete improvement proposal with data."""
    id: str                          # "density", "edge_case_x", "perf_y"
    what: str                        # human-readable description
    effort: str                      # "low" | "medium" | "high"
    impact: str                      # measurable impact description
    data: str                        # evidence (not opinion)
    category: str = "quality"        # "quality", "bug", "perf", "test", "structure"
    accepted: bool = False
    applied: bool = False

    def to_dict(self) -> dict:
        return {
            "id": self.id, "what": self.what, "effort": self.effort,
            "impact": self.impact, "data": self.data, "category": self.category,
            "accepted": self.accepted, "applied": self.applied,
        }


class ProposalGenerator:
    """Analyze code and generate improvement proposals with evidence."""

    def __init__(self, verbose: bool = False):
        self.verbose = verbose

    def analyze(
        self,
        workspace_dir: Path,
        context_engine: Optional["ContextEngine"] = None,
        quality_engine: Optional["QualityEngine"] = None,
    ) -> List[Proposal]:
        """Analyze workspace code and generate proposals.

        Uses context engine for structural analysis (0 tokens).
        Uses quality engine for quality metrics (0 tokens).
        """
        proposals: List[Proposal] = []

        # Read all TS files
        src_dir = workspace_dir / "src" if (workspace_dir / "src").exists() else workspace_dir
        files: Dict[str, str] = {}
        for ts_file in sorted(src_dir.rglob("*.ts")):
            try:
                files[str(ts_file.relative_to(workspace_dir))] = ts_file.read_text()
            except Exception:
                continue

        if not files:
            return proposals

        # 1. Duplicate detection
        proposals.extend(self._detect_duplicates(files))

        # 2. Empty methods / stubs
        proposals.extend(self._detect_stubs(files))

        # 3. Type safety issues
        proposals.extend(self._detect_type_issues(files))

        # 4. Missing error handling
        proposals.extend(self._detect_missing_error_handling(files))

        # 5. Dead code (if context engine available)
        if context_engine:
            proposals.extend(self._detect_dead_code(files, context_engine))

        # 6. Quality issues (if quality engine available)
        if quality_engine:
            proposals.extend(self._detect_quality_issues(files, quality_engine))

        if self.verbose:
            low = sum(1 for p in proposals if p.effort == "low")
            med = sum(1 for p in proposals if p.effort == "medium")
            high = sum(1 for p in proposals if p.effort == "high")
            print(f"  [proposals] {len(proposals)} found: {low} low, {med} medium, {high} high effort")

        return proposals

    def _detect_duplicates(self, files: Dict[str, str]) -> List[Proposal]:
        """Find duplicate function bodies across files."""
        proposals = []
        # Extract function bodies (simplified: lines between { and })
        func_bodies: Dict[str, List[str]] = {}  # normalized_body → [file:func]

        for filename, code in files.items():
            for match in re.finditer(
                r'(?:async\s+)?(?:private\s+|public\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{',
                code
            ):
                func_name = match.group(1)
                start = match.end()
                # Find matching closing brace (simplified)
                depth = 1
                end = start
                for i in range(start, min(start + 500, len(code))):
                    if code[i] == "{":
                        depth += 1
                    elif code[i] == "}":
                        depth -= 1
                        if depth == 0:
                            end = i
                            break
                body = code[start:end].strip()
                if len(body) > 50:  # Only meaningful bodies
                    normalized = re.sub(r'\s+', ' ', body)
                    key = normalized[:200]  # First 200 chars as key
                    func_bodies.setdefault(key, []).append(f"{filename}:{func_name}")

        for key, locations in func_bodies.items():
            if len(locations) >= 2:
                proposals.append(Proposal(
                    id=f"dup_{locations[0].split(':')[1]}",
                    what=f"Duplicate function body in {', '.join(locations)}",
                    effort="low",
                    impact=f"Unify to save ~{len(key.split())} LOC",
                    data=f"Found in: {', '.join(locations)}",
                    category="structure",
                ))

        return proposals

    def _detect_stubs(self, files: Dict[str, str]) -> List[Proposal]:
        """Find empty methods and TODO markers."""
        proposals = []
        for filename, code in files.items():
            # Empty method bodies
            empties = re.findall(
                r'(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{\s*\}',
                code
            )
            for func_name in empties:
                proposals.append(Proposal(
                    id=f"stub_{func_name}",
                    what=f"Empty method: {func_name}() in {filename}",
                    effort="medium",
                    impact="Method has no implementation",
                    data=f"{filename}: {func_name}() body is empty",
                    category="bug",
                ))

            # TODOs
            for match in re.finditer(r'//\s*(TODO|FIXME|HACK):\s*(.+)', code):
                marker, desc = match.group(1), match.group(2).strip()
                proposals.append(Proposal(
                    id=f"todo_{marker.lower()}_{len(proposals)}",
                    what=f"{marker} in {filename}: {desc}",
                    effort="medium",
                    impact=f"Unresolved {marker}",
                    data=f"Line: {code[:match.start()].count(chr(10)) + 1}",
                    category="quality",
                ))

        return proposals

    def _detect_type_issues(self, files: Dict[str, str]) -> List[Proposal]:
        """Find any usage and weak typing."""
        proposals = []
        for filename, code in files.items():
            any_count = len(re.findall(r'\bany\b', code))
            if any_count > 0:
                proposals.append(Proposal(
                    id=f"any_{filename}",
                    what=f"{any_count} uses of 'any' in {filename}",
                    effort="low",
                    impact=f"Replace with unknown or specific types",
                    data=f"any count: {any_count}",
                    category="quality",
                ))
        return proposals

    def _detect_missing_error_handling(self, files: Dict[str, str]) -> List[Proposal]:
        """Find I/O methods without try/catch."""
        proposals = []
        io_pattern = re.compile(
            r'(?:async\s+)?(?:public\s+)?'
            r'(parse|load|save|fetch|read|write|connect|send)\w*\s*\(',
            re.IGNORECASE
        )
        for filename, code in files.items():
            for match in io_pattern.finditer(code):
                # Check if there's a try/catch nearby
                context = code[max(0, match.start() - 200):match.end() + 500]
                if 'try' not in context and 'catch' not in context:
                    proposals.append(Proposal(
                        id=f"error_{match.group(1)}_{filename}",
                        what=f"{match.group(1)}() in {filename} lacks error handling",
                        effort="low",
                        impact="Add try/catch for I/O operation",
                        data=f"Method: {match.group(1)}",
                        category="quality",
                    ))
        return proposals

    def _detect_dead_code(
        self, files: Dict[str, str], context_engine: "ContextEngine"
    ) -> List[Proposal]:
        """Find exports never imported anywhere."""
        proposals = []
        index = context_engine.index

        for filename in files:
            state = index.files.get(filename)
            if not state or not hasattr(state, "exports"):
                continue
            for export_name in state.exports:
                # Check if anyone imports it
                imported = False
                for other_path, other_imports in getattr(index, "import_map", {}).items():
                    if export_name in str(other_imports):
                        imported = True
                        break
                if not imported:
                    proposals.append(Proposal(
                        id=f"dead_{export_name}",
                        what=f"Unused export: {export_name} in {filename}",
                        effort="low",
                        impact="Remove or connect to consumer",
                        data=f"Exported but never imported",
                        category="structure",
                    ))

        return proposals

    def _detect_quality_issues(
        self, files: Dict[str, str], quality_engine: "QualityEngine"
    ) -> List[Proposal]:
        """Use quality engine to detect additional issues."""
        proposals = []
        try:
            result = quality_engine.analyze_module("workspace", files)
            for issue in getattr(result, "issues", []):
                if issue.severity in ("critical", "major"):
                    proposals.append(Proposal(
                        id=f"quality_{issue.issue_type}_{len(proposals)}",
                        what=issue.description,
                        effort="medium" if issue.severity == "critical" else "low",
                        impact=f"Fix {issue.severity} quality issue",
                        data=f"Type: {issue.issue_type}, severity: {issue.severity}",
                        category="quality",
                    ))
        except Exception:
            pass

        return proposals

    @staticmethod
    def format_proposals(proposals: List[Proposal]) -> str:
        """Format proposals for display to user."""
        if not proposals:
            return "  No improvements found."

        lines = []
        by_effort = {"low": [], "medium": [], "high": []}
        for p in proposals:
            by_effort.get(p.effort, by_effort["medium"]).append(p)

        for effort in ("low", "medium", "high"):
            group = by_effort[effort]
            if not group:
                continue
            lines.append(f"\n  [{effort.upper()} EFFORT]")
            for i, p in enumerate(group, 1):
                lines.append(f"  {i}. {p.what}")
                lines.append(f"     Impact: {p.impact}")
                lines.append(f"     Data: {p.data}")

        default = [p for p in proposals if p.effort == "low"]
        if default:
            lines.append(f"\n  Default: apply {len(default)} low-effort improvements")

        return "\n".join(lines)
