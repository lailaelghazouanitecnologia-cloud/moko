"""
Indexer — ingests Roska YAML descriptors into LanceDB.

Walks all YAML descriptors in out/<project>/ and creates embeddable chunks.
Large file descriptors are split per-type for better embedding quality.
Reuses parse_file_descriptor() and parse_workspace() from synth.py.
"""

import json
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from .embeddings import EmbeddingProvider


@dataclass
class DescriptorChunk:
    """A chunk of a YAML descriptor ready for embedding."""
    id: str                 # e.g., "crewai/crew/agent.yaml::Agent"
    project: str
    file_path: str          # relative to project dir
    descriptor_type: str    # workspace | module | file | deps | graph
    layer: str
    content: str            # text to embed
    types: list[str] = field(default_factory=list)
    functions: list[str] = field(default_factory=list)
    imports: list[str] = field(default_factory=list)
    lines: int = 0


# Import synth.py parsers
def _get_synth_parsers():
    """Import parse functions from synth.py."""
    src_dir = Path(__file__).resolve().parent.parent.parent
    if str(src_dir) not in sys.path:
        sys.path.insert(0, str(src_dir))
    from synth import parse_file_descriptor, parse_workspace
    return parse_file_descriptor, parse_workspace


class Indexer:
    """Indexes Roska descriptors into LanceDB."""

    BATCH_SIZE = 64

    def __init__(self, db_path: str, embedder: EmbeddingProvider):
        import lancedb
        self.db = lancedb.connect(db_path)
        self.embedder = embedder
        self._parse_file_descriptor, self._parse_workspace = _get_synth_parsers()

    def index_all(self, out_dir: Path, projects: list[str] = None,
                  verbose: bool = True):
        """Index all projects. Shows progress."""
        if projects is None:
            projects = sorted(
                d.name for d in out_dir.iterdir()
                if d.is_dir() and not d.name.startswith(".")
            )

        total_chunks = 0
        t0 = time.time()

        for i, project in enumerate(projects, 1):
            project_dir = out_dir / project
            if not project_dir.is_dir():
                continue

            if verbose:
                print(f"  [{i}/{len(projects)}] Indexing {project}...", end="", flush=True)

            pt = time.time()
            chunks = self._extract_chunks(project, project_dir)
            if chunks:
                self._upsert_chunks(project, chunks)
                total_chunks += len(chunks)

            if verbose:
                print(f" {len(chunks)} chunks ({time.time() - pt:.1f}s)")

        elapsed = time.time() - t0
        if verbose:
            print(f"\n  Total: {total_chunks} chunks from {len(projects)} projects in {elapsed:.1f}s")

        return total_chunks

    def _extract_chunks(self, project: str, project_dir: Path) -> list[DescriptorChunk]:
        """Walk YAML files and extract embeddable chunks."""
        chunks = []

        # workspace.yaml → 1 chunk
        ws_path = project_dir / "workspace.yaml"
        if ws_path.exists():
            content = ws_path.read_text(errors="replace")
            chunks.append(DescriptorChunk(
                id=f"{project}/workspace",
                project=project,
                file_path="workspace.yaml",
                descriptor_type="workspace",
                layer="logic",
                content=content[:4000],
            ))

        # deps.yaml → 1 chunk (truncated)
        deps_path = project_dir / "deps.yaml"
        if deps_path.exists():
            content = deps_path.read_text(errors="replace")
            chunks.append(DescriptorChunk(
                id=f"{project}/deps",
                project=project,
                file_path="deps.yaml",
                descriptor_type="deps",
                layer="logic",
                content=content[:4000],
            ))

        # graphs/meta.yaml → 1 chunk
        meta_path = project_dir / "graphs" / "meta.yaml"
        if meta_path.exists():
            content = meta_path.read_text(errors="replace")
            chunks.append(DescriptorChunk(
                id=f"{project}/graphs/meta",
                project=project,
                file_path="graphs/meta.yaml",
                descriptor_type="graph",
                layer="logic",
                content=content[:4000],
            ))

        # module.yaml files → 1 chunk each
        for mod_yaml in sorted(project_dir.rglob("module.yaml")):
            content = mod_yaml.read_text(errors="replace")
            rel = str(mod_yaml.relative_to(project_dir))
            chunks.append(DescriptorChunk(
                id=f"{project}/{rel}",
                project=project,
                file_path=rel,
                descriptor_type="module",
                layer="logic",
                content=content[:4000],
            ))

        # File descriptors → chunk per type or per file
        for yaml_path in sorted(project_dir.rglob("*.yaml")):
            if yaml_path.name in ("workspace.yaml", "module.yaml", "meta.yaml", "deps.yaml"):
                continue
            if "graphs" in str(yaml_path.relative_to(project_dir)):
                continue

            rel = str(yaml_path.relative_to(project_dir))
            content = yaml_path.read_text(errors="replace")
            fd = self._parse_file_descriptor(yaml_path)

            type_names = [t["name"] for t in fd.get("types", [])]
            func_names = [f["name"] for f in fd.get("functions", [])]
            import_syms = []
            for imp in fd.get("imports", []):
                if isinstance(imp, str):
                    import_syms.append(imp)
                elif isinstance(imp, dict):
                    import_syms.append(str(imp.get("sym", "")))

            # Split large descriptors per type for better embedding quality
            if len(content) > 2000 and len(fd.get("types", [])) > 1:
                for t in fd["types"]:
                    type_block = self._extract_type_block(content, t["name"])
                    if type_block:
                        chunks.append(DescriptorChunk(
                            id=f"{project}/{rel}::{t['name']}",
                            project=project,
                            file_path=rel,
                            descriptor_type="file",
                            layer=fd.get("layer", "logic"),
                            content=type_block[:3000],
                            types=[t["name"]],
                            functions=[],
                            imports=import_syms[:20],
                            lines=fd.get("lines", 0),
                        ))
            else:
                chunks.append(DescriptorChunk(
                    id=f"{project}/{rel}",
                    project=project,
                    file_path=rel,
                    descriptor_type="file",
                    layer=fd.get("layer", "logic"),
                    content=content[:3000],
                    types=type_names,
                    functions=func_names,
                    imports=import_syms[:20],
                    lines=fd.get("lines", 0),
                ))

        return chunks

    def _extract_type_block(self, content: str, type_name: str) -> str:
        """Extract the YAML block for a specific type from file content."""
        lines = content.splitlines()
        start = None
        end = None

        for i, line in enumerate(lines):
            if f"name: {type_name}" in line and "- name:" in line:
                start = i
            elif start is not None and line.strip().startswith("- name:") and i > start:
                end = i
                break

        if start is not None:
            if end is None:
                end = len(lines)
            return "\n".join(lines[start:end])
        return ""

    def _upsert_chunks(self, project: str, chunks: list[DescriptorChunk]):
        """Embed and insert/update chunks into LanceDB."""
        table_name = "descriptors"

        # Batch embed
        texts = [c.content for c in chunks]
        all_vectors = []
        for i in range(0, len(texts), self.BATCH_SIZE):
            batch = texts[i:i + self.BATCH_SIZE]
            vectors = self.embedder.embed(batch)
            all_vectors.extend(vectors)

        # Build records
        records = []
        for chunk, vector in zip(chunks, all_vectors):
            records.append({
                "id": chunk.id,
                "vector": vector,
                "project": chunk.project,
                "file_path": chunk.file_path,
                "descriptor_type": chunk.descriptor_type,
                "layer": chunk.layer,
                "content": chunk.content,
                "types": json.dumps(chunk.types),
                "functions": json.dumps(chunk.functions),
                "lines": chunk.lines,
            })

        # Create or append to table
        if table_name in self.db.table_names():
            tbl = self.db.open_table(table_name)
            # Delete existing rows for this project, then add new
            try:
                tbl.delete(f"project = '{project}'")
            except Exception:
                pass  # table may be empty or filter unsupported
            tbl.add(records)
        else:
            self.db.create_table(table_name, records)
