"""
FeatureStore — persistent store of reusable code features with metrics.

A feature is not a copy-paste template — it's a pattern with known metrics,
trade-offs, and reconfigurations. Features accumulate across projects and
help the system make better decisions over time.
"""
from __future__ import annotations

import json
import time
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Dict, List, Optional


@dataclass
class Feature:
    """A reusable code pattern with metrics and trade-offs."""
    id: str                                  # "stateless_auth", "xor_sprite_draw"
    pattern: str                             # human-readable description
    domain: str = ""                         # "emulator", "api", "game", etc.
    language: str = "typescript"

    # Metrics from the winning variant
    loc: int = 0
    method_count: int = 0
    complexity: float = 0.0
    quality_score: float = 0.0
    tsc_errors: int = 0

    # Context
    module_role: str = ""                    # "types", "service", "controller"
    project_name: str = ""                   # where it was first used
    approach: str = ""                       # "class-based", "functional", etc.

    # Trade-offs (learned from experiments)
    trade_offs: List[str] = field(default_factory=list)
    beat: List[str] = field(default_factory=list)     # what it beat and by how much
    reconfigurations: List[str] = field(default_factory=list)  # known variations

    # Code signature (not full code — just enough for matching)
    method_names: List[str] = field(default_factory=list)
    imports: List[str] = field(default_factory=list)

    timestamp: float = 0.0

    def __post_init__(self):
        if self.timestamp == 0.0:
            self.timestamp = time.time()

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> "Feature":
        return cls(**{k: v for k, v in d.items() if k in cls.__dataclass_fields__})


class FeatureStore:
    """Persistent YAML store of features with search by domain/pattern.

    Features accumulate across projects. The store helps the pipeline
    decide: "last time we built an emulator CPU, the exhaustive approach
    with 350 LOC scored 0.92. The minimal approach scored 0.71."
    """

    def __init__(self, store_path: Optional[Path] = None):
        self._path = store_path or self._default_path()
        self.features: List[Feature] = []
        self._load()

    @staticmethod
    def _default_path() -> Path:
        here = Path(__file__).resolve()
        for parent in [here] + list(here.parents):
            if (parent / "src" / "agent").exists():
                return parent / "data" / "features_store.yaml"
        return here.parent / "features_store.yaml"

    def _load(self):
        """Load features from YAML file."""
        if not self._path.exists():
            return
        try:
            import yaml
            with open(self._path) as f:
                data = yaml.safe_load(f)
            if isinstance(data, list):
                self.features = [Feature.from_dict(d) for d in data if isinstance(d, dict)]
        except Exception:
            # Fallback to JSON
            try:
                with open(self._path) as f:
                    data = json.load(f)
                if isinstance(data, list):
                    self.features = [Feature.from_dict(d) for d in data]
            except Exception:
                pass

    def save(self):
        """Persist features to disk."""
        self._path.parent.mkdir(parents=True, exist_ok=True)
        data = [f.to_dict() for f in self.features]
        try:
            import yaml
            with open(self._path, "w") as f:
                yaml.dump(data, f, default_flow_style=False, allow_unicode=True)
        except ImportError:
            with open(self._path, "w") as f:
                json.dump(data, f, indent=2)

    def add(self, feature: Feature):
        """Add a feature and persist."""
        self.features.append(feature)
        self.save()

    def search(
        self,
        domain: str = "",
        module_role: str = "",
        method_names: Optional[List[str]] = None,
        limit: int = 5,
    ) -> List[Feature]:
        """Search features by domain, role, or method similarity."""
        scored: List[tuple] = []

        for feat in self.features:
            score = 0.0

            # Domain match
            if domain and feat.domain == domain:
                score += 3.0
            elif domain and domain in feat.pattern.lower():
                score += 1.0

            # Role match
            if module_role and feat.module_role == module_role:
                score += 1.0

            # Method name overlap
            if method_names and feat.method_names:
                overlap = len(set(method_names) & set(feat.method_names))
                score += overlap * 0.5

            # Quality bonus
            score += feat.quality_score * 0.5

            if score > 0:
                scored.append((score, feat))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [f for _, f in scored[:limit]]

    def best_approach(self, domain: str, module_role: str = "") -> Optional[str]:
        """What approach worked best for this domain/role combination?"""
        matches = self.search(domain=domain, module_role=module_role, limit=3)
        if not matches:
            return None
        # Return the approach of the highest-scoring feature
        best = max(matches, key=lambda f: f.quality_score)
        return best.approach if best.approach else None

    def stats(self) -> dict:
        """Summary statistics."""
        if not self.features:
            return {"total": 0}

        domains = {}
        for f in self.features:
            d = f.domain or "unknown"
            domains[d] = domains.get(d, 0) + 1

        return {
            "total": len(self.features),
            "domains": domains,
            "avg_quality": sum(f.quality_score for f in self.features) / len(self.features),
            "avg_loc": sum(f.loc for f in self.features) / len(self.features),
        }
