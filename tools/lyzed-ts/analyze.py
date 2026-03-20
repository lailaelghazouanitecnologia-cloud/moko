#!/usr/bin/env python3
"""
Roska LLM Analyzer — feeds lyzed-ts YAML descriptors to Groq/Kimi K2
for intelligent codebase analysis.

Usage:
    # First generate descriptors:
    lyzed-ts -i /path/to/repo -o /tmp/output -n project --graph --dot --olevel 2

    # Then analyze with LLM:
    python analyze.py /tmp/output "What is the architecture of this project?"
    python analyze.py /tmp/output --mode arch     # architecture overview
    python analyze.py /tmp/output --mode deps     # dependency analysis
    python analyze.py /tmp/output --mode security # security review
    python analyze.py /tmp/output --mode quality  # code quality review
"""

import sys
import os
import glob
import argparse
from pathlib import Path

from groq import Groq

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
if not GROQ_API_KEY:
    print("Error: GROQ_API_KEY environment variable is required", file=sys.stderr)
    print("  export GROQ_API_KEY=gsk_...", file=sys.stderr)
    sys.exit(1)

MODEL = "moonshotai/kimi-k2-instruct-0905"

# ── Preset analysis modes ──────────────────────────────────────────

PRESETS = {
    "arch": (
        "Analyze the architecture of this codebase based on the Roska descriptors below. "
        "Identify:\n"
        "1. The main modules and their responsibilities\n"
        "2. The dependency flow between modules\n"
        "3. The core abstractions (key classes/interfaces)\n"
        "4. Entry points and public API surface\n"
        "5. Architectural patterns used (MVC, event-driven, plugin, etc.)\n"
        "Be specific — reference actual type and function names from the descriptors."
    ),
    "deps": (
        "Analyze the dependency graph of this codebase. Based on the Roska descriptors:\n"
        "1. Which modules are the most depended-upon (highest fan-in)?\n"
        "2. Are there circular dependencies?\n"
        "3. Which modules have the most external imports?\n"
        "4. What are the dependency layers (what depends on what)?\n"
        "5. Are there any modules that should be split or merged?\n"
        "Reference the actual import paths and module names."
    ),
    "security": (
        "Review this codebase for potential security concerns based on the Roska descriptors:\n"
        "1. Are there functions handling sensitive data (keys, tokens, credentials)?\n"
        "2. Are there proper error handling patterns (try/catch around external calls)?\n"
        "3. Are there any exposed internal implementation details in public APIs?\n"
        "4. Are there functions that execute commands, access files, or make network requests?\n"
        "5. What security patterns are in place (permissions, guards, validation)?\n"
        "Be specific about which files and functions you're concerned about."
    ),
    "quality": (
        "Review code quality based on the Roska descriptors:\n"
        "1. Which files/classes are too large (god objects)?\n"
        "2. Are there functions with too many dependencies (high coupling)?\n"
        "3. Is the type hierarchy reasonable or overly deep?\n"
        "4. Are naming conventions consistent?\n"
        "5. What is the ratio of public vs private API surface?\n"
        "Provide specific recommendations for refactoring."
    ),
    "onboard": (
        "I'm a new developer joining this project. Based on the Roska descriptors:\n"
        "1. Give me a high-level overview of what this codebase does\n"
        "2. What are the 5 most important files I should read first?\n"
        "3. What are the main abstractions I need to understand?\n"
        "4. What is the typical flow of execution?\n"
        "5. What are the key interfaces/types I'll work with?\n"
        "Explain like I'm starting my first day."
    ),
}

# ── Load descriptors ───────────────────────────────────────────────

def load_descriptors(output_dir: str, max_tokens: int = 12000) -> str:
    """Load YAML descriptors from lyzed-ts output, respecting token budget."""
    output_dir = Path(output_dir)
    parts = []
    total_chars = 0
    char_budget = max_tokens * 4  # ~4 chars per token

    # Priority 1: workspace.yaml (always include)
    ws = output_dir / "workspace.yaml"
    if ws.exists():
        content = ws.read_text()
        parts.append(f"# WORKSPACE\n{content}")
        total_chars += len(content)

    # Priority 2: graph meta.yaml
    meta = output_dir / "graphs" / "meta.yaml"
    if meta.exists():
        content = meta.read_text()
        parts.append(f"# DEPENDENCY GRAPH\n{content}")
        total_chars += len(content)

    # Priority 3: deps.yaml
    deps = output_dir / "deps.yaml"
    if deps.exists():
        content = deps.read_text()
        parts.append(f"# DEPS\n{content}")
        total_chars += len(content)

    # Priority 4: module.yaml files
    for mod_yaml in sorted(output_dir.rglob("module.yaml")):
        if total_chars > char_budget:
            parts.append(f"\n# ... (truncated, {char_budget // 4} token budget reached)")
            break
        content = mod_yaml.read_text()
        rel = mod_yaml.relative_to(output_dir)
        parts.append(f"# MODULE: {rel.parent}\n{content}")
        total_chars += len(content)

    # Priority 5: individual file descriptors (largest files first)
    file_yamls = []
    for fy in sorted(output_dir.rglob("*.yaml")):
        if fy.name in ("workspace.yaml", "module.yaml", "meta.yaml", "deps.yaml"):
            continue
        if "graphs" in str(fy):
            continue
        file_yamls.append((fy.stat().st_size, fy))

    # Sort by size descending — most important files tend to be largest
    file_yamls.sort(key=lambda x: -x[0])

    for size, fy in file_yamls:
        if total_chars > char_budget:
            remaining = len(file_yamls) - len([f for f in file_yamls if total_chars <= char_budget])
            parts.append(f"\n# ... ({remaining} more file descriptors omitted)")
            break
        content = fy.read_text()
        rel = fy.relative_to(output_dir)
        parts.append(f"# FILE: {rel}\n{content}")
        total_chars += len(content)

    return "\n\n".join(parts)


# ── LLM call ──────────────────────────────────────────────────────

def analyze(descriptors: str, question: str, model: str = MODEL) -> None:
    """Send descriptors + question to Groq and stream the response."""
    client = Groq(api_key=GROQ_API_KEY)

    system_prompt = (
        "You are a senior software architect analyzing a codebase through its "
        "Roska descriptors — structured YAML representations of the code's types, "
        "functions, imports, exports, dependencies, and call graphs.\n\n"
        "The descriptors contain:\n"
        "- Workspace overview (modules, file counts, line counts)\n"
        "- Dependency graph (which modules import/call/inherit from which)\n"
        "- File descriptors (types, functions with signatures, call lists, opcodes)\n"
        "- MicroGraphs with ports (cross-module connections)\n\n"
        "Be concrete and specific. Reference actual names from the descriptors. "
        "Do not make up information that isn't in the descriptors."
    )

    user_message = f"## Roska Descriptors\n\n{descriptors}\n\n## Question\n\n{question}"

    print(f"\n{'─' * 60}")
    print(f"Model: {model}")
    print(f"Descriptors: {len(descriptors)} chars (~{len(descriptors) // 4} tokens)")
    print(f"{'─' * 60}\n")

    completion = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        temperature=0.6,
        max_completion_tokens=4096,
        top_p=1,
        stream=True,
        stop=None,
    )

    for chunk in completion:
        content = chunk.choices[0].delta.content
        if content:
            print(content, end="", flush=True)

    print("\n")


# ── Main ──────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Analyze lyzed-ts YAML descriptors with Groq LLM"
    )
    parser.add_argument("output_dir", help="Directory with lyzed-ts YAML output")
    parser.add_argument("question", nargs="?", help="Free-form question about the codebase")
    parser.add_argument(
        "--mode", "-m",
        choices=list(PRESETS.keys()),
        help="Preset analysis mode: arch, deps, security, quality, onboard"
    )
    parser.add_argument(
        "--budget", "-b",
        type=int, default=12000,
        help="Max token budget for descriptors (default: 12000)"
    )
    parser.add_argument(
        "--model",
        default=MODEL,
        help=f"Groq model to use (default: {MODEL})"
    )

    args = parser.parse_args()

    if not os.path.isdir(args.output_dir):
        print(f"Error: {args.output_dir} is not a directory", file=sys.stderr)
        sys.exit(1)

    if not args.question and not args.mode:
        print("Error: provide either a question or --mode", file=sys.stderr)
        parser.print_help()
        sys.exit(1)

    model_to_use = args.model

    question = args.question or PRESETS[args.mode]
    descriptors = load_descriptors(args.output_dir, max_tokens=args.budget)

    if not descriptors.strip():
        print("Error: no YAML descriptors found in output directory", file=sys.stderr)
        sys.exit(1)

    analyze(descriptors, question, model_to_use)


if __name__ == "__main__":
    main()
