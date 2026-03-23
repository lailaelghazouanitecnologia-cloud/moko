"""
Blueprint — YAML-driven code specification extending Roska descriptors.

A blueprint is a precise spec of what to build: types, methods with signatures,
implementation hints, and references to Roska descriptors. The translator
converts blueprints to actual source code via LLM.

Blueprint YAML format extends Roska file descriptors with:
  - `hint` per method: algorithmic hints (not full code)
  - `references`: links to existing Roska descriptors
  - `constraints`: rules for the translator
  - `status`: tracks translation progress (pending/translated/verified)
"""
from __future__ import annotations

import yaml
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


@dataclass
class FieldSpec:
    """A field/property in a type."""
    name: str
    type: str = ""
    default: str = ""

    def to_dict(self) -> dict:
        d = {"name": self.name}
        if self.type:
            d["type"] = self.type
        if self.default:
            d["default"] = self.default
        return d

    @classmethod
    def from_dict(cls, d) -> FieldSpec:
        if isinstance(d, str):
            # "x: number = 0" shorthand
            parts = d.split("=", 1)
            name_type = parts[0].strip()
            default = parts[1].strip() if len(parts) > 1 else ""
            if ":" in name_type:
                name, typ = name_type.split(":", 1)
                return cls(name=name.strip(), type=typ.strip(), default=default)
            return cls(name=name_type, default=default)
        return cls(
            name=d.get("name", ""),
            type=d.get("type", ""),
            default=str(d.get("default", "")),
        )


@dataclass
class MethodSpec:
    """A method specification with optional implementation hints."""
    name: str
    sig: str = ""              # "(v: Vec3): Vec3"
    hint: str = ""             # "element-wise addition, return new"
    visibility: str = "public"
    is_async: bool = False
    is_static: bool = False

    def to_dict(self) -> dict:
        d = {"name": self.name}
        if self.sig:
            d["sig"] = self.sig
        if self.hint:
            d["hint"] = self.hint
        if self.visibility != "public":
            d["vis"] = self.visibility
        if self.is_async:
            d["async"] = True
        if self.is_static:
            d["static"] = True
        return d

    @classmethod
    def from_dict(cls, d) -> MethodSpec:
        if isinstance(d, str):
            return cls(name=d)
        return cls(
            name=d.get("name", ""),
            sig=d.get("sig", ""),
            hint=d.get("hint", ""),
            visibility=d.get("vis", "public"),
            is_async=d.get("async", False),
            is_static=d.get("static", False),
        )


@dataclass
class TypeBlueprint:
    """Blueprint for a single type (class, interface, enum)."""
    name: str
    kind: str = "class"        # class, interface, enum, struct
    target_file: str = ""      # "src/math/vec3.ts"
    extends: str = ""
    implements: list[str] = field(default_factory=list)
    fields: list[FieldSpec] = field(default_factory=list)
    methods: list[MethodSpec] = field(default_factory=list)
    static_members: list[MethodSpec] = field(default_factory=list)
    constraints: list[str] = field(default_factory=list)
    references: list[str] = field(default_factory=list)
    description: str = ""
    status: str = "pending"    # pending | translated | verified

    def to_dict(self) -> dict:
        d = {
            "name": self.name,
            "kind": self.kind,
            "status": self.status,
        }
        if self.target_file:
            d["target_file"] = self.target_file
        if self.extends:
            d["extends"] = self.extends
        if self.implements:
            d["implements"] = self.implements
        if self.description:
            d["description"] = self.description
        if self.fields:
            d["fields"] = [f.to_dict() for f in self.fields]
        if self.methods:
            d["methods"] = [m.to_dict() for m in self.methods]
        if self.static_members:
            d["static"] = [m.to_dict() for m in self.static_members]
        if self.constraints:
            d["constraints"] = self.constraints
        if self.references:
            d["references"] = self.references
        return d

    @classmethod
    def from_dict(cls, d: dict) -> TypeBlueprint:
        return cls(
            name=d.get("name", ""),
            kind=d.get("kind", "class"),
            target_file=d.get("target_file", ""),
            extends=d.get("extends", ""),
            implements=d.get("implements", []),
            fields=[FieldSpec.from_dict(f) for f in d.get("fields", [])],
            methods=[MethodSpec.from_dict(m) for m in d.get("methods", [])],
            static_members=[MethodSpec.from_dict(m) for m in d.get("static", [])],
            constraints=d.get("constraints", []),
            references=d.get("references", []),
            description=d.get("description", ""),
            status=d.get("status", "pending"),
        )


@dataclass
class ModuleBlueprint:
    """Blueprint for a module containing multiple types."""
    name: str                  # "math"
    language: str = "typescript"
    target_dir: str = ""       # "src/math"
    types: list[TypeBlueprint] = field(default_factory=list)
    constraints: list[str] = field(default_factory=list)
    references: list[str] = field(default_factory=list)
    description: str = ""

    @property
    def pending_types(self) -> list[TypeBlueprint]:
        return [t for t in self.types if t.status == "pending"]

    @property
    def translated_types(self) -> list[TypeBlueprint]:
        return [t for t in self.types if t.status == "translated"]

    def get_type(self, name: str) -> Optional[TypeBlueprint]:
        for t in self.types:
            if t.name == name:
                return t
        return None

    def mark_translated(self, type_name: str):
        t = self.get_type(type_name)
        if t:
            t.status = "translated"

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "language": self.language,
            "target_dir": self.target_dir,
            "description": self.description,
            "constraints": self.constraints,
            "references": self.references,
            "types": [t.to_dict() for t in self.types],
        }

    def save(self, path: Path):
        """Write blueprint to YAML file."""
        path.parent.mkdir(parents=True, exist_ok=True)
        header = f"## Blueprint — {self.name}\n"
        content = yaml.dump(self.to_dict(), default_flow_style=False,
                            allow_unicode=True, sort_keys=False, width=120)
        path.write_text(header + content)

    @classmethod
    def load(cls, path: Path) -> ModuleBlueprint:
        """Load blueprint from YAML file."""
        text = path.read_text()
        # Strip header comment
        lines = text.split("\n")
        yaml_lines = [l for l in lines if not l.startswith("##")]
        data = yaml.safe_load("\n".join(yaml_lines))
        if not data:
            raise ValueError(f"Empty blueprint: {path}")
        return cls(
            name=data.get("name", path.stem),
            language=data.get("language", "typescript"),
            target_dir=data.get("target_dir", ""),
            types=[TypeBlueprint.from_dict(t) for t in data.get("types", [])],
            constraints=data.get("constraints", []),
            references=data.get("references", []),
            description=data.get("description", ""),
        )

    def type_to_yaml(self, type_name: str) -> str:
        """Serialize a single type from this blueprint to YAML string."""
        t = self.get_type(type_name)
        if not t:
            return ""
        return yaml.dump(t.to_dict(), default_flow_style=False,
                         allow_unicode=True, sort_keys=False, width=120)

    def format_summary(self) -> str:
        """Human-readable summary."""
        lines = [f"Blueprint: {self.name} ({self.language})"]
        lines.append(f"  Target: {self.target_dir}")
        lines.append(f"  Types: {len(self.types)} "
                      f"({len(self.pending_types)} pending, "
                      f"{len(self.translated_types)} translated)")
        for t in self.types:
            icon = {"pending": "○", "translated": "●", "verified": "✓"}
            lines.append(f"  {icon.get(t.status, '?')} {t.name} [{t.kind}] "
                          f"— {len(t.methods)} methods, {len(t.fields)} fields")
        return "\n".join(lines)
