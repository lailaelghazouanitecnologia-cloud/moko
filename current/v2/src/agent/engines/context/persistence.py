"""
RunPersistence — save/load project state between runs.

Persists:
  - pipeline-report.json: metrics from each pipeline run
  - index-snapshot.json: LiveIndex state at end of run
  - invariants.yaml: learned and manual rules
"""
from __future__ import annotations

import json
import time
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .index import LiveIndex
    from .invariants import InvariantStore


class RunPersistence:
    """Persist and load engine state between runs."""

    def save_report(self, project_dir: Path, report_data: dict) -> Path:
        """Save pipeline report to project directory."""
        project_dir.mkdir(parents=True, exist_ok=True)
        report_data["saved_at"] = time.time()
        path = project_dir / "pipeline-report.json"
        path.write_text(json.dumps(report_data, indent=2, default=str))
        return path

    def save_index_snapshot(self, project_dir: Path,
                            index: "LiveIndex") -> Path:
        """Save a snapshot of the LiveIndex to disk."""
        project_dir.mkdir(parents=True, exist_ok=True)
        snapshot = {
            "saved_at": time.time(),
            "file_count": index.file_count(),
            "total_loc": index.total_loc(),
            "files": {},
            "types": {},
        }

        for path, state in index.files.items():
            snapshot["files"][path] = {
                "lines": state.lines,
                "exports": state.export_names,
                "imports": [imp.source for imp in state.imports],
                "sig_hash": state.sig_hash,
            }

        for name, td in index.type_registry.items():
            snapshot["types"][name] = {
                "kind": td.kind,
                "file": td.file,
                "fields": [f"{fn}: {ft}" for fn, ft in td.fields],
                "methods": td.methods,
                "extends": td.extends,
                "members": td.members,
            }

        path = project_dir / "index-snapshot.json"
        path.write_text(json.dumps(snapshot, indent=2))
        return path

    def load_last_index(self, project_dir: Path) -> dict | None:
        """Load the last index snapshot (for reference, not reconstruction)."""
        path = project_dir / "index-snapshot.json"
        if not path.exists():
            return None
        try:
            return json.loads(path.read_text())
        except Exception:
            return None

    def save_invariants(self, project_dir: Path,
                        store: "InvariantStore") -> Path:
        """Save invariant rules to project."""
        path = project_dir / "invariants.yaml"
        store.save(path)
        return path

    def load_invariants(self, project_dir: Path,
                        store: "InvariantStore") -> None:
        """Load invariant rules from project."""
        path = project_dir / "invariants.yaml"
        store.load(path)
