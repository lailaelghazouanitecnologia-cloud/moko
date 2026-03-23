"""
ProjectBlueprint — layered blueprint hierarchy for multi-module projects.

Defines the dependency graph between modules. Each layer can only import
from prior layers. When generating layer N, a compact summary of layers
0..N-1 is injected as context (~30-50 chars per type, no hints, no code).

This enables the LLM to generate connected code: Camera knows Mat4 has
perspective(), Entity knows Component exists, MeshRenderer connects both.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional
import yaml


@dataclass
class LayerType:
    """A type to generate within a layer."""
    name: str
    kind: str = "class"
    description: str = ""


@dataclass
class Layer:
    """One layer in the project blueprint."""
    name: str                              # "math", "graphics", "scene"
    order: int                             # 0, 1, 2...
    types: list[LayerType] = field(default_factory=list)
    requires: list[str] = field(default_factory=list)  # ["core", "math"]
    description: str = ""
    constraints: list[str] = field(default_factory=list)

    @property
    def type_names(self) -> list[str]:
        return [t.name for t in self.types]


@dataclass
class ProjectBlueprint:
    """Hierarchical blueprint: layers with dependency ordering."""
    name: str
    goal: str
    language: str = "typescript"
    layers: list[Layer] = field(default_factory=list)

    @property
    def total_types(self) -> int:
        return sum(len(l.types) for l in self.layers)

    @property
    def sorted_layers(self) -> list[Layer]:
        """Layers in dependency order (lowest first)."""
        return sorted(self.layers, key=lambda l: l.order)

    def get_layer(self, name: str) -> Optional[Layer]:
        for l in self.layers:
            if l.name == name:
                return l
        return None

    def get_prior_layers(self, layer: Layer) -> list[Layer]:
        """Get all layers that this layer depends on (in order)."""
        return [l for l in self.sorted_layers if l.name in layer.requires]

    def save(self, path: Path):
        data = {
            "name": self.name,
            "goal": self.goal,
            "language": self.language,
            "layers": [
                {
                    "name": l.name,
                    "order": l.order,
                    "types": [{"name": t.name, "kind": t.kind, "description": t.description}
                              for t in l.types],
                    "requires": l.requires,
                    "description": l.description,
                    "constraints": l.constraints,
                }
                for l in self.sorted_layers
            ],
        }
        path.parent.mkdir(parents=True, exist_ok=True)
        content = yaml.dump(data, default_flow_style=False, allow_unicode=True,
                           sort_keys=False, width=120)
        path.write_text(f"## Project Blueprint — {self.name}\n{content}")

    @classmethod
    def load(cls, path: Path) -> ProjectBlueprint:
        text = path.read_text()
        lines = [l for l in text.split("\n") if not l.startswith("##")]
        data = yaml.safe_load("\n".join(lines))
        if not data:
            raise ValueError(f"Empty project blueprint: {path}")
        proj = cls(
            name=data.get("name", ""),
            goal=data.get("goal", ""),
            language=data.get("language", "typescript"),
        )
        for ld in data.get("layers", []):
            layer = Layer(
                name=ld["name"],
                order=ld.get("order", 0),
                types=[LayerType(name=t["name"], kind=t.get("kind", "class"),
                                 description=t.get("description", ""))
                       for t in ld.get("types", [])],
                requires=ld.get("requires", []),
                description=ld.get("description", ""),
                constraints=ld.get("constraints", []),
            )
            proj.layers.append(layer)
        return proj

    def format_summary(self) -> str:
        lines = [f"Project: {self.name} ({self.total_types} types, {len(self.layers)} layers)"]
        for l in self.sorted_layers:
            deps = f" ← {','.join(l.requires)}" if l.requires else " ← (none)"
            lines.append(f"  [{l.order}] {l.name}: {', '.join(l.type_names)}{deps}")
        return "\n".join(lines)


# ── LLM-based blueprint generation ──────────────────────────

_PROJECT_BP_SYSTEM = """You are an expert software architect. Given a project goal, generate a ProjectBlueprint YAML with layered modules.

Rules:
- Each layer can only depend on layers with LOWER order numbers
- Layer 0 has no dependencies (core/foundation utilities)
- Keep layers focused: 3-8 types per layer, 3-7 layers total
- Each type needs: name (PascalCase), kind (class/interface/enum), description (1 sentence)
- Output ONLY valid YAML, no markdown fences, no explanation

Format:
```
layers:
  - name: core
    order: 0
    requires: []
    description: Foundation utilities
    types:
      - name: EventEmitter
        kind: class
        description: Pub/sub event system
      - name: Config
        kind: class
        description: Configuration management
  - name: networking
    order: 1
    requires: [core]
    description: HTTP and WebSocket layer
    types:
      - name: Router
        kind: class
        description: URL pattern routing
```"""


def generate_project_blueprint(goal: str, target: str, llm) -> Optional[ProjectBlueprint]:
    """Use LLM to generate a ProjectBlueprint from a goal description.

    Returns None if generation fails (caller should fallback to non-layered).
    """
    user = (
        f"Project: {target}\n"
        f"Goal: {goal}\n"
        f"Language: TypeScript\n\n"
        f"Generate a layered ProjectBlueprint YAML for this project. "
        f"Think about what modules and types are needed, and order them by dependency."
    )

    try:
        from ...agent.llm.providers import LLMMessage
        resp = llm.complete_with_usage(
            [LLMMessage("system", _PROJECT_BP_SYSTEM), LLMMessage("user", user)],
            temperature=0.4,
            max_tokens=2048,
        )
        content = resp.content.strip()

        # Strip markdown fences if present
        if content.startswith("```"):
            lines = content.split("\n")
            content = "\n".join(
                l for l in lines if not l.startswith("```")
            )

        data = yaml.safe_load(content)
        if not data or "layers" not in data:
            return None

        proj = ProjectBlueprint(name=target, goal=goal, language="typescript")
        for ld in data["layers"]:
            layer = Layer(
                name=ld["name"],
                order=ld.get("order", 0),
                types=[
                    LayerType(
                        name=t["name"],
                        kind=t.get("kind", "class"),
                        description=t.get("description", ""),
                    )
                    for t in ld.get("types", [])
                ],
                requires=ld.get("requires", []),
                description=ld.get("description", ""),
                constraints=ld.get("constraints", []),
            )
            proj.layers.append(layer)

        if proj.total_types < 3:
            return None  # too small, fallback to non-layered

        return proj

    except Exception:
        return None


# ── Predefined project templates ────────────────────────────

def game_engine_project(name: str, goal: str) -> ProjectBlueprint:
    """Create a full game engine project blueprint."""
    return ProjectBlueprint(
        name=name,
        goal=goal,
        language="typescript",
        layers=[
            Layer(name="core", order=0, types=[
                LayerType("EventEmitter", "class", "pub/sub event system"),
                LayerType("Timer", "class", "frame timing and delta"),
                LayerType("ResourceLoader", "class", "async resource loading"),
                LayerType("Tags", "class", "tag-based filtering"),
                LayerType("Platform", "class", "platform detection and capabilities"),
            ], description="Foundation utilities with zero dependencies"),

            Layer(name="math", order=1, requires=["core"], types=[
                LayerType("Vec2", "class", "2D vector"),
                LayerType("Vec3", "class", "3D vector"),
                LayerType("Vec4", "class", "4D vector / homogeneous"),
                LayerType("Mat3", "class", "3x3 matrix, normals"),
                LayerType("Mat4", "class", "4x4 matrix, transforms"),
                LayerType("Quat", "class", "quaternion rotation"),
                LayerType("Color", "class", "RGBA color with conversions"),
                LayerType("Ray", "class", "origin + direction for raycasting"),
                LayerType("BoundingBox", "class", "AABB collision"),
                LayerType("BoundingSphere", "class", "sphere collision"),
                LayerType("Frustum", "class", "camera frustum culling"),
                LayerType("Curve", "class", "interpolation curves"),
            ], description="Math library, Float32Array storage, column-major"),

            Layer(name="graphics", order=2, requires=["core", "math"], types=[
                LayerType("GraphicsDevice", "interface", "abstract GPU interface"),
                LayerType("WebGLDevice", "class", "WebGL implementation"),
                LayerType("VertexFormat", "class", "vertex attribute layout"),
                LayerType("VertexBuffer", "class", "GPU vertex data"),
                LayerType("IndexBuffer", "class", "GPU index data"),
                LayerType("Shader", "class", "shader program management"),
                LayerType("Texture", "class", "2D texture with mipmaps"),
                LayerType("RenderTarget", "class", "offscreen framebuffer"),
                LayerType("Material", "class", "shader + parameters"),
                LayerType("Mesh", "class", "geometry container"),
                LayerType("MeshInstance", "class", "mesh + material + transform"),
                LayerType("ScopeSpace", "class", "shader uniform scope"),
            ], description="GPU abstraction layer"),

            Layer(name="scene", order=3, requires=["core", "math", "graphics"], types=[
                LayerType("GraphNode", "class", "scene tree node with transform"),
                LayerType("Entity", "class", "game object with components"),
                LayerType("Component", "class", "base component"),
                LayerType("ComponentSystem", "class", "manages component lifecycle"),
                LayerType("Camera", "class", "projection and view matrices"),
                LayerType("Light", "class", "directional/point/spot"),
                LayerType("MeshRenderer", "class", "renders MeshInstance"),
                LayerType("Scene", "class", "root container, sky, fog, ambient"),
                LayerType("BatchManager", "class", "draw call batching"),
                LayerType("ForwardRenderer", "class", "forward rendering pipeline"),
            ], description="Scene graph and rendering pipeline"),

            Layer(name="input", order=4, requires=["core", "math"], types=[
                LayerType("Keyboard", "class", "key state tracking"),
                LayerType("Mouse", "class", "position, buttons, wheel"),
                LayerType("Touch", "class", "multi-touch support"),
                LayerType("Gamepad", "class", "gamepad API wrapper"),
                LayerType("InputManager", "class", "unified input facade"),
                LayerType("ElementInput", "class", "UI raycasting input"),
            ], description="Input device abstraction"),

            Layer(name="audio", order=5, requires=["core", "math"], types=[
                LayerType("AudioManager", "class", "Web Audio API manager"),
                LayerType("Sound", "class", "audio asset wrapper"),
                LayerType("Channel", "class", "playing sound instance"),
                LayerType("Channel3d", "class", "spatialized audio"),
                LayerType("Listener", "class", "audio listener position"),
            ], description="3D audio system"),

            Layer(name="animation", order=6, requires=["core", "math", "scene"], types=[
                LayerType("AnimClip", "class", "animation clip data"),
                LayerType("AnimTrack", "class", "single property track"),
                LayerType("AnimCurve", "class", "keyframe interpolation"),
                LayerType("AnimController", "class", "state machine"),
                LayerType("AnimState", "class", "one state in controller"),
                LayerType("Skeleton", "class", "bone hierarchy"),
                LayerType("Bone", "class", "single bone with bind pose"),
            ], description="Skeletal and property animation"),

            Layer(name="physics", order=7, requires=["core", "math", "scene"], types=[
                LayerType("PhysicsWorld", "class", "simulation world"),
                LayerType("RigidBody", "class", "dynamic/static/kinematic"),
                LayerType("Collider", "class", "collision shape"),
                LayerType("ContactResult", "class", "collision contact data"),
                LayerType("RaycastResult", "class", "raycast hit info"),
                LayerType("CollisionMesh", "class", "trimesh collider"),
            ], description="Physics simulation abstraction"),

            Layer(name="ui", order=8, requires=["core", "math", "graphics", "scene", "input"], types=[
                LayerType("Element", "class", "base UI element"),
                LayerType("Screen", "class", "UI root, scaling"),
                LayerType("Button", "class", "interactive button"),
                LayerType("Text", "class", "text rendering"),
                LayerType("Image", "class", "image display"),
                LayerType("LayoutGroup", "class", "flex/grid layout"),
                LayerType("ScrollView", "class", "scrollable container"),
            ], description="2D UI system"),

            Layer(name="app", order=9, requires=[
                "core", "math", "graphics", "scene", "input", "audio"
            ], types=[
                LayerType("Application", "class", "main app lifecycle"),
                LayerType("SceneRegistry", "class", "scene loading/switching"),
                LayerType("AssetRegistry", "class", "asset management"),
                LayerType("ScriptRegistry", "class", "script component system"),
            ], description="Application framework tying everything together"),
        ],
    )
