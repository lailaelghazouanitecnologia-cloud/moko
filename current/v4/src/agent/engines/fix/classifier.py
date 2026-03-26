"""
FixClassifier — learns from ErrorDB to predict fix strategies.

Two modes:
  1. Rule-based (bootstrap): hardcoded decision tree for known patterns.
     Works from day 1 with zero training data.
  2. Learned (after N records): builds a decision tree from ErrorDB features.
     Gets better with every project generated.

The classifier outputs an ACTION, not just a category:
  - "insert_brace"       → SyntaxStrategy handles
  - "fix_typo_TypeError"  → ConstructorTypoStrategy handles
  - "fix_double_dot"     → SyntaxStrategy handles
  - "add_import:<name>"  → ImportStrategy handles
  - "add_semicolon"      → SyntaxStrategy handles
  - "llm_fix"            → send to LLM
  - "skip_cascade"       → ignore, will resolve when root is fixed

No external dependencies — pure Python decision tree.
"""
from __future__ import annotations

import math
from collections import Counter
from dataclasses import dataclass, field
from typing import Optional

from .error_db import ErrorDB, ErrorRecord
from .features import ErrorFeatures, FeatureExtractor, FEATURE_NAMES


@dataclass
class Prediction:
    """Classifier output for one error."""
    action: str             # what to do
    strategy: str           # which strategy handles it
    confidence: float       # 0.0-1.0
    source: str             # "rule" or "learned"

    @property
    def is_auto_fixable(self) -> bool:
        return self.strategy != "llm" and self.strategy != "unknown"

    @property
    def should_skip(self) -> bool:
        return self.action == "skip_cascade"


# ── Decision Tree Node ───────────────────────────────────────

@dataclass
class TreeNode:
    """Node in a binary decision tree."""
    feature_idx: int = -1       # which feature to split on
    threshold: float = 0.5      # split value
    left: Optional["TreeNode"] = None    # feature <= threshold
    right: Optional["TreeNode"] = None   # feature > threshold
    prediction: Optional[str] = None     # leaf node action
    count: int = 0

    @property
    def is_leaf(self) -> bool:
        return self.prediction is not None


class FixClassifier:
    """Learns to classify TSC errors into fix actions.

    Bootstrap: rule-based decisions cover common patterns.
    After min_samples records in ErrorDB: learns a decision tree.
    """

    def __init__(self, error_db: Optional[ErrorDB] = None, min_samples: int = 30):
        self.error_db = error_db
        self.min_samples = min_samples
        self._tree: Optional[TreeNode] = None
        self._action_map: dict[str, str] = {}  # action → strategy
        self._extractor = FeatureExtractor()
        self._trained = False

    def predict(self, features: ErrorFeatures) -> Prediction:
        """Predict the best fix action for an error.

        Tries learned tree first (if available), falls back to rules.
        """
        # Try learned model if trained
        if self._trained and self._tree:
            vec = features.to_vector()
            action = self._tree_predict(self._tree, vec)
            if action and action != "unknown":
                strategy = self._action_map.get(action, "unknown")
                return Prediction(
                    action=action, strategy=strategy,
                    confidence=0.8, source="learned",
                )

        # Try ErrorDB similarity lookup
        if self.error_db:
            result = self.error_db.best_action_for(
                features.error_code, features.to_dict()
            )
            if result:
                action, strategy, conf = result
                if conf > 0.5:
                    return Prediction(
                        action=action, strategy=strategy,
                        confidence=conf, source="db_similar",
                    )

        # Fallback: rule-based
        return self._rule_based(features)

    def train(self) -> bool:
        """Train decision tree from ErrorDB records.

        Returns True if training succeeded.
        """
        if not self.error_db or len(self.error_db.records) < self.min_samples:
            return False

        # Build training data
        X: list[list[float]] = []
        y: list[str] = []

        for rec in self.error_db.records:
            if not rec.success or not rec.features:
                continue

            # Reconstruct feature vector from stored dict
            vec = self._dict_to_vector(rec.features)
            if vec:
                X.append(vec)
                y.append(rec.action)
                self._action_map[rec.action] = rec.strategy

        if len(X) < self.min_samples:
            return False

        # Build tree
        self._tree = self._build_tree(X, y, max_depth=6)
        self._trained = True
        return True

    def stats(self) -> dict:
        return {
            "trained": self._trained,
            "tree_depth": self._tree_depth(self._tree) if self._tree else 0,
            "known_actions": len(self._action_map),
            "db_records": len(self.error_db.records) if self.error_db else 0,
        }

    # ── Rule-based classifier (bootstrap, always available) ──

    def _rule_based(self, f: ErrorFeatures) -> Prediction:
        """Hardcoded decision tree for known patterns."""

        # Cascade detection: many errors on same line or tight cluster
        if f.errors_same_line >= 3:
            return Prediction("skip_cascade", "none", 0.9, "rule")

        # Missing brace before catch
        if f.pattern_missing_brace and f.has_catch_nearby:
            return Prediction("insert_brace", "syntax", 0.95, "rule")

        # Constructor typo
        if f.pattern_typo_constructor:
            return Prediction("fix_typo_constructor", "typo", 0.95, "rule")

        # Double dot
        if f.pattern_double_dot:
            return Prediction("fix_double_dot", "syntax", 0.95, "rule")

        # Missing semicolon
        if f.pattern_missing_semicolon and f.error_category == "syntax":
            return Prediction("add_semicolon", "syntax", 0.8, "rule")

        # Missing import
        if f.pattern_missing_import and f.error_code == "TS2304":
            return Prediction("add_import", "import", 0.85, "rule")

        # Syntax error in a cascade (near other errors)
        if f.error_category == "syntax" and f.errors_within_5 >= 3:
            return Prediction("skip_cascade", "none", 0.7, "rule")

        # Generic syntax
        if f.error_category == "syntax":
            return Prediction("llm_fix", "llm", 0.5, "rule")

        # Type error with specific patterns
        if f.error_code == "TS2304":  # Cannot find name
            return Prediction("add_import", "import", 0.6, "rule")

        if f.error_code in ("TS2339", "TS2322", "TS2345"):
            return Prediction("llm_fix", "llm", 0.5, "rule")

        # Default: needs LLM
        return Prediction("llm_fix", "llm", 0.3, "rule")

    # ── Decision Tree Implementation ─────────────────────────

    def _build_tree(self, X: list[list[float]], y: list[str],
                    max_depth: int = 6, min_leaf: int = 3) -> TreeNode:
        """Build a decision tree using information gain."""
        # Base cases
        if not X or not y:
            return TreeNode(prediction="llm_fix", count=0)

        unique = set(y)
        if len(unique) == 1:
            return TreeNode(prediction=y[0], count=len(y))

        if max_depth <= 0 or len(y) <= min_leaf:
            return TreeNode(prediction=Counter(y).most_common(1)[0][0], count=len(y))

        # Find best split
        best_gain = -1.0
        best_feature = 0
        best_threshold = 0.5
        n_features = len(X[0]) if X else 0

        parent_entropy = self._entropy(y)

        for feat_idx in range(n_features):
            values = sorted(set(row[feat_idx] for row in X))
            if len(values) <= 1:
                continue

            # Try midpoints between unique values
            thresholds = [(values[i] + values[i+1]) / 2
                         for i in range(min(len(values) - 1, 10))]

            for thresh in thresholds:
                left_y = [y[i] for i in range(len(X)) if X[i][feat_idx] <= thresh]
                right_y = [y[i] for i in range(len(X)) if X[i][feat_idx] > thresh]

                if len(left_y) < min_leaf or len(right_y) < min_leaf:
                    continue

                gain = parent_entropy - (
                    len(left_y) / len(y) * self._entropy(left_y) +
                    len(right_y) / len(y) * self._entropy(right_y)
                )

                if gain > best_gain:
                    best_gain = gain
                    best_feature = feat_idx
                    best_threshold = thresh

        # No good split found
        if best_gain <= 0:
            return TreeNode(prediction=Counter(y).most_common(1)[0][0], count=len(y))

        # Split
        left_X = [X[i] for i in range(len(X)) if X[i][best_feature] <= best_threshold]
        left_y = [y[i] for i in range(len(X)) if X[i][best_feature] <= best_threshold]
        right_X = [X[i] for i in range(len(X)) if X[i][best_feature] > best_threshold]
        right_y = [y[i] for i in range(len(X)) if X[i][best_feature] > best_threshold]

        return TreeNode(
            feature_idx=best_feature,
            threshold=best_threshold,
            left=self._build_tree(left_X, left_y, max_depth - 1, min_leaf),
            right=self._build_tree(right_X, right_y, max_depth - 1, min_leaf),
            count=len(y),
        )

    def _tree_predict(self, node: TreeNode, x: list[float]) -> str:
        """Traverse tree to get prediction."""
        if node.is_leaf:
            return node.prediction or "llm_fix"

        if node.feature_idx < len(x) and x[node.feature_idx] <= node.threshold:
            return self._tree_predict(node.left, x) if node.left else "llm_fix"
        else:
            return self._tree_predict(node.right, x) if node.right else "llm_fix"

    def _tree_depth(self, node: Optional[TreeNode]) -> int:
        if not node or node.is_leaf:
            return 0
        return 1 + max(self._tree_depth(node.left), self._tree_depth(node.right))

    def _entropy(self, labels: list[str]) -> float:
        """Shannon entropy."""
        if not labels:
            return 0.0
        n = len(labels)
        counts = Counter(labels)
        ent = 0.0
        for count in counts.values():
            p = count / n
            if p > 0:
                ent -= p * math.log2(p)
        return ent

    def _dict_to_vector(self, features_dict: dict) -> Optional[list[float]]:
        """Convert stored feature dict back to numeric vector."""
        try:
            cat_map = {"syntax": 0, "type": 1, "import": 2, "other": 3}
            code = features_dict.get("error_code", "TS0000")
            code_match = __import__('re').match(r'TS(\d+)', code)
            code_num = float(code_match.group(1)) / 10000 if code_match else 0.5

            return [
                code_num,
                cat_map.get(features_dict.get("error_category", "other"), 3),
                features_dict.get("brace_depth", 0),
                features_dict.get("indent_level", 0),
                features_dict.get("line_position", 0.5),
                min(features_dict.get("file_size", 100) / 500.0, 1.0),
                float(features_dict.get("has_try_nearby", False)),
                float(features_dict.get("has_catch_nearby", False)),
                float(features_dict.get("has_import_nearby", False)),
                float(features_dict.get("has_class_nearby", False)),
                float(features_dict.get("has_function_nearby", False)),
                float(features_dict.get("has_return_nearby", False)),
                float(features_dict.get("has_double_dot", False)),
                float(features_dict.get("has_new_keyword", False)),
                float(features_dict.get("has_throw_keyword", False)),
                float(features_dict.get("has_semicolon", False)),
                float(features_dict.get("ends_with_brace", False)),
                float(features_dict.get("ends_with_semicolon", False)),
                float(features_dict.get("ends_with_paren", False)),
                min(features_dict.get("errors_same_line", 0) / 5.0, 1.0),
                min(features_dict.get("errors_within_5", 0) / 10.0, 1.0),
                min(features_dict.get("errors_within_10", 0) / 20.0, 1.0),
                features_dict.get("error_density", 0),
                float(features_dict.get("pattern_missing_brace", False)),
                float(features_dict.get("pattern_typo_constructor", False)),
                float(features_dict.get("pattern_double_dot", False)),
                float(features_dict.get("pattern_missing_semicolon", False)),
                float(features_dict.get("pattern_missing_import", False)),
            ]
        except (KeyError, TypeError, ValueError):
            return None
