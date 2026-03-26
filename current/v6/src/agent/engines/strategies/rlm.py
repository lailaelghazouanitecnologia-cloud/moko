"""
RLM Strategy — Recursive Language Model pattern.

Based on: "Recursive Language Models" (Zhang, Kraska, Khattab — MIT, 2025)
arxiv.org/abs/2512.24601

Architecture:
  Root LLM (kimi-k2): orchestrates, writes Python, decides decomposition
  Sub LLM (llama-3.1-8b): processes chunks via llm_query()
  State: Python variables in a sandboxed REPL

The Root LLM writes Python code that:
  1. Reads the blueprint/spec from `context` variable
  2. Decomposes into manageable chunks
  3. Calls `llm_query(prompt)` to process each chunk via Sub LLM
  4. Combines results in Python variables
  5. Returns final code via `FINAL(result)`
"""
from __future__ import annotations

import re
import traceback
from typing import Optional

from .base import GenerationStrategy, StrategyResult
from ...core.llm.providers import LLMProvider, LLMMessage


RLM_ROOT_SYSTEM = """You are an orchestrator LLM. You write Python code to generate TypeScript.

You have access to:
- `context`: string containing the full blueprint + spec + requirements
- `llm_query(prompt)`: calls a sub-LLM. Returns string. KEEP OUTPUT SMALL.
- `print()`: for debugging intermediate results
- Standard Python (regex, string ops, lists, dicts)

CRITICAL PRINCIPLE: High input (navigate, analyze) + Low output (patches, fragments).
The sub-LLM should NEVER return a complete file. It returns ONLY new code fragments
that Python assembles into the final file.

RULES:
1. First call: generate class skeleton with imports + constructor + method SIGNATURES ONLY (no bodies).
2. Group methods by functionality (e.g., opcodes 0x0-0x3, 0x4-0x7, 0x8-0xF).
3. For each group: ask sub-LLM to generate ONLY the method bodies for that group.
   DO NOT send the full file. Send only: class name, method signatures, and dependencies.
4. Assemble in Python: insert method bodies into skeleton.
5. End with: FINAL(assembled_code)

Example:
```python
import re

methods = re.findall(r'name: (\\w+)', context)
print(f"Need {len(methods)} methods")

# Step 1: skeleton (imports + constructor + signatures, no bodies)
skeleton = llm_query("Generate TypeScript class Cpu with imports and constructor. "
    "Include method signatures with empty bodies: " + str(methods) +
    ". Use private readonly for injected deps. Output ONLY the skeleton.")

# Step 2: generate method bodies in small groups (ONLY the body, not the whole file)
bodies = {}
groups = [methods[i:i+3] for i in range(0, len(methods), 3)]
for group in groups:
    result = llm_query(
        f"For class Cpu, implement ONLY these methods: {group}. "
        f"Output ONLY the method implementations (no class wrapper, no imports). "
        f"Format: methodName(...) {{ ... }}")
    bodies[str(group)] = result

# Step 3: assemble — insert bodies into skeleton
code = skeleton
for group_key, body in bodies.items():
    # Python inserts each body into the skeleton
    for line in body.split('\\n'):
        if line.strip() and not line.strip().startswith('//'):
            code = code  # simplified — real assembly uses regex replacement

# If assembly is complex, do one final merge call
final = llm_query(f"Merge this skeleton:\\n{skeleton[:500]}\\n\\nWith these implementations:\\n" +
    '\\n'.join(bodies.values())[:2000] + "\\nReturn the COMPLETE merged class.")
FINAL(final)
```

Output ONLY Python code. No markdown fences."""


class RLMStrategy(GenerationStrategy):
    """Recursive Language Model: root orchestrates, sub processes chunks."""

    name = "rlm"

    def __init__(self, root_llm: Optional[LLMProvider] = None,
                 sub_llm: Optional[LLMProvider] = None,
                 verbose: bool = False):
        self.root_llm = root_llm
        self.sub_llm = sub_llm
        self.verbose = verbose

    def execute(self, context: dict) -> StrategyResult:
        root = context.get("llm") or self.root_llm
        sub = context.get("sub_llm") or self.sub_llm or root

        blueprint = context.get("blueprint_yaml", "")
        spec = context.get("spec_context", "")
        system = context.get("system_prompt", "")
        full_context = f"## Blueprint\n{blueprint}\n\n## Spec\n{spec}"

        total_tokens = 0
        sub_calls = 0

        # Step 1: Root LLM writes the decomposition plan as Python
        if self.verbose:
            print(f"  [rlm] root LLM planning decomposition...")

        root_resp = root.complete_with_usage(
            [
                LLMMessage("system", RLM_ROOT_SYSTEM),
                LLMMessage("user", f"Context length: {len(full_context)} chars.\n\n{full_context}"),
            ],
            temperature=0.3, max_tokens=4000,
        )
        total_tokens += root_resp.usage.total_tokens

        plan_code = self._strip_fences(root_resp.content)

        if self.verbose:
            print(f"  [rlm] root produced {len(plan_code.splitlines())} lines of Python")

        # Step 2: Execute the plan in a sandboxed environment
        final_code = ""
        sub_system = (
            system or "You are a TypeScript code generator."
        ) + (
            "\n\nCRITICAL: Output ONLY what was asked. If asked for method bodies, "
            "output ONLY the method bodies — no class wrapper, no imports, no duplicates. "
            "Keep output MINIMAL. Never return a complete file unless explicitly asked."
        )

        def llm_query(prompt: str) -> str:
            nonlocal total_tokens, sub_calls
            sub_calls += 1
            if self.verbose:
                print(f"  [rlm] sub call #{sub_calls}: {len(prompt)} chars input")
            try:
                # Cap sub output to keep it small — the point of RLM
                sub_max = min(getattr(sub, 'max_output', 8000), 8000)
                resp = sub.complete_with_usage(
                    [LLMMessage("system", sub_system), LLMMessage("user", prompt)],
                    temperature=0.2, max_tokens=sub_max,
                )
                total_tokens += resp.usage.total_tokens
                return resp.content
            except Exception as e:
                return f"// Error: {e}"

        # Sandbox execution — __import__ is intentionally BLOCKED to prevent
        # LLM-generated code from importing arbitrary modules (os, subprocess, etc.)
        sandbox_globals = {
            "context": full_context,
            "llm_query": llm_query,
            "print": lambda *a: print("  [rlm-exec]", *a) if self.verbose else None,
            "re": re,
            "__builtins__": {
                "len": len, "range": range, "str": str, "int": int,
                "list": list, "dict": dict, "set": set, "tuple": tuple,
                "min": min, "max": max, "sorted": sorted, "enumerate": enumerate,
                "zip": zip, "map": map, "filter": filter,
                "isinstance": isinstance, "type": type,
                "True": True, "False": False, "None": None,
                "print": lambda *a: print("  [rlm-exec]", *a) if self.verbose else None,
            },
        }

        # Capture FINAL() output
        final_result = [None]

        def FINAL(code):
            final_result[0] = code

        def FINAL_VAR(var_name):
            final_result[0] = sandbox_globals.get(var_name, "")

        sandbox_globals["FINAL"] = FINAL
        sandbox_globals["FINAL_VAR"] = FINAL_VAR

        # Security: validate plan_code before execution.
        # Block dangerous builtins that could escape the sandbox.
        _BLOCKED_PATTERNS = ("import os", "import sys", "import subprocess",
                             "import shutil", "__import__", "eval(", "exec(",
                             "open(", "compile(", "globals(", "locals(",
                             "getattr(", "setattr(", "delattr(",
                             "__class__", "__subclasses__", "__bases__")
        plan_code_lower = plan_code.lower()
        blocked = [p for p in _BLOCKED_PATTERNS if p.lower() in plan_code_lower]

        try:
            if blocked:
                raise RuntimeError(f"Blocked dangerous patterns in LLM plan: {blocked}")
            exec(plan_code, sandbox_globals)  # noqa: S102 — sandboxed exec
            final_code = final_result[0] or ""
        except Exception as e:
            if self.verbose:
                print(f"  [rlm] exec failed: {e}")
                traceback.print_exc()
            # Fallback: use root LLM directly
            fallback = root.complete_with_usage(
                [LLMMessage("system", sub_system),
                 LLMMessage("user", f"Generate TypeScript for:\n{full_context}")],
                temperature=0.2,
                max_tokens=min(getattr(root, 'max_output', 12000), 16384),
            )
            total_tokens += fallback.usage.total_tokens
            final_code = fallback.content
            sub_calls = 0  # Reset — this was a fallback

        final_code = self._strip_fences(final_code)

        if self.verbose:
            print(f"  [rlm] done: {len(final_code.splitlines())} LOC, "
                  f"{sub_calls} sub calls, {total_tokens} tokens")

        return StrategyResult(
            code=final_code,
            success=bool(final_code and len(final_code) > 50),
            tokens_used=total_tokens,
            calls_made=1 + sub_calls,
            strategy_name=self.name,
            metadata={"sub_calls": sub_calls, "plan_lines": len(plan_code.splitlines())},
        )

    @staticmethod
    def _strip_fences(text: str) -> str:
        text = text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            return "\n".join(lines)
        return text
