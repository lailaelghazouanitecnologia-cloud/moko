"""
ModuleReviewer — post-module review actor for the BranchPipeline.

Adapted from AbstractorActor for the branch-based pipeline.
Evaluates generated code quality and proposes improvements.
Uses PromptRegistry for prompt selection.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional

from ..core.llm.providers import LLMProvider, LLMMessage


@dataclass
class ReviewResult:
    """Result of reviewing a generated module."""
    module: str
    issues: List[str] = field(default_factory=list)
    suggestions: List[str] = field(default_factory=list)
    quality_notes: List[str] = field(default_factory=list)
    integration_issues: List[str] = field(default_factory=list)
    tokens_used: int = 0

    @property
    def has_issues(self) -> bool:
        return bool(self.issues) or bool(self.integration_issues)


class ModuleReviewer:
    """Reviews generated modules for quality and integration issues.

    Lightweight actor that runs after each module is generated.
    Does NOT modify code — only reports findings as proposals.
    Uses 1 LLM call per review (~500 tokens output).
    """

    def __init__(self, llm: LLMProvider, verbose: bool = False):
        self.llm = llm
        self.verbose = verbose
        self.total_tokens = 0

    def review(self, module_name: str, files: Dict[str, str],
               interfaces: Dict[str, str] = None,
               spec_context: str = "") -> ReviewResult:
        """Review a module's generated code.

        Args:
            module_name: Name of the module
            files: Dict of filename → code content
            interfaces: Dict of interface filename → interface code (from deps)
            spec_context: FunctionalSpec context for domain validation
        """
        result = ReviewResult(module=module_name)

        # Build review context
        code_parts = []
        for filename, code in files.items():
            loc = len(code.splitlines())
            code_parts.append(f"### {filename} ({loc} LOC)\n```typescript\n{code}\n```")

        interface_parts = []
        if interfaces:
            for filename, iface in interfaces.items():
                interface_parts.append(f"### {filename}\n```typescript\n{iface}\n```")

        system = (
            "You are a code reviewer. Analyze the generated TypeScript module.\n"
            "Check for:\n"
            "1. INTEGRATION: Does the class use injected deps correctly? Any state duplication?\n"
            "2. COMPLETENESS: Are all interface methods implemented with real logic?\n"
            "3. NAMING: Consistent camelCase? Descriptive names?\n"
            "4. TYPE SAFETY: Any 'any', 'as any', unsafe casts?\n"
            "5. MISSING: Anything the spec requires that's not implemented?\n\n"
            "Output JSON: {\n"
            '  "issues": ["critical problem 1", ...],\n'
            '  "suggestions": ["improvement 1", ...],\n'
            '  "quality_notes": ["good thing 1", ...],\n'
            '  "integration_issues": ["dep X not used correctly", ...]\n'
            "}\n"
            "Be concise. Max 3 items per category."
        )

        user = f"## Module: {module_name}\n\n"
        user += "\n\n".join(code_parts)
        if interface_parts:
            user += "\n\n## Dependency Interfaces\n" + "\n\n".join(interface_parts)
        if spec_context:
            user += f"\n\n{spec_context}"

        # Cap context to avoid overflow
        if len(user) > 12000:
            user = user[:12000] + "\n... (truncated)"

        try:
            resp = self.llm.complete_with_usage(
                [LLMMessage("system", system), LLMMessage("user", user)],
                temperature=0.2, max_tokens=1000,
            )
            self.total_tokens += resp.usage.total_tokens

            import json
            data = json.loads(resp.content.strip())
            result.issues = data.get("issues", [])[:5]
            result.suggestions = data.get("suggestions", [])[:5]
            result.quality_notes = data.get("quality_notes", [])[:3]
            result.integration_issues = data.get("integration_issues", [])[:3]
            result.tokens_used = resp.usage.total_tokens

        except Exception as e:
            if self.verbose:
                print(f"  [reviewer] review failed: {e}")

        if self.verbose and result.has_issues:
            print(f"  [reviewer] {module_name}: {len(result.issues)} issues, "
                  f"{len(result.integration_issues)} integration issues")

        return result
