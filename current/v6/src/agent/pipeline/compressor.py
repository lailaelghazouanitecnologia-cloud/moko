"""
Compression Engine — intelligent token reduction for Roska descriptors.

5 compression strategies applied in sequence:

1. SIGNATURE COMPRESSION: Truncate long function signatures to essential info
   - "constructor(private taskState: TaskState, ...20 more params)" → one line
   - Method sigs: keep name + return type, drop full params

2. STRUCTURAL COMPRESSION: Extract structure, drop verbosity
   - Keep type names, method names, field names
   - Drop: default values, inline code, long comments
   - Preserve: imports (critical for deps), call lists

3. DEDUPLICATION: Track what the LLM already saw
   - Never send the same descriptor twice in a session
   - On follow-up queries, send only the abstract context + new descriptors

4. BUDGET ALLOCATION: Distribute token budget intelligently
   - workspace.yaml: always full (~400 tokens)
   - deps.yaml: compressed summary (~500 tokens)
   - file descriptors: allocated proportionally by relevance score

5. PROGRESSIVE DETAIL: Start with overview, add detail on demand
   - Level 0: module names + counts only (from workspace.yaml)
   - Level 1: type names + function names (no signatures)
   - Level 2: signatures + imports + call lists (full detail)

A CompressionPolicy configures which strategies to apply and how aggressively.
"""

import re
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class CompressionPolicy:
    """Controls how aggressively to compress."""
    # Budget
    target_tokens: int = 8000        # target token budget for descriptors
    max_tokens_per_file: int = 800   # max tokens per individual file descriptor
    # Signature compression
    max_sig_length: int = 80         # truncate signatures longer than this
    keep_constructor_params: bool = False  # drop constructor param details
    # Structural
    drop_defaults: bool = True       # drop default values from fields
    drop_detail_block: bool = False  # drop detail: sections (calls, opcodes)
    keep_imports: bool = True        # always keep import lists
    keep_calls: bool = True          # keep call lists (important for deps)
    # Progressive detail level
    detail_level: int = 1            # 0=overview, 1=names, 2=full

    @classmethod
    def fast(cls) -> "CompressionPolicy":
        """/fast mode — extreme compression, only essential structure."""
        return cls(
            target_tokens=2000,
            max_tokens_per_file=200,
            max_sig_length=40,
            keep_constructor_params=False,
            drop_defaults=True,
            drop_detail_block=True,
            keep_imports=False,
            keep_calls=False,
            detail_level=0,
        )

    @classmethod
    def aggressive(cls) -> "CompressionPolicy":
        """Maximum compression — for large projects or tight budgets."""
        return cls(
            target_tokens=4000,
            max_tokens_per_file=400,
            max_sig_length=60,
            drop_defaults=True,
            drop_detail_block=True,
            keep_calls=False,
            detail_level=0,
        )

    @classmethod
    def balanced(cls) -> "CompressionPolicy":
        """Default — good balance of detail and economy."""
        return cls(
            target_tokens=8000,
            max_tokens_per_file=800,
            max_sig_length=80,
            drop_defaults=True,
            drop_detail_block=False,
            keep_calls=True,
            detail_level=1,
        )

    @classmethod
    def detailed(cls) -> "CompressionPolicy":
        """Minimal compression — when user asks for deep dive."""
        return cls(
            target_tokens=14000,
            max_tokens_per_file=1500,
            max_sig_length=200,
            drop_defaults=False,
            drop_detail_block=False,
            keep_calls=True,
            detail_level=2,
        )


@dataclass
class CompressionResult:
    """Output of the compression engine."""
    content: str
    original_chars: int
    compressed_chars: int
    ratio: float                     # compressed/original
    tokens_estimated: int
    strategies_applied: list[str]


class CompressionEngine:
    """Applies compression strategies to Roska YAML descriptors."""

    def __init__(self, policy: CompressionPolicy = None):
        self.policy = policy or CompressionPolicy.balanced()

    def compress_descriptor(self, content: str, descriptor_type: str = "file") -> str:
        """Compress a single descriptor based on type and policy."""
        if descriptor_type == "workspace":
            return content  # always full

        if descriptor_type == "deps":
            return self._compress_deps(content)

        if descriptor_type in ("module", "graph"):
            return self._compress_structural(content)

        # File descriptors get full treatment
        result = content

        if self.policy.detail_level <= 1:
            result = self._compress_signatures(result)

        if self.policy.drop_defaults:
            result = self._drop_defaults(result)

        if self.policy.drop_detail_block:
            result = self._drop_detail_blocks(result)

        result = self._compress_structural(result)

        # Enforce per-file limit
        char_limit = self.policy.max_tokens_per_file * 4
        if len(result) > char_limit:
            result = result[:char_limit] + "\n  # ... (truncated)"

        return result

    def compress_batch(self, descriptors: list[tuple[str, str, str]],
                       budget_chars: int = None) -> CompressionResult:
        """Compress a batch of (path, content, type) tuples within budget.

        Returns combined compressed content.
        """
        if budget_chars is None:
            budget_chars = self.policy.target_tokens * 4

        original_total = sum(len(c) for _, c, _ in descriptors)
        parts = []
        total_chars = 0
        strategies = set()

        for path, content, dtype in descriptors:
            compressed = self.compress_descriptor(content, dtype)
            if total_chars + len(compressed) > budget_chars:
                # Try more aggressive compression
                aggressive = CompressionEngine(CompressionPolicy.aggressive())
                compressed = aggressive.compress_descriptor(content, dtype)
                strategies.add("budget_squeeze")

            if total_chars + len(compressed) > budget_chars:
                strategies.add("truncated")
                break

            parts.append(f"# {path}\n{compressed}")
            total_chars += len(compressed)

        combined = "\n\n".join(parts)
        compressed_total = len(combined)

        strategies.update(self._strategies_used())
        return CompressionResult(
            content=combined,
            original_chars=original_total,
            compressed_chars=compressed_total,
            ratio=round(compressed_total / max(original_total, 1), 2),
            tokens_estimated=compressed_total // 4,
            strategies_applied=sorted(strategies),
        )

    # ── Strategy 1: Signature Compression ───────────────────────

    def _compress_signatures(self, content: str) -> str:
        """Truncate verbose function/method signatures."""
        lines = content.splitlines()
        result = []
        in_sig = False
        sig_indent = 0

        for line in lines:
            stripped = line.strip()

            # Detect multi-line signature start
            if stripped.startswith("sig:") and len(stripped) > self.policy.max_sig_length:
                # Extract just the function name and return type
                sig_match = re.match(r'sig:\s*["\']?(\w+)\(', stripped)
                if sig_match:
                    fname = sig_match.group(1)
                    # Try to find return type
                    ret_match = re.search(r'\):\s*(\S+)', stripped)
                    ret = f": {ret_match.group(1)}" if ret_match else ""
                    result.append(f"{line[:len(line)-len(stripped)]}sig: \"{fname}(...){ret}\"")
                    # Skip continuation lines of the signature
                    in_sig = True
                    sig_indent = len(line) - len(stripped)
                    continue
                else:
                    result.append(line)
                    continue

            # Skip continuation lines of a multi-line sig
            if in_sig:
                indent = len(line) - len(line.lstrip()) if line.strip() else 0
                if stripped.startswith("- ") or stripped.startswith("name:") or indent <= sig_indent:
                    in_sig = False
                    result.append(line)
                # else: skip this line (part of the signature)
                continue

            result.append(line)

        return "\n".join(result)

    # ── Strategy 2: Drop default values ─────────────────────────

    def _drop_defaults(self, content: str) -> str:
        """Remove default: fields from type definitions."""
        lines = content.splitlines()
        result = []
        skip_continuation = False

        for line in lines:
            stripped = line.strip()

            if skip_continuation:
                # Skip multi-line default values
                if stripped.startswith("- ") or stripped.startswith("name:") or not stripped:
                    skip_continuation = False
                    result.append(line)
                continue

            if stripped.startswith("default:"):
                val = stripped[8:].strip()
                if val.startswith('"') and len(val) > 60:
                    # Long default — drop entirely
                    continue
                elif val.endswith('...'):
                    continue
                elif len(val) > 40:
                    skip_continuation = True
                    continue
                # Short defaults are fine
                result.append(line)
            else:
                result.append(line)

        return "\n".join(result)

    # ── Strategy 3: Drop detail blocks ──────────────────────────

    def _drop_detail_blocks(self, content: str) -> str:
        """Remove detail: sections (calls, opcodes, etc.)."""
        lines = content.splitlines()
        result = []
        in_detail = False
        detail_indent = 0

        for line in lines:
            stripped = line.strip()
            indent = len(line) - len(line.lstrip()) if line.strip() else 999

            if stripped == "detail:":
                in_detail = True
                detail_indent = indent
                continue

            if in_detail:
                if indent > detail_indent:
                    continue
                else:
                    in_detail = False

            result.append(line)

        return "\n".join(result)

    # ── Strategy 4: Structural Compression ──────────────────────

    def _compress_structural(self, content: str) -> str:
        """General structural compression — remove empty lines, normalize whitespace."""
        lines = content.splitlines()
        result = []
        prev_empty = False

        for line in lines:
            stripped = line.strip()

            # Collapse multiple empty lines
            if not stripped:
                if not prev_empty:
                    result.append("")
                prev_empty = True
                continue
            prev_empty = False

            # Skip pure comment lines (not section headers)
            if stripped.startswith("##") and not stripped.startswith("## Roska"):
                continue

            result.append(line)

        return "\n".join(result)

    # ── Strategy 5: Deps Compression ────────────────────────────

    def _compress_deps(self, content: str) -> str:
        """Compress deps.yaml — keep edges, drop verbose metadata.

        deps.yaml is typically huge (150KB+). We extract only the
        module-to-module dependency edges.
        """
        lines = content.splitlines()
        result = []
        total_chars = 0
        limit = self.policy.target_tokens * 2  # deps gets half the budget

        for line in lines:
            stripped = line.strip()
            indent = len(line) - len(line.lstrip()) if stripped else 0

            # Keep high-level structure (indent 0-2)
            if indent <= 4 or stripped.startswith("- "):
                result.append(line)
                total_chars += len(line)
                if total_chars > limit:
                    result.append("  # ... (deps truncated for token budget)")
                    break

        return "\n".join(result)

    def _strategies_used(self) -> set[str]:
        """List which strategies are active in current policy."""
        strategies = {"structural_compression"}
        if self.policy.detail_level <= 1:
            strategies.add("signature_compression")
        if self.policy.drop_defaults:
            strategies.add("drop_defaults")
        if self.policy.drop_detail_block:
            strategies.add("drop_detail_blocks")
        if self.policy.keep_imports:
            strategies.add("preserve_imports")
        return strategies
