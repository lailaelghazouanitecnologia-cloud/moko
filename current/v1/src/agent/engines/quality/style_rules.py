"""
StyleRules — user-configurable style rules system (like CLAUDE.md for AVA).

Hierarchy (lower overrides higher):
  ~/.ava/style.yaml              → Global user defaults
  ~/.ava/rules/*.md              → Global rules (markdown)
  <project>/.ava/style.yaml      → Project-specific style
  <project>/.ava/rules/*.md      → Project-specific rules
  <project>/ava.md               → Quick project instructions (free-form)

The system separates:
  - StyleRules (this module): user PREFERENCES, loaded from config files
  - CodeProfile metrics (learned_scorer): objective ANALYSIS, independent of style

StyleRules influence:
  1. System prompt construction (to_system_prompt)
  2. Scorer threshold tuning (to_scoring_config)
  3. Post-generation validation (validate_code)
"""
from __future__ import annotations

import fnmatch
import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

try:
    import yaml
except ImportError:
    yaml = None  # type: ignore


# ── Data Models ──────────────────────────────────────────────

@dataclass
class StructureRules:
    max_function_length: int = 50
    max_nesting_depth: int = 3
    max_parameters: int = 4
    max_class_methods: int = 10
    max_line_length: int = 100


@dataclass
class NamingRules:
    variables: str = "camelCase"
    functions: str = "camelCase"
    classes: str = "PascalCase"
    constants: str = "UPPER_SNAKE"
    prefixes: Dict[str, str] = field(default_factory=dict)
    units_last: bool = False
    no_abbreviations: bool = False


@dataclass
class ErrorRules:
    strategy: str = "exceptions"        # exceptions | result_types | error_codes
    no_exceptions: bool = False
    require_braces: bool = True
    fail_fast: bool = True


@dataclass
class SafetyRules:
    prefer_static_allocation: bool = False
    min_assertions_per_function: int = 0
    assert_positive_and_negative: bool = False
    smallest_scope: bool = True
    initialize_on_declare: bool = True


@dataclass
class DocRules:
    comments_explain_why: bool = True
    comments_are_sentences: bool = False
    no_obvious_comments: bool = True


@dataclass
class PatternRules:
    prefer: List[str] = field(default_factory=list)
    avoid: List[str] = field(default_factory=list)


@dataclass
class FormattingRules:
    brace_style: str = "k&r"           # k&r | allman
    indent: int = 2


@dataclass
class StyleViolation:
    """A detected style rule violation."""
    file: str
    line: int
    rule: str
    message: str
    severity: str = "warning"          # warning | error

    def __str__(self) -> str:
        return f"{self.file}:{self.line} [{self.severity}] {self.rule}: {self.message}"


@dataclass
class RuleFile:
    """A parsed rules/*.md file with optional path scoping."""
    path: str
    content: str
    scope_patterns: List[str] = field(default_factory=list)

    def applies_to(self, file_path: str) -> bool:
        """Check if this rule applies to the given file path."""
        if not self.scope_patterns:
            return True
        return any(fnmatch.fnmatch(file_path, p) for p in self.scope_patterns)


# ── StyleRules ───────────────────────────────────────────────

@dataclass
class StyleRules:
    """Parsed and merged style rules from all sources."""
    language: str = "typescript"
    priorities: List[str] = field(default_factory=lambda: ["safety", "performance", "developer_experience"])
    structure: StructureRules = field(default_factory=StructureRules)
    naming: NamingRules = field(default_factory=NamingRules)
    errors: ErrorRules = field(default_factory=ErrorRules)
    safety: SafetyRules = field(default_factory=SafetyRules)
    documentation: DocRules = field(default_factory=DocRules)
    patterns: PatternRules = field(default_factory=PatternRules)
    formatting: FormattingRules = field(default_factory=FormattingRules)
    raw_markdown: List[str] = field(default_factory=list)
    rule_files: List[RuleFile] = field(default_factory=list)

    @classmethod
    def load(cls, project_dir: Path) -> "StyleRules":
        """Load and merge style rules: ~/.ava/ → .ava/ → ava.md.

        Later sources override earlier ones.
        """
        rules = cls()

        # 1. Global user config
        global_dir = Path.home() / ".ava"
        if global_dir.exists():
            rules._load_yaml(global_dir / "style.yaml")
            rules._load_rules_dir(global_dir / "rules")

        # 2. Project config
        project_ava = project_dir / ".ava"
        if project_ava.exists():
            rules._load_yaml(project_ava / "style.yaml")
            rules._load_rules_dir(project_ava / "rules")

        # 3. Quick project instructions (ava.md)
        ava_md = project_dir / "ava.md"
        if ava_md.exists():
            try:
                content = ava_md.read_text().strip()
                if content:
                    rules.raw_markdown.append(content)
            except Exception:
                pass

        return rules

    def _load_yaml(self, path: Path):
        """Load a style.yaml file and merge into current rules."""
        if not path.exists() or yaml is None:
            return

        try:
            data = yaml.safe_load(path.read_text())
        except Exception:
            return

        if not isinstance(data, dict):
            return

        if "language" in data:
            self.language = data["language"]
        if "priorities" in data and isinstance(data["priorities"], list):
            self.priorities = data["priorities"]

        # Structure
        if "structure" in data and isinstance(data["structure"], dict):
            s = data["structure"]
            if "max_function_length" in s:
                self.structure.max_function_length = int(s["max_function_length"])
            if "max_nesting_depth" in s:
                self.structure.max_nesting_depth = int(s["max_nesting_depth"])
            if "max_parameters" in s:
                self.structure.max_parameters = int(s["max_parameters"])
            if "max_class_methods" in s:
                self.structure.max_class_methods = int(s["max_class_methods"])
            if "max_line_length" in s:
                self.structure.max_line_length = int(s["max_line_length"])

        # Naming
        if "naming" in data and isinstance(data["naming"], dict):
            n = data["naming"]
            for attr in ("variables", "functions", "classes", "constants"):
                if attr in n:
                    setattr(self.naming, attr, str(n[attr]))
            if "prefixes" in n and isinstance(n["prefixes"], dict):
                self.naming.prefixes = n["prefixes"]
            if "units_last" in n:
                self.naming.units_last = bool(n["units_last"])
            if "no_abbreviations" in n:
                self.naming.no_abbreviations = bool(n["no_abbreviations"])

        # Errors
        if "errors" in data and isinstance(data["errors"], dict):
            e = data["errors"]
            if "strategy" in e:
                self.errors.strategy = str(e["strategy"])
            if "no_exceptions" in e:
                self.errors.no_exceptions = bool(e["no_exceptions"])
            if "require_braces" in e:
                self.errors.require_braces = bool(e["require_braces"])
            if "fail_fast" in e:
                self.errors.fail_fast = bool(e["fail_fast"])

        # Safety
        if "safety" in data and isinstance(data["safety"], dict):
            sf = data["safety"]
            if "prefer_static_allocation" in sf:
                self.safety.prefer_static_allocation = bool(sf["prefer_static_allocation"])
            if "min_assertions_per_function" in sf:
                self.safety.min_assertions_per_function = int(sf["min_assertions_per_function"])
            if "assert_positive_and_negative" in sf:
                self.safety.assert_positive_and_negative = bool(sf["assert_positive_and_negative"])
            if "smallest_scope" in sf:
                self.safety.smallest_scope = bool(sf["smallest_scope"])
            if "initialize_on_declare" in sf:
                self.safety.initialize_on_declare = bool(sf["initialize_on_declare"])

        # Documentation
        if "documentation" in data and isinstance(data["documentation"], dict):
            d = data["documentation"]
            if "comments_explain_why" in d:
                self.documentation.comments_explain_why = bool(d["comments_explain_why"])
            if "comments_are_sentences" in d:
                self.documentation.comments_are_sentences = bool(d["comments_are_sentences"])
            if "no_obvious_comments" in d:
                self.documentation.no_obvious_comments = bool(d["no_obvious_comments"])

        # Patterns
        if "patterns" in data and isinstance(data["patterns"], dict):
            pt = data["patterns"]
            if "prefer" in pt and isinstance(pt["prefer"], list):
                self.patterns.prefer = pt["prefer"]
            if "avoid" in pt and isinstance(pt["avoid"], list):
                self.patterns.avoid = pt["avoid"]

        # Formatting
        if "formatting" in data and isinstance(data["formatting"], dict):
            fm = data["formatting"]
            if "brace_style" in fm:
                self.formatting.brace_style = str(fm["brace_style"])
            if "indent" in fm:
                self.formatting.indent = int(fm["indent"])

    def _load_rules_dir(self, rules_dir: Path):
        """Load all *.md files from a rules directory."""
        if not rules_dir.exists():
            return
        for md_file in sorted(rules_dir.glob("*.md")):
            try:
                raw = md_file.read_text()
                scope_patterns, content = self._parse_rule_file(raw)
                rf = RuleFile(
                    path=str(md_file),
                    content=content.strip(),
                    scope_patterns=scope_patterns,
                )
                if rf.content:
                    self.rule_files.append(rf)
                    self.raw_markdown.append(rf.content)
            except Exception:
                pass

    @staticmethod
    def _parse_rule_file(raw: str) -> Tuple[List[str], str]:
        """Parse a rule file with optional YAML frontmatter for path scoping.

        Format:
            ---
            paths:
              - "src/engine/**/*.ts"
            ---
            # Rule title
            - rule content...
        """
        scope_patterns: List[str] = []
        content = raw

        if raw.startswith("---"):
            parts = raw.split("---", 2)
            if len(parts) >= 3:
                frontmatter = parts[1].strip()
                content = parts[2].strip()
                if yaml is not None:
                    try:
                        meta = yaml.safe_load(frontmatter)
                        if isinstance(meta, dict) and "paths" in meta:
                            scope_patterns = meta["paths"]
                    except Exception:
                        pass

        return scope_patterns, content

    # ── Prompt Generation ────────────────────────────────────

    def to_system_prompt(self) -> str:
        """Convert rules to a system prompt section for the LLM.

        This generates dynamic instructions that replace or augment
        the hardcoded TRANSLATE_SYSTEM rules based on user preferences.
        """
        sections: List[str] = []

        # Priorities
        if self.priorities:
            sections.append(f"PRIORITIES (ordered): {', '.join(self.priorities)}")

        # Structure constraints
        struct_rules = []
        s = self.structure
        struct_rules.append(f"Max function length: {s.max_function_length} LOC")
        struct_rules.append(f"Max nesting depth: {s.max_nesting_depth}")
        struct_rules.append(f"Max parameters per function: {s.max_parameters}")
        struct_rules.append(f"Max methods per class: {s.max_class_methods}")
        if struct_rules:
            sections.append("STRUCTURE:\n" + "\n".join(f"- {r}" for r in struct_rules))

        # Naming conventions
        naming_rules = []
        n = self.naming
        naming_rules.append(f"Variables: {n.variables}")
        naming_rules.append(f"Functions: {n.functions}")
        naming_rules.append(f"Classes: {n.classes}")
        naming_rules.append(f"Constants: {n.constants}")
        if n.no_abbreviations:
            naming_rules.append("No abbreviations — use full descriptive names")
        if n.units_last:
            naming_rules.append("Units go last in names: latencyMsMax, not maxLatencyMs")
        if n.prefixes:
            for scope, prefix in n.prefixes.items():
                naming_rules.append(f"{scope} prefix: {prefix}")
        if naming_rules:
            sections.append("NAMING:\n" + "\n".join(f"- {r}" for r in naming_rules))

        # Error handling
        err_rules = []
        e = self.errors
        if e.strategy == "result_types":
            err_rules.append("Use Result<T, E> types for error handling, not exceptions")
        elif e.strategy == "error_codes":
            err_rules.append("Use error codes for error handling")
        if e.no_exceptions:
            err_rules.append("NEVER throw exceptions — use return values for errors")
        if e.fail_fast:
            err_rules.append("Fail fast: validate preconditions at function entry")
        if err_rules:
            sections.append("ERROR HANDLING:\n" + "\n".join(f"- {r}" for r in err_rules))

        # Safety
        safety_rules = []
        sf = self.safety
        if sf.prefer_static_allocation:
            safety_rules.append("Prefer static allocation over dynamic allocation")
        if sf.min_assertions_per_function > 0:
            safety_rules.append(
                f"At least {sf.min_assertions_per_function} assertion(s) per function"
            )
        if sf.smallest_scope:
            safety_rules.append("Use smallest possible scope for all variables")
        if sf.initialize_on_declare:
            safety_rules.append("Always initialize variables at declaration")
        if safety_rules:
            sections.append("SAFETY:\n" + "\n".join(f"- {r}" for r in safety_rules))

        # Documentation
        doc_rules = []
        d = self.documentation
        if d.comments_explain_why:
            doc_rules.append("Comments explain WHY, not WHAT")
        if d.comments_are_sentences:
            doc_rules.append("Comments must be complete sentences")
        if d.no_obvious_comments:
            doc_rules.append("NO obvious comments — never restate what code already says")
        if doc_rules:
            sections.append("DOCUMENTATION:\n" + "\n".join(f"- {r}" for r in doc_rules))

        # Design patterns
        if self.patterns.prefer:
            sections.append(
                "PREFERRED PATTERNS:\n" +
                "\n".join(f"- {p}" for p in self.patterns.prefer)
            )
        if self.patterns.avoid:
            sections.append(
                "AVOID THESE PATTERNS:\n" +
                "\n".join(f"- {p}" for p in self.patterns.avoid)
            )

        # Formatting
        fmt_rules = []
        fm = self.formatting
        fmt_rules.append(f"Brace style: {fm.brace_style}")
        fmt_rules.append(f"Indent: {fm.indent} spaces")
        if fmt_rules:
            sections.append("FORMATTING:\n" + "\n".join(f"- {r}" for r in fmt_rules))

        # Raw markdown from ava.md and rules/*.md
        for md in self.raw_markdown:
            sections.append(md)

        if not sections:
            return ""

        return "\n\n".join(sections)

    def to_system_prompt_for_file(self, file_path: str) -> str:
        """Generate prompt section filtered to rules that apply to a specific file."""
        # Start with the base prompt (structure, naming, etc. always apply)
        base = self.to_system_prompt()

        # Add only scoped rules that match this file
        scoped_rules = []
        for rf in self.rule_files:
            if rf.scope_patterns and rf.applies_to(file_path):
                scoped_rules.append(rf.content)

        if scoped_rules:
            return base + "\n\n" + "\n\n".join(scoped_rules)
        return base

    # ── Scoring Config ───────────────────────────────────────

    def to_scoring_config(self) -> Dict[str, Any]:
        """Convert style rules to metric thresholds for the scorer.

        When a user sets max_function_length: 50, the long_function_ratio
        metric should use 50 as the threshold, not a hardcoded default.
        """
        config: Dict[str, Any] = {}
        s = self.structure

        config["long_function_threshold"] = s.max_function_length
        config["max_nesting_threshold"] = s.max_nesting_depth
        config["max_parameters_threshold"] = s.max_parameters
        config["god_class_method_threshold"] = s.max_class_methods
        config["max_line_length"] = s.max_line_length

        # Error handling preferences affect scoring
        if self.errors.strategy == "result_types":
            config["prefer_result_types"] = True
        if self.errors.no_exceptions:
            config["penalize_exceptions"] = True

        # Safety rules affect assertion density expectations
        if self.safety.min_assertions_per_function > 0:
            config["min_assertions_per_function"] = self.safety.min_assertions_per_function

        return config

    # ── Automated Validation ─────────────────────────────────

    def validate_code(self, code: str, file_path: str = "<unknown>") -> List[StyleViolation]:
        """Check code against rules without LLM. Fast, automated post-processing.

        Returns a list of violations found. This runs after generation,
        before commit, to catch obvious rule violations.
        """
        violations: List[StyleViolation] = []
        lines = code.split("\n")

        # Check scoped rules
        applicable_rule_files = [
            rf for rf in self.rule_files
            if rf.applies_to(file_path)
        ]

        # ── Structure checks ──
        self._check_function_lengths(lines, file_path, violations)
        self._check_nesting_depth(lines, file_path, violations)
        self._check_parameter_counts(code, file_path, violations)
        self._check_line_lengths(lines, file_path, violations)

        # ── Naming checks ──
        self._check_naming(code, file_path, violations)

        # ── Documentation checks ──
        if self.documentation.no_obvious_comments:
            self._check_obvious_comments(lines, file_path, violations)

        # ── Error handling checks ──
        if self.errors.no_exceptions:
            self._check_no_exceptions(lines, file_path, violations)

        # ── Formatting checks ──
        self._check_formatting(lines, file_path, violations)

        return violations

    def _check_function_lengths(
        self, lines: List[str], file_path: str, violations: List[StyleViolation]
    ):
        """Check that no function exceeds max length."""
        max_len = self.structure.max_function_length
        func_start = None
        func_name = ""
        brace_depth = 0

        for i, line in enumerate(lines, 1):
            # Detect function start
            m = re.match(
                r'\s*(?:(?:private|public|protected|static|async|export)\s+)*'
                r'(?:function\s+)?(\w+)\s*(?:<[^>]*>)?\s*\([^)]*\)',
                line
            )
            if m and '{' in line:
                if func_start is not None:
                    pass  # nested — skip
                else:
                    func_start = i
                    func_name = m.group(1)
                    brace_depth = 0

            if func_start is not None:
                brace_depth += line.count('{') - line.count('}')
                if brace_depth <= 0:
                    length = i - func_start + 1
                    if length > max_len:
                        violations.append(StyleViolation(
                            file=file_path, line=func_start,
                            rule="max_function_length",
                            message=f"Function '{func_name}' is {length} LOC (max: {max_len})",
                        ))
                    func_start = None
                    func_name = ""

    def _check_nesting_depth(
        self, lines: List[str], file_path: str, violations: List[StyleViolation]
    ):
        """Check that nesting doesn't exceed max depth."""
        max_depth = self.structure.max_nesting_depth
        depth = 0
        for i, line in enumerate(lines, 1):
            depth += line.count('{') - line.count('}')
            if depth > max_depth:
                violations.append(StyleViolation(
                    file=file_path, line=i,
                    rule="max_nesting_depth",
                    message=f"Nesting depth {depth} exceeds max {max_depth}",
                ))

    def _check_parameter_counts(
        self, code: str, file_path: str, violations: List[StyleViolation]
    ):
        """Check parameter counts on function signatures."""
        max_params = self.structure.max_parameters
        for m in re.finditer(
            r'(?:function\s+)?(\w+)\s*\(([^)]*)\)\s*[:{]', code
        ):
            name = m.group(1)
            params_str = m.group(2).strip()
            if not params_str:
                continue
            params = [p.strip() for p in params_str.split(',') if p.strip()]
            if len(params) > max_params:
                # Find line number
                line_no = code[:m.start()].count('\n') + 1
                violations.append(StyleViolation(
                    file=file_path, line=line_no,
                    rule="max_parameters",
                    message=f"'{name}' has {len(params)} params (max: {max_params})",
                ))

    def _check_line_lengths(
        self, lines: List[str], file_path: str, violations: List[StyleViolation]
    ):
        """Check line lengths."""
        max_len = self.structure.max_line_length
        for i, line in enumerate(lines, 1):
            if len(line) > max_len and not line.strip().startswith("//"):
                violations.append(StyleViolation(
                    file=file_path, line=i,
                    rule="max_line_length",
                    message=f"Line is {len(line)} chars (max: {max_len})",
                    severity="warning",
                ))

    def _check_naming(
        self, code: str, file_path: str, violations: List[StyleViolation]
    ):
        """Check naming convention consistency."""
        n = self.naming

        # Check class names are PascalCase
        if n.classes == "PascalCase":
            for m in re.finditer(r'\bclass\s+(\w+)', code):
                name = m.group(1)
                if not re.match(r'^[A-Z][a-zA-Z0-9]*$', name):
                    line_no = code[:m.start()].count('\n') + 1
                    violations.append(StyleViolation(
                        file=file_path, line=line_no,
                        rule="naming_classes",
                        message=f"Class '{name}' should be PascalCase",
                    ))

        # Check for abbreviations if disabled
        if n.no_abbreviations:
            # Find short identifiers (< 4 chars) in declarations
            for m in re.finditer(
                r'(?:const|let|var|private|public|protected)\s+(?:readonly\s+)?(\w{1,3})\b',
                code
            ):
                name = m.group(1)
                if name not in ('i', 'j', 'k', 'e', '_', 'id', 'ok', 'fn'):
                    line_no = code[:m.start()].count('\n') + 1
                    violations.append(StyleViolation(
                        file=file_path, line=line_no,
                        rule="no_abbreviations",
                        message=f"Identifier '{name}' is too short — use full name",
                        severity="warning",
                    ))

    def _check_obvious_comments(
        self, lines: List[str], file_path: str, violations: List[StyleViolation]
    ):
        """Detect obviously redundant comments."""
        obvious_patterns = [
            r'//\s*constructor',
            r'//\s*getter',
            r'//\s*setter',
            r'//\s*import',
            r'//\s*export',
            r'//\s*return\b',
            r'/\*\*\s*Gets?\s+the\s+\w+\.\s*\*/',
            r'/\*\*\s*Sets?\s+the\s+\w+\.\s*\*/',
        ]
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            for pattern in obvious_patterns:
                if re.match(pattern, stripped, re.IGNORECASE):
                    violations.append(StyleViolation(
                        file=file_path, line=i,
                        rule="no_obvious_comments",
                        message=f"Redundant comment: {stripped[:60]}",
                        severity="warning",
                    ))
                    break

    def _check_no_exceptions(
        self, lines: List[str], file_path: str, violations: List[StyleViolation]
    ):
        """Check that no throw statements are used (when no_exceptions=True)."""
        for i, line in enumerate(lines, 1):
            if re.search(r'\bthrow\s+new\b', line):
                violations.append(StyleViolation(
                    file=file_path, line=i,
                    rule="no_exceptions",
                    message="throw statement used — use Result types instead",
                ))

    def _check_formatting(
        self, lines: List[str], file_path: str, violations: List[StyleViolation]
    ):
        """Check formatting rules."""
        expected_indent = self.formatting.indent

        # Check indent consistency (sample first 50 lines with indentation)
        indent_sizes = []
        for line in lines[:100]:
            stripped = line.lstrip()
            if not stripped or stripped.startswith('//') or stripped.startswith('*'):
                continue
            indent = len(line) - len(stripped)
            if indent > 0:
                indent_sizes.append(indent)

        if indent_sizes:
            # Check that indents are multiples of expected
            bad_indents = [
                s for s in indent_sizes
                if s % expected_indent != 0 and s > 0
            ]
            if len(bad_indents) > len(indent_sizes) * 0.3:
                violations.append(StyleViolation(
                    file=file_path, line=1,
                    rule="indent",
                    message=f"Inconsistent indentation — expected multiples of {expected_indent}",
                    severity="warning",
                ))

    # ── Template Generation ──────────────────────────────────

    @classmethod
    def generate_template(cls, project_dir: Path, language: str = "typescript"):
        """Generate a .ava/ template structure for a project.

        Creates:
          .ava/style.yaml    — default style config
          .ava/rules/         — empty rules directory
          ava.md              — empty project instructions
        """
        ava_dir = project_dir / ".ava"
        rules_dir = ava_dir / "rules"
        rules_dir.mkdir(parents=True, exist_ok=True)

        # style.yaml
        style_yaml = ava_dir / "style.yaml"
        if not style_yaml.exists():
            style_yaml.write_text(_DEFAULT_STYLE_YAML.format(language=language))

        # ava.md
        ava_md = project_dir / "ava.md"
        if not ava_md.exists():
            ava_md.write_text(_DEFAULT_AVA_MD)

        # Example rule file
        example_rule = rules_dir / "example.md"
        if not example_rule.exists():
            example_rule.write_text(_DEFAULT_RULE_MD)

    def has_custom_rules(self) -> bool:
        """Check if any user rules have been configured."""
        return bool(self.raw_markdown) or bool(self.rule_files)


# ── Templates ────────────────────────────────────────────────

_DEFAULT_STYLE_YAML = """# AVA Style Configuration
# Customize how AVA generates code for this project.
# See: https://github.com/moko/ava/docs/style-rules.md

language: {language}

# Design priorities (ordered by importance)
priorities:
  - safety
  - performance
  - developer_experience

structure:
  max_function_length: 50
  max_nesting_depth: 3
  max_parameters: 4
  max_class_methods: 10
  max_line_length: 100

naming:
  variables: camelCase
  functions: camelCase
  classes: PascalCase
  constants: UPPER_SNAKE
  no_abbreviations: false

errors:
  strategy: exceptions      # exceptions | result_types | error_codes
  fail_fast: true

documentation:
  comments_explain_why: true
  no_obvious_comments: true

patterns:
  prefer:
    - guard_clauses
    - dependency_injection
    - immutability
  avoid:
    - god_objects
    - callback_hell
    - magic_numbers

formatting:
  brace_style: k&r
  indent: 2
"""

_DEFAULT_AVA_MD = """# Project Instructions

<!-- Write free-form instructions for AVA here.
     This file works like CLAUDE.md — its content is injected
     into the system prompt when generating code for this project. -->
"""

_DEFAULT_RULE_MD = """---
# Optional: scope this rule to specific file patterns
# paths:
#   - "src/engine/**/*.ts"
---

# Example Rule

<!-- Delete this file and create your own rules in .ava/rules/ -->
<!-- Each .md file becomes a separate rule that AVA follows. -->

- Use descriptive variable names
- Keep functions focused on a single responsibility
"""
