"""
Emission — reference matching for blueprint types.

Given a TypeBlueprint (e.g. Mat4 with methods multiply, invert, setTRS),
the EmissionIndex finds the most relevant Roska descriptors across all
reference projects and returns their content for injection into the LLM prompt.

The index is an inverted map: method_name → [(descriptor_path, type_name)]
plus type_name → [descriptor_paths]. Scoring: type match = 3pts,
method match = 2pts, field match = 1pt.
"""
from __future__ import annotations

import json
import time
import yaml
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from ..core.models import TypeBlueprint, ModuleBlueprint


@dataclass
class EmissionMatch:
    """A matched reference descriptor for a given type."""
    descriptor_path: str    # "playcanvas/core/math/vec3.yaml"
    type_name: str          # "Mat4"
    score: float            # 0.85
    matched_methods: list[str] = field(default_factory=list)
    matched_fields: list[str] = field(default_factory=list)


class EmissionIndex:
    """Inverted index over Roska descriptors for reference matching.

    Build once, query per-type. Cached to disk as JSON.
    """

    def __init__(self, out_dir: Path):
        self.out_dir = out_dir
        # method_name → [(rel_path, type_name)]
        self.method_index: dict[str, list[tuple[str, str]]] = {}
        # type_name_lower → [(rel_path, type_name)]
        self.type_index: dict[str, list[tuple[str, str]]] = {}
        # field_name → [(rel_path, type_name)]
        self.field_index: dict[str, list[tuple[str, str]]] = {}
        self.built_at: float = 0.0
        self.total_descriptors: int = 0
        self.total_types: int = 0

    # ── Build ──────────────────────────────────────────────

    def build(self, projects: list[str]):
        """Scan all Roska descriptors under out_dir for given projects."""
        self.method_index.clear()
        self.type_index.clear()
        self.field_index.clear()
        self.total_descriptors = 0
        self.total_types = 0

        for project in projects:
            project_dir = self.out_dir / project
            if not project_dir.is_dir():
                continue
            for yaml_path in project_dir.rglob("*.yaml"):
                # Skip workspace/deps/meta files
                if yaml_path.name in ("workspace.yaml", "deps.yaml", "meta.yaml"):
                    continue
                self._index_descriptor(yaml_path, project)

        self.built_at = time.time()

    def _index_descriptor(self, yaml_path: Path, project: str):
        """Extract types/methods/fields from one descriptor into the index."""
        try:
            text = yaml_path.read_text()
            # Strip header comments
            lines = [l for l in text.split("\n") if not l.startswith("##")]
            data = yaml.safe_load("\n".join(lines))
            if not data or not isinstance(data, dict):
                return
        except Exception:
            return

        self.total_descriptors += 1
        rel_path = str(yaml_path.relative_to(self.out_dir))

        for type_def in data.get("types", []):
            if not isinstance(type_def, dict):
                continue
            type_name = type_def.get("name", "")
            if not type_name:
                continue

            self.total_types += 1
            entry = (rel_path, type_name)

            # Index type name
            key = type_name.lower()
            self.type_index.setdefault(key, []).append(entry)

            # Index methods
            for method_list_key in ("methods", "static_methods"):
                for m in type_def.get(method_list_key, []):
                    mname = m if isinstance(m, str) else (m.get("name", "") if isinstance(m, dict) else "")
                    if isinstance(mname, str) and mname:
                        self.method_index.setdefault(mname.lower(), []).append(entry)

            # Index fields
            for f in type_def.get("fields", []):
                fname = f if isinstance(f, str) else (f.get("name", "") if isinstance(f, dict) else "")
                if not isinstance(fname, str):
                    continue
                # Strip type annotations from "data: Float32Array(16)" style
                if ":" in fname:
                    fname = fname.split(":")[0].strip()
                if fname:
                    self.field_index.setdefault(fname.lower(), []).append(entry)

    # ── Query ──────────────────────────────────────────────

    def emit_for_type(self, type_bp: TypeBlueprint,
                      module_bp: ModuleBlueprint = None,
                      max_results: int = 5,
                      max_chars: int = 4000) -> tuple[str, list[str]]:
        """Find and load the most relevant descriptors for a type.

        Returns (reference_context_string, list_of_descriptor_paths_used).
        """
        matches = self.query(type_bp, max_results=max_results)
        if not matches:
            return ("", [])

        # Load matched descriptors from disk, respecting char budget
        parts = []
        paths_used = []
        chars_used = 0

        for match in matches:
            full_path = self.out_dir / match.descriptor_path
            if not full_path.exists():
                continue

            content = full_path.read_text()
            if chars_used + len(content) > max_chars:
                # Trim to fit
                remaining = max_chars - chars_used
                if remaining < 200:
                    break
                content = content[:remaining]

            parts.append(
                f"## Reference: {match.descriptor_path} "
                f"(matched: {', '.join(match.matched_methods[:5])})\n{content}"
            )
            paths_used.append(match.descriptor_path)
            chars_used += len(content)

            if chars_used >= max_chars:
                break

        return ("\n\n".join(parts), paths_used)

    def query(self, type_bp: TypeBlueprint,
              max_results: int = 5) -> list[EmissionMatch]:
        """Score and rank descriptors for a TypeBlueprint."""
        # Collect scores: (rel_path, type_name) → score + matches
        scores: dict[tuple[str, str], dict] = {}

        def _add(entry: tuple[str, str], points: float,
                 match_type: str, match_name: str):
            key = entry
            if key not in scores:
                scores[key] = {"score": 0.0, "methods": [], "fields": []}
            scores[key]["score"] += points
            if match_type == "method":
                scores[key]["methods"].append(match_name)
            elif match_type == "field":
                scores[key]["fields"].append(match_name)

        # Type name match (3 pts)
        type_key = type_bp.name.lower()
        for entry in self.type_index.get(type_key, []):
            _add(entry, 3.0, "type", type_bp.name)

        # Method matches (2 pts each)
        for method in type_bp.methods:
            mkey = method.name.lower()
            for entry in self.method_index.get(mkey, []):
                _add(entry, 2.0, "method", method.name)

        # Static method matches (2 pts each)
        for method in type_bp.static_members:
            mkey = method.name.lower()
            for entry in self.method_index.get(mkey, []):
                _add(entry, 2.0, "method", method.name)

        # Field matches (1 pt each)
        for f in type_bp.fields:
            fkey = f.name.lower()
            for entry in self.field_index.get(fkey, []):
                _add(entry, 1.0, "field", f.name)

        # Rank by score
        ranked = sorted(scores.items(), key=lambda x: x[1]["score"], reverse=True)

        results = []
        for (rel_path, tname), info in ranked[:max_results]:
            results.append(EmissionMatch(
                descriptor_path=rel_path,
                type_name=tname,
                score=info["score"],
                matched_methods=info["methods"],
                matched_fields=info["fields"],
            ))

        return results

    # ── Persistence ────────────────────────────────────────

    def save(self, path: Path):
        """Save index to JSON for caching."""
        data = {
            "built_at": self.built_at,
            "total_descriptors": self.total_descriptors,
            "total_types": self.total_types,
            "method_index": self.method_index,
            "type_index": self.type_index,
            "field_index": self.field_index,
        }
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(data))

    @classmethod
    def load(cls, path: Path, out_dir: Path) -> EmissionIndex:
        """Load cached index from JSON."""
        data = json.loads(path.read_text())
        idx = cls(out_dir)
        idx.built_at = data.get("built_at", 0.0)
        idx.total_descriptors = data.get("total_descriptors", 0)
        idx.total_types = data.get("total_types", 0)
        # JSON stores tuples as lists — convert back
        idx.method_index = {
            k: [tuple(v) for v in vs]
            for k, vs in data.get("method_index", {}).items()
        }
        idx.type_index = {
            k: [tuple(v) for v in vs]
            for k, vs in data.get("type_index", {}).items()
        }
        idx.field_index = {
            k: [tuple(v) for v in vs]
            for k, vs in data.get("field_index", {}).items()
        }
        return idx

    def is_fresh(self, max_age_s: int = 86400) -> bool:
        """Is this index less than max_age_s old?"""
        return self.built_at > 0 and (time.time() - self.built_at) < max_age_s

    def format_stats(self) -> str:
        return (f"EmissionIndex: {self.total_descriptors} descriptors, "
                f"{self.total_types} types, "
                f"{len(self.method_index)} unique methods, "
                f"{len(self.field_index)} unique fields")
