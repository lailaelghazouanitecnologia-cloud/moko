"""
QualityClassifier — predicts quality issues and best fix strategies.

Same architecture as FixClassifier:
  - Rule-based bootstrap (always works, day 1)
  - Learned decision tree (after 30+ records from QualityDB)
  - QualityDB similarity lookup as fallback

Predictions: what action to take for a detected quality issue.
"""

from dataclasses import dataclass
from typing import List, Dict, Optional, Tuple
import math

from .quality_db import QualityDB
from .quality_features import QualityFeatures, FEATURE_NAMES


@dataclass
class QualityPrediction:
    """Predicted action for a quality issue."""
    issue_type: str       # what was detected
    action: str           # "add_types", "rename", "rewrite_algorithm", "add_docs", etc.
    strategy: str         # "auto", "prompt_hint", "llm_rewrite", "template"
    confidence: float     # 0.0 - 1.0
    source: str           # "rule", "learned", "db_similar"
    hint: str = ""        # optional guidance for LLM prompt


class TreeNode:
    """Binary decision tree node for quality classification."""
    def __init__(self):
        self.feature_idx: int = -1
        self.threshold: float = 0.0
        self.left: Optional["TreeNode"] = None
        self.right: Optional["TreeNode"] = None
        self.prediction: Optional[str] = None   # "action|strategy" at leaf
        self.count: int = 0


class QualityClassifier:
    """Predict quality fixes using rules + learned decision tree."""

    def __init__(self, db: Optional[QualityDB] = None):
        self.db = db
        self.tree: Optional[TreeNode] = None
        self.trained_on: int = 0

    def predict(
        self, issue_type: str, features: QualityFeatures
    ) -> QualityPrediction:
        """Predict best action for a quality issue.

        Priority: learned tree (validated) → DB similarity → rules.
        """
        vec = features.to_vector()
        feat_dict = features.to_dict()

        # Valid actions per issue type — prevents stale trees/DB from misrouting
        VALID_ACTIONS: Dict[str, set] = {
            "weak_types": {"add_types"},
            "poor_encapsulation": {"encapsulate"},
            "missing_error_handling": {"add_error_handling"},
            "stub_impl": {"rewrite_algorithm"},
            "shallow_algorithm": {"rewrite_algorithm"},
            "bad_naming": {"rename"},
            "no_docs": {"add_docs"},
            "private_access": {"restructure"},
            "code_typos": {"fix_typos"},
            "hardcoded_template": {"extract_constants", "restructure"},
        }
        valid = VALID_ACTIONS.get(issue_type)

        # 1. Try learned tree (only if action is valid for this issue type)
        if self.tree and self.trained_on >= 30:
            leaf = self._tree_predict(self.tree, vec)
            if leaf and "|" in leaf:
                action, strategy = leaf.split("|", 1)
                if not valid or action in valid:
                    return QualityPrediction(
                        issue_type=issue_type,
                        action=action,
                        strategy=strategy,
                        confidence=0.75,
                        source="learned",
                        hint=self._generate_hint(issue_type, action, features),
                    )

        # 2. Try DB similarity (only if action is valid)
        if self.db:
            result = self.db.best_action_for(issue_type, feat_dict)
            if result:
                action, strategy, conf = result
                if conf >= 0.4 and (not valid or action in valid):
                    return QualityPrediction(
                        issue_type=issue_type,
                        action=action,
                        strategy=strategy,
                        confidence=conf,
                        source="db_similar",
                        hint=self._generate_hint(issue_type, action, features),
                    )

        # 3. Rule-based fallback
        return self._rule_based(issue_type, features)

    def predict_all(
        self, issues: List[Tuple[str, str, str]], features: QualityFeatures
    ) -> List[QualityPrediction]:
        """Predict actions for all detected issues, prioritized."""
        predictions = []
        for issue_type, severity, description in issues:
            pred = self.predict(issue_type, features)
            # Boost confidence based on severity
            if severity == "critical":
                pred.confidence = min(pred.confidence * 1.2, 1.0)
            predictions.append(pred)

        # Sort: highest confidence first, critical first
        severity_order = {"critical": 0, "major": 1, "minor": 2, "style": 3}
        predictions.sort(
            key=lambda p: (-p.confidence, severity_order.get(p.issue_type, 4))
        )
        return predictions

    def train(self, db: Optional[QualityDB] = None):
        """Train decision tree from QualityDB records."""
        source = db or self.db
        if not source or len(source.records) < 30:
            return

        # Build training data from successful records
        X: List[List[float]] = []
        y: List[str] = []

        for rec in source.records:
            if not rec.success or not rec.features:
                continue
            vec = [rec.features.get(name, 0.0) for name in FEATURE_NAMES]
            label = f"{rec.action}|{rec.strategy}"
            X.append(vec)
            y.append(label)

        if len(X) < 20:
            return

        self.tree = self._build_tree(X, y, max_depth=6, min_leaf=3)
        self.trained_on = len(X)

    # ── Rule-based classifier ────────────────────────────────

    def _rule_based(
        self, issue_type: str, features: QualityFeatures
    ) -> QualityPrediction:
        """Hardcoded rules for known quality patterns."""

        # Stub implementations → need full rewrite
        if issue_type == "stub_impl":
            return QualityPrediction(
                issue_type=issue_type,
                action="rewrite_algorithm",
                strategy="llm_rewrite",
                confidence=0.9,
                source="rule",
                hint="Replace stub/TODO with real implementation. "
                     "Use proper algorithms, not heuristic shortcuts.",
            )

        # Weak types → auto-fix first (aggressive any→unknown), then LLM for rest
        if issue_type == "weak_types":
            # Always try auto first — TypeStrategy now handles most any positions
            return QualityPrediction(
                issue_type=issue_type,
                action="add_types",
                strategy="auto",
                confidence=0.85,
                source="rule",
                hint="Replace 'any' with 'unknown' or specific types. "
                     "Use discriminated unions for state/status fields. "
                     "Add generics where types are parameterized.",
            )

        # Bad naming → rename
        if issue_type == "bad_naming":
            can_auto = features.generic_name_ratio < 0.1
            return QualityPrediction(
                issue_type=issue_type,
                action="rename",
                strategy="auto" if can_auto else "prompt_hint",
                confidence=0.7,
                source="rule",
                hint="Replace generic names (data, result, item, obj) with "
                     "domain-specific names. Use semantic naming: 'finding' "
                     "not 'result', 'evidence' not 'data'.",
            )

        # Missing documentation
        if issue_type == "no_docs":
            return QualityPrediction(
                issue_type=issue_type,
                action="add_docs",
                strategy="prompt_hint",
                confidence=0.7,
                source="rule",
                hint="Add JSDoc to public methods. Document algorithms with "
                     "complexity notes. Include @param descriptions.",
            )

        # Shallow algorithms
        if issue_type == "shallow_algorithm":
            return QualityPrediction(
                issue_type=issue_type,
                action="rewrite_algorithm",
                strategy="llm_rewrite",
                confidence=0.85,
                source="rule",
                hint="Replace heuristic stubs with real algorithms. "
                     "Examples: Bayesian updates, TF-IDF scoring, graph traversal, "
                     "Dice coefficient. Implement actual computation.",
            )

        # Private field access
        if issue_type == "private_access":
            return QualityPrediction(
                issue_type=issue_type,
                action="restructure",
                strategy="prompt_hint",
                confidence=0.75,
                source="rule",
                hint="Don't access private fields via bracket notation. "
                     "Use public API methods or dependency injection.",
            )

        # Missing error handling → auto-fix first (validation + try/catch)
        if issue_type == "missing_error_handling":
            return QualityPrediction(
                issue_type=issue_type,
                action="add_error_handling",
                strategy="auto",
                confidence=0.7,
                source="rule",
                hint="Add input validation to constructors. Use typed errors "
                     "(TypeError, RangeError). Wrap I/O methods in try/catch.",
            )

        # Poor encapsulation → auto-fix with EncapsulationStrategy
        if issue_type == "poor_encapsulation":
            return QualityPrediction(
                issue_type=issue_type,
                action="encapsulate",
                strategy="auto",
                confidence=0.8,
                source="rule",
                hint="Add readonly to immutable fields. Use private for internal state. "
                     "Expose state through getters, not public fields.",
            )

        # Code typos → prompt hint (need LLM to understand context)
        if issue_type == "code_typos":
            return QualityPrediction(
                issue_type=issue_type,
                action="fix_typos",
                strategy="prompt_hint",
                confidence=0.9,
                source="rule",
                hint="Fix spelling errors in identifiers. Common LLM typos: "
                     "doubled words (TypeTypeError), transposed letters (snange→snake).",
            )

        # Hardcoded templates
        if issue_type == "hardcoded_template":
            return QualityPrediction(
                issue_type=issue_type,
                action="extract_constants",
                strategy="auto",
                confidence=0.65,
                source="rule",
                hint="Extract magic numbers to named constants. "
                     "Move hardcoded strings to configuration.",
            )

        # Poor structure (generic fallback)
        if issue_type == "poor_structure":
            return QualityPrediction(
                issue_type=issue_type,
                action="restructure",
                strategy="llm_rewrite",
                confidence=0.5,
                source="rule",
                hint="Improve separation of concerns. Use composition over "
                     "inheritance. Keep methods focused.",
            )

        # Default
        return QualityPrediction(
            issue_type=issue_type,
            action="llm_review",
            strategy="llm_rewrite",
            confidence=0.3,
            source="rule",
            hint="Review code quality and suggest improvements.",
        )

    # ── Hint generation ──────────────────────────────────────

    def _generate_hint(
        self, issue_type: str, action: str, features: QualityFeatures
    ) -> str:
        """Generate context-aware hint for LLM prompt."""
        hints = []

        if action == "add_types" and features.any_count > 0:
            hints.append(f"Found {features.any_count} 'any' types to replace.")
        if action == "rename" and features.generic_name_ratio > 0:
            hints.append(
                f"Generic name ratio: {features.generic_name_ratio:.0%}. "
                "Use domain-specific names."
            )
        if action == "rewrite_algorithm":
            hints.append(
                f"Complexity: {features.file_complexity:.3f} branches/LOC. "
                "Expected ≥0.03 for real implementations."
            )
        if features.has_dependency_injection < 0.3:
            hints.append("Consider dependency injection in constructors.")
        if features.has_event_pattern < 0.1 and features.class_count > 0:
            hints.append("Consider event-driven patterns (callbacks, emitters).")

        # Pull examples from DB if available
        if self.db:
            pairs = self.db.patterns_for_type(issue_type)
            if pairs:
                orig, improved = pairs[0]
                hints.append(f"Example fix:\n  Before: {orig}\n  After: {improved}")

        return " ".join(hints) if hints else ""

    # ── Decision tree ────────────────────────────────────────

    def _build_tree(
        self,
        X: List[List[float]],
        y: List[str],
        max_depth: int = 6,
        min_leaf: int = 3,
        depth: int = 0,
    ) -> TreeNode:
        """Build decision tree using information gain."""
        node = TreeNode()
        node.count = len(y)

        # Base case: pure node or limits reached
        unique = set(y)
        if len(unique) == 1 or depth >= max_depth or len(y) < min_leaf * 2:
            # Majority vote
            counts: Dict[str, int] = {}
            for label in y:
                counts[label] = counts.get(label, 0) + 1
            node.prediction = max(counts, key=lambda k: counts[k])
            return node

        # Find best split
        best_gain = 0.0
        best_feat = -1
        best_thresh = 0.0
        parent_entropy = self._entropy(y)

        n_features = len(X[0]) if X else 0
        for feat_idx in range(n_features):
            values = sorted(set(row[feat_idx] for row in X))
            for i in range(len(values) - 1):
                threshold = (values[i] + values[i + 1]) / 2.0
                left_y = [y[j] for j in range(len(X)) if X[j][feat_idx] <= threshold]
                right_y = [y[j] for j in range(len(X)) if X[j][feat_idx] > threshold]

                if len(left_y) < min_leaf or len(right_y) < min_leaf:
                    continue

                gain = parent_entropy - (
                    len(left_y) / len(y) * self._entropy(left_y)
                    + len(right_y) / len(y) * self._entropy(right_y)
                )

                if gain > best_gain:
                    best_gain = gain
                    best_feat = feat_idx
                    best_thresh = threshold

        if best_feat == -1:
            counts = {}
            for label in y:
                counts[label] = counts.get(label, 0) + 1
            node.prediction = max(counts, key=lambda k: counts[k])
            return node

        # Split
        node.feature_idx = best_feat
        node.threshold = best_thresh

        left_X = [X[j] for j in range(len(X)) if X[j][best_feat] <= best_thresh]
        left_y = [y[j] for j in range(len(X)) if X[j][best_feat] <= best_thresh]
        right_X = [X[j] for j in range(len(X)) if X[j][best_feat] > best_thresh]
        right_y = [y[j] for j in range(len(X)) if X[j][best_feat] > best_thresh]

        node.left = self._build_tree(left_X, left_y, max_depth, min_leaf, depth + 1)
        node.right = self._build_tree(right_X, right_y, max_depth, min_leaf, depth + 1)
        return node

    def _tree_predict(self, node: TreeNode, vec: List[float]) -> Optional[str]:
        """Traverse tree to get prediction."""
        if node.prediction is not None:
            return node.prediction
        if node.feature_idx < 0 or node.feature_idx >= len(vec):
            return None
        if vec[node.feature_idx] <= node.threshold:
            return self._tree_predict(node.left, vec) if node.left else None
        return self._tree_predict(node.right, vec) if node.right else None

    def _entropy(self, labels: List[str]) -> float:
        """Shannon entropy."""
        if not labels:
            return 0.0
        counts: Dict[str, int] = {}
        for l in labels:
            counts[l] = counts.get(l, 0) + 1
        n = len(labels)
        ent = 0.0
        for c in counts.values():
            p = c / n
            if p > 0:
                ent -= p * math.log2(p)
        return ent
