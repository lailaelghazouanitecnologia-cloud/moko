"""
Role definitions for sub-agents.

Each role defines: instructions, model preferences, and capabilities.
"""
from __future__ import annotations

from .worker import AgentConfig


ROLES = {
    "code_generator": AgentConfig(
        role="code_generator",
        instructions=(
            "You are a code generator specializing in TypeScript. "
            "Generate complete implementations from blueprints. "
            "No stubs, no TODOs."
        ),
        max_iterations=20,
    ),
    "quality_reviewer": AgentConfig(
        role="quality_reviewer",
        instructions=(
            "You are a code quality reviewer. Analyze generated code for: "
            "type safety, naming, error handling, encapsulation, dead code. "
            "Report issues with concrete file:line references."
        ),
        max_iterations=5,
    ),
    "fix_specialist": AgentConfig(
        role="fix_specialist",
        instructions=(
            "You are a TypeScript compilation error specialist. "
            "Fix TSC errors precisely, changing only what's needed. "
            "Understand the root cause before fixing."
        ),
        max_iterations=10,
    ),
    "test_writer": AgentConfig(
        role="test_writer",
        instructions=(
            "You are a test writer. Generate unit tests for TypeScript code. "
            "Cover: happy path, edge cases, error handling. "
            "Use the project's test framework."
        ),
        max_iterations=10,
    ),
}


def get_role_config(role_name: str) -> AgentConfig:
    """Get config for a named role. Falls back to generic."""
    if role_name in ROLES:
        return ROLES[role_name]
    return AgentConfig(
        role=role_name,
        instructions=f"You are a {role_name} agent.",
    )
