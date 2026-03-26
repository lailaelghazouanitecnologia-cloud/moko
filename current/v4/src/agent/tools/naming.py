"""
Naming utilities — case conversion helpers.

Extracted from dev/translator.py. Used by translator, supervisor, duel,
evaluation, and other modules.
"""
from __future__ import annotations

import re


def to_kebab_case(name: str) -> str:
    """Convert PascalCase/camelCase to kebab-case.

    EventEmitter → event-emitter, Mat4 → mat4, Channel3d → channel3d,
    GraphicsDevice → graphics-device, WebGLDevice → web-gl-device
    """
    # Insert hyphen between lowercase/digit and uppercase: eventEmitter → event-Emitter
    s = re.sub(r'([a-z0-9])([A-Z])', r'\1-\2', name)
    # Insert hyphen between uppercase acronym and capitalized word: GLDevice → GL-Device
    # But keep acronyms together: WebGL stays as webgl
    s = re.sub(r'([A-Z]{2,})([A-Z][a-z])', r'\1-\2', s)
    return s.lower()


def to_pascal_case(name: str) -> str:
    """Convert kebab-case or snake_case to PascalCase.

    event-emitter → EventEmitter, vec3 → Vec3
    """
    return "".join(word.capitalize() for word in re.split(r'[-_]', name))


def to_camel_case(name: str) -> str:
    """Convert kebab-case or snake_case to camelCase.

    event-emitter → eventEmitter, vec3 → vec3
    """
    pascal = to_pascal_case(name)
    return pascal[0].lower() + pascal[1:] if pascal else ""
