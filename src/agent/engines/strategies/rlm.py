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
- `llm_query(prompt)`: calls a sub-LLM to generate code. Returns string.
- `print()`: for debugging intermediate results
- Standard Python (regex, string ops, lists, dicts)

Your task: write Python code that decomposes the task and uses `llm_query()`
to generate TypeScript code incrementally.

RULES:
1. NEVER generate TypeScript directly. Write Python that generates TypeScript via llm_query().
2. Each llm_query() call should request ~100-200 lines max. Break large tasks into chunks.
3. Store intermediate results in Python variables.
4. Combine results at the end.
5. End with: FINAL(your_final_typescript_code)
6. Do NOT use `input()` or file I/O. Only `llm_query()` and `print()`.

Example for a class with 20 methods:
```python
import re

# Read what methods we need
methods = re.findall(r'name: (\\w+)', context)
print(f"Need to implement {len(methods)} methods")

# Generate skeleton
skeleton = llm_query(f"Generate a TypeScript class skeleton with these methods as stubs: {methods}. Include all imports.")

# Fill methods in groups
code = skeleton
for i in range(0, len(methods), 5):
    group = methods[i:i+5]
    filled = llm_query(f"Here is existing code:\\n{code}\\n\\nImplement these methods with real logic: {group}. Return the COMPLETE file.")
    if len(filled) > len(code) * 0.8:
        code = filled

FINAL(code)
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
        sub_system = system or "You are a TypeScript code generator. Output ONLY code."

        def llm_query(prompt: str) -> str:
            nonlocal total_tokens, sub_calls
            sub_calls += 1
            if self.verbose:
                print(f"  [rlm] sub call #{sub_calls}: {len(prompt)} chars input")
            try:
                sub_max = min(getattr(sub, 'max_output', 16000), 16384)
                resp = sub.complete_with_usage(
                    [LLMMessage("system", sub_system), LLMMessage("user", prompt)],
                    temperature=0.2, max_tokens=sub_max,
                )
                total_tokens += resp.usage.total_tokens
                return resp.content
            except Exception as e:
                return f"// Error: {e}"

        # Sandbox execution
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

        try:
            exec(plan_code, sandbox_globals)
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
