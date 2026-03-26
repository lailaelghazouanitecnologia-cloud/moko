"""
Shared TSC error parsing — single source of truth for TypeScript compiler output parsing.

Used by: compile_fix_loop.py, engines/fix/__init__.py, duel/evaluation.py
"""
from __future__ import annotations

import re
from dataclasses import dataclass

# Regex to parse tsc error output: "src/core/types.ts(15,3): error TS2304: Cannot find name 'Foo'."
TSC_ERROR_RE = re.compile(
    r'^(.+?)\((\d+),\d+\):\s+error\s+(TS\d+):\s+(.+)$',
    re.MULTILINE,
)


@dataclass
class TscError:
    """One TypeScript compiler error."""
    file: str
    line: int
    code: str       # e.g. "TS2304"
    message: str


def parse_tsc_errors(output: str) -> list[TscError]:
    """Parse tsc output into structured errors."""
    errors = []
    for match in TSC_ERROR_RE.finditer(output):
        errors.append(TscError(
            file=match.group(1),
            line=int(match.group(2)),
            code=match.group(3),
            message=match.group(4),
        ))
    return errors
