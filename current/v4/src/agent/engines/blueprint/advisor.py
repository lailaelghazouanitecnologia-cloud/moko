"""
ProjectAdvisor — intelligent project scope estimation and blueprint selection.

Replaces the hard-coded keyword detection (if "engine" → 74 types).
Instead, classifies the project, estimates scope, and decides HOW MUCH
blueprint guidance to apply.

Three modes:
  - "strict": Full blueprint with exact types (transpilation, reference exists)
  - "guide":  Blueprint suggests modules, LLM decides types (most projects)
  - "free":   No blueprint, LLM decomposes freely (unknown/creative projects)

Learning: records {goal, category, complexity, actual_modules, actual_loc}
for each project. After enough data, heuristics improve automatically.
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from .project import ProjectBlueprint, Layer, LayerType


# ── Project classification ──────────────────────────────────

@dataclass
class ProjectScope:
    """Estimated scope for a project."""
    category: str           # "puzzle_game", "engine", "cli_tool", "api", ...
    complexity: str         # "simple", "medium", "complex"
    archetype: str          # "2048", "snake", "rts", "platformer", ...
    mode: str               # "strict", "guide", "free"
    estimated_modules: int  # 3-5 for simple, 5-8 for medium, 8-12 for complex
    estimated_loc: int      # rough total LOC
    suggested_modules: List[ModuleSuggestion] = field(default_factory=list)
    confidence: float = 0.0  # 0-1, how sure we are

    def summary(self) -> str:
        mods = ", ".join(m.name for m in self.suggested_modules) if self.suggested_modules else "TBD"
        return (
            f"[{self.category}/{self.archetype}] {self.complexity}, "
            f"mode={self.mode}, ~{self.estimated_modules} modules, "
            f"~{self.estimated_loc} LOC, conf={self.confidence:.0%}\n"
            f"  Modules: {mods}"
        )


@dataclass
class ModuleSuggestion:
    """A suggested module with types — not enforced, just guidance."""
    name: str
    description: str
    suggested_types: List[str] = field(default_factory=list)
    depends_on: List[str] = field(default_factory=list)
    estimated_loc: int = 0
    optional: bool = False  # True = LLM can skip this if unnecessary


# ── Category definitions ────────────────────────────────────

# Each category has: keywords, complexity hints, typical modules
CATEGORIES: Dict[str, Dict] = {
    "puzzle_game": {
        "keywords": ["2048", "tetris", "sudoku", "minesweeper", "puzzle",
                      "match-3", "wordle", "sokoban", "chess", "checkers"],
        "complexity": "simple",
        "estimated_modules": 4,
        "estimated_loc": 800,
        "modules": [
            ModuleSuggestion("core", "Types, enums, constants, interfaces",
                             suggested_types=["GameState", "GameConfig", "Position", "Direction"],
                             depends_on=[], estimated_loc=150),
            ModuleSuggestion("game", "Core game logic, state machine, rules, scoring",
                             suggested_types=["GameBoard", "GameLogic", "ScoreTracker"],
                             depends_on=["core"], estimated_loc=300),
            ModuleSuggestion("renderer", "Terminal/console display, board visualization",
                             suggested_types=["Renderer", "BoardDisplay"],
                             depends_on=["core", "game"], estimated_loc=200),
            ModuleSuggestion("engine", "Game loop, input handling, entry point",
                             suggested_types=["GameEngine", "InputHandler"],
                             depends_on=["core", "game", "renderer"], estimated_loc=200),
        ],
    },
    "arcade_game": {
        "keywords": ["snake", "pong", "breakout", "space invaders", "asteroids",
                      "flappy", "pac-man", "pacman", "galaga"],
        "complexity": "simple",
        "estimated_modules": 5,
        "estimated_loc": 1200,
        "modules": [
            ModuleSuggestion("core", "Types, vector math, constants",
                             suggested_types=["Vector2D", "GameConfig", "Entity"],
                             depends_on=[], estimated_loc=200),
            ModuleSuggestion("game", "Game entities, state, collision detection",
                             suggested_types=["GameWorld", "CollisionDetector", "EntityManager"],
                             depends_on=["core"], estimated_loc=350),
            ModuleSuggestion("renderer", "Console/terminal rendering with double buffering",
                             suggested_types=["ScreenBuffer", "Renderer"],
                             depends_on=["core"], estimated_loc=250),
            ModuleSuggestion("input", "Keyboard handling, input queue",
                             suggested_types=["InputHandler", "KeyMapper"],
                             depends_on=["core"], estimated_loc=150),
            ModuleSuggestion("engine", "Game loop with fixed timestep, main entry point",
                             suggested_types=["GameLoop", "Application"],
                             depends_on=["core", "game", "renderer", "input"],
                             estimated_loc=200),
        ],
    },
    "game_engine": {
        "keywords": ["game engine", "3d engine", "renderer engine",
                      "graphics engine", "rendering engine"],
        "complexity": "complex",
        "estimated_modules": 10,
        "estimated_loc": 8000,
        "modules": [
            ModuleSuggestion("core", "Event system, timer, resource loader",
                             depends_on=[], estimated_loc=600),
            ModuleSuggestion("math", "Vectors, matrices, quaternions, geometry",
                             depends_on=["core"], estimated_loc=2000),
            ModuleSuggestion("graphics", "GPU abstraction, shaders, textures",
                             depends_on=["core", "math"], estimated_loc=1500),
            ModuleSuggestion("scene", "Scene graph, entities, components",
                             depends_on=["core", "math", "graphics"], estimated_loc=1200),
            ModuleSuggestion("input", "Keyboard, mouse, gamepad",
                             depends_on=["core"], estimated_loc=500),
            ModuleSuggestion("audio", "Audio playback, 3D sound",
                             depends_on=["core", "math"], estimated_loc=600,
                             optional=True),
            ModuleSuggestion("animation", "Skeletal and property animation",
                             depends_on=["core", "math", "scene"], estimated_loc=700,
                             optional=True),
            ModuleSuggestion("physics", "Collision, rigid bodies, raycasting",
                             depends_on=["core", "math", "scene"], estimated_loc=800,
                             optional=True),
            ModuleSuggestion("ui", "2D UI system",
                             depends_on=["core", "math", "scene", "input"],
                             estimated_loc=700, optional=True),
            ModuleSuggestion("app", "Application framework, lifecycle",
                             depends_on=["core", "scene", "input"], estimated_loc=400),
        ],
    },
    "rts_game": {
        "keywords": ["rts", "real-time strategy", "strategy game",
                      "base building", "resource management",
                      "units and terrain", "combat and resource"],
        "complexity": "complex",
        "estimated_modules": 8,
        "estimated_loc": 5000,
        "modules": [
            ModuleSuggestion("core", "ECS framework, event bus, game loop",
                             depends_on=[], estimated_loc=500),
            ModuleSuggestion("math", "Vector2, pathfinding, grid utilities",
                             depends_on=["core"], estimated_loc=600),
            ModuleSuggestion("terrain", "Tile map, terrain types, fog of war",
                             depends_on=["core", "math"], estimated_loc=500),
            ModuleSuggestion("units", "Unit types, movement, formations, health",
                             depends_on=["core", "math"], estimated_loc=700),
            ModuleSuggestion("combat", "Damage, projectiles, armor, attack patterns",
                             depends_on=["core", "math", "units"], estimated_loc=500),
            ModuleSuggestion("resources", "Resource types, gathering, economy",
                             depends_on=["core"], estimated_loc=400),
            ModuleSuggestion("buildings", "Building types, construction, production",
                             depends_on=["core", "resources", "terrain"],
                             estimated_loc=500, optional=True),
            ModuleSuggestion("ai", "AI controller, behavior trees, threat assessment",
                             depends_on=["core", "units", "resources"],
                             estimated_loc=600, optional=True),
            ModuleSuggestion("renderer", "Console/text display, minimap",
                             depends_on=["core", "terrain", "units"],
                             estimated_loc=400),
            ModuleSuggestion("engine", "Main game, players, win conditions",
                             depends_on=["core", "terrain", "units", "combat",
                                         "resources", "renderer"],
                             estimated_loc=400),
        ],
    },
    "cli_tool": {
        "keywords": ["cli", "command line", "terminal tool", "shell", "todo"],
        "complexity": "simple",
        "estimated_modules": 4,
        "estimated_loc": 800,
        "modules": [
            ModuleSuggestion("core", "Domain types, enums, interfaces, configuration",
                             suggested_types=["Config", "Result", "ValidationError"],
                             depends_on=[], estimated_loc=150),
            ModuleSuggestion("store", "Data persistence, CRUD operations, filtering, sorting",
                             suggested_types=["Store", "Repository", "Serializer"],
                             depends_on=["core"], estimated_loc=250),
            ModuleSuggestion("commands", "Command implementations with execute/validate pattern",
                             suggested_types=["CommandExecutor", "CommandParser"],
                             depends_on=["core", "store"], estimated_loc=250),
            ModuleSuggestion("cli", "Argument parsing, terminal formatting, entry point",
                             suggested_types=["CLI", "Formatter"],
                             depends_on=["core", "commands"], estimated_loc=200),
        ],
    },
    "api_server": {
        "keywords": ["api", "rest api", "server", "backend", "microservice",
                      "web server", "http server"],
        "complexity": "medium",
        "estimated_modules": 5,
        "estimated_loc": 1500,
        "modules": [
            ModuleSuggestion("core", "Types, config, errors, middleware interfaces",
                             suggested_types=["AppConfig", "ApiError", "Middleware"],
                             depends_on=[], estimated_loc=200),
            ModuleSuggestion("models", "Data models, schemas, validation",
                             suggested_types=["Schema", "Validator", "Repository"],
                             depends_on=["core"], estimated_loc=300),
            ModuleSuggestion("services", "Business logic, data access, domain operations",
                             suggested_types=["Service", "DataStore"],
                             depends_on=["core", "models"], estimated_loc=400),
            ModuleSuggestion("routes", "HTTP handlers, request/response, route definitions",
                             suggested_types=["Router", "RouteHandler", "ResponseBuilder"],
                             depends_on=["core", "models", "services"],
                             estimated_loc=350),
            ModuleSuggestion("server", "Server setup, middleware chain, entry point",
                             suggested_types=["Server", "Application"],
                             depends_on=["core", "routes"], estimated_loc=200),
        ],
    },
    "library": {
        "keywords": ["library", "sdk", "framework", "toolkit", "package"],
        "complexity": "medium",
        "estimated_modules": 4,
        "estimated_loc": 1200,
        "modules": [
            ModuleSuggestion("core", "Core types, interfaces, base classes",
                             depends_on=[], estimated_loc=300),
            ModuleSuggestion("impl", "Main implementation",
                             depends_on=["core"], estimated_loc=500),
            ModuleSuggestion("utils", "Helper functions, utilities",
                             depends_on=["core"], estimated_loc=200),
            ModuleSuggestion("public", "Public API, exports, facade",
                             depends_on=["core", "impl", "utils"],
                             estimated_loc=200),
        ],
    },
}

# Complexity modifiers: keywords that bump up/down complexity
COMPLEXITY_MODIFIERS = {
    "simple": ["simple", "basic", "minimal", "tiny", "small", "quick"],
    "complex": ["full", "complete", "production", "advanced", "enterprise",
                "scalable", "distributed", "real-time"],
}


# ── ProjectAdvisor ──────────────────────────────────────────

class ProjectAdvisor:
    """Intelligent project scope estimation.

    Replaces hardcoded keyword → blueprint mapping with:
    1. Category classification (heuristic, 0 tokens)
    2. Scope estimation (heuristic + optional LLM, 0-1 call)
    3. Mode selection: strict/guide/free

    Usage:
        advisor = ProjectAdvisor()
        scope = advisor.estimate("2048 puzzle game")
        # → category=puzzle_game, mode=guide, 4 modules, ~800 LOC

        scope = advisor.estimate("Full 3D game engine with physics")
        # → category=game_engine, mode=strict, 10 modules, ~8000 LOC

        blueprint = advisor.to_blueprint(scope, "my_project")
        # → ProjectBlueprint (guide mode: suggested types, not enforced)
    """

    def __init__(self, db_path: str = ""):
        self.db_path = db_path
        self.history: List[Dict] = []
        if db_path and Path(db_path).exists():
            self._load_history()

    def estimate(self, goal: str, references: List[str] = None) -> ProjectScope:
        """Classify project and estimate scope. 0 tokens."""
        goal_lower = goal.lower()

        # Step 1: Classify category
        category, confidence = self._classify(goal_lower)

        # Step 2: Determine complexity
        complexity = self._estimate_complexity(goal_lower, category)

        # Step 3: Extract archetype
        archetype = self._extract_archetype(goal_lower, category)

        # Step 4: Decide mode
        mode = self._decide_mode(category, confidence, references)

        # Step 5: Get module suggestions
        cat_data = CATEGORIES.get(category, {})
        modules = list(cat_data.get("modules", []))

        # Adjust for complexity
        if complexity == "simple" and len(modules) > 5:
            # Filter optional modules for simple projects
            modules = [m for m in modules if not m.optional]
        elif complexity == "complex":
            # Keep all modules including optional
            pass

        # Step 6: Estimate LOC
        base_loc = cat_data.get("estimated_loc", 1000)
        loc_multiplier = {"simple": 0.8, "medium": 1.0, "complex": 1.5}
        estimated_loc = int(base_loc * loc_multiplier.get(complexity, 1.0))

        # Step 7: Check history for calibration
        similar = self._find_similar(goal_lower, category)
        if similar:
            # Average with historical data
            hist_loc = similar.get("actual_loc", estimated_loc)
            estimated_loc = int(estimated_loc * 0.4 + hist_loc * 0.6)

        return ProjectScope(
            category=category,
            complexity=complexity,
            archetype=archetype,
            mode=mode,
            estimated_modules=len(modules),
            estimated_loc=estimated_loc,
            suggested_modules=modules,
            confidence=confidence,
        )

    def to_blueprint(
        self, scope: ProjectScope, target: str, goal: str
    ) -> Optional[ProjectBlueprint]:
        """Convert a ProjectScope to a ProjectBlueprint.

        - strict mode: full blueprint with types (like game_engine_project)
        - guide mode: blueprint with module names + descriptions, fewer types
        - free mode: returns None (let LLM decompose)
        """
        if scope.mode == "free":
            return None

        layers = []
        for i, mod in enumerate(scope.suggested_modules):
            types = []
            if scope.mode == "strict":
                # Full types from suggestion
                for type_name in mod.suggested_types:
                    types.append(LayerType(type_name, "class", ""))
            # In guide mode: no types forced, but enrich description with
            # suggested types so LLM knows what domain concepts to implement
            description = mod.description
            if scope.mode == "guide" and mod.suggested_types:
                type_hints = ", ".join(mod.suggested_types)
                description = f"{mod.description}. Key types: {type_hints}"

            layer = Layer(
                name=mod.name,
                order=i,
                types=types,
                requires=mod.depends_on,
                description=description,
            )
            layers.append(layer)

        bp = ProjectBlueprint(
            name=target,
            goal=goal,
            language="typescript",
            layers=layers,
        )
        return bp

    def record_result(
        self, goal: str, scope: ProjectScope,
        actual_modules: int, actual_loc: int, actual_tokens: int,
        quality_score: float = 0.0,
    ):
        """Record project result for future calibration."""
        entry = {
            "goal": goal,
            "category": scope.category,
            "archetype": scope.archetype,
            "complexity": scope.complexity,
            "mode": scope.mode,
            "estimated_modules": scope.estimated_modules,
            "estimated_loc": scope.estimated_loc,
            "actual_modules": actual_modules,
            "actual_loc": actual_loc,
            "actual_tokens": actual_tokens,
            "quality_score": quality_score,
        }
        self.history.append(entry)
        if self.db_path:
            self._save_history()

    # ── Classification ──────────────────────────────────────

    def _classify(self, goal_lower: str) -> Tuple[str, float]:
        """Classify project into a category. Returns (category, confidence).

        Prefers more specific categories over generic ones.
        E.g., "RTS game engine" → rts_game (not game_engine),
              "2048 puzzle game" → puzzle_game (not arcade_game).
        """
        matches: List[Tuple[str, float, int]] = []  # (category, score, specificity)

        # Specificity: domain-specific > generic
        # rts_game, puzzle_game > game_engine > arcade_game
        SPECIFICITY = {
            "puzzle_game": 3, "rts_game": 3,
            "arcade_game": 2,
            "game_engine": 1,
            "cli_tool": 2, "api_server": 2, "library": 1,
        }

        for category, cat_data in CATEGORIES.items():
            keywords = cat_data.get("keywords", [])
            score = 0.0
            match_count = 0

            for kw in keywords:
                if kw in goal_lower:
                    # Base score: min 0.5 per match + bonus for longer keywords
                    score += max(len(kw) / 10.0, 0.5)
                    match_count += 1

            if match_count > 0:
                specificity = SPECIFICITY.get(category, 1)
                # Bonus for multiple keyword matches (e.g., "rts" + "resource management")
                score *= (1 + 0.2 * (match_count - 1))
                matches.append((category, score, specificity))

        if not matches:
            # No match — check for generic "game"
            if "game" in goal_lower:
                return "arcade_game", 0.3
            return "unknown", 0.0

        # Sort by: specificity (higher first), then score (higher first)
        matches.sort(key=lambda x: (-x[2], -x[1]))
        best_category, best_score, _ = matches[0]
        confidence = min(best_score / 2.0, 1.0)

        return best_category, confidence

    def _estimate_complexity(self, goal_lower: str, category: str) -> str:
        """Estimate project complexity from goal text."""
        # Check explicit complexity modifiers
        for complexity, keywords in COMPLEXITY_MODIFIERS.items():
            for kw in keywords:
                if kw in goal_lower:
                    return complexity

        # Fall back to category default
        cat_data = CATEGORIES.get(category, {})
        return cat_data.get("complexity", "medium")

    def _extract_archetype(self, goal_lower: str, category: str) -> str:
        """Extract the specific archetype (e.g., "2048", "snake", "rts")."""
        # Check known archetypes
        archetypes = {
            "2048": "2048", "tetris": "tetris", "snake": "snake",
            "pong": "pong", "chess": "chess", "sudoku": "sudoku",
            "minesweeper": "minesweeper", "breakout": "breakout",
            "rts": "rts", "tower defense": "tower_defense",
            "platformer": "platformer", "rpg": "rpg",
        }
        for key, value in archetypes.items():
            if key in goal_lower:
                return value

        # Extract first noun as archetype
        words = goal_lower.split()
        for w in words:
            if w not in ("a", "an", "the", "with", "and", "game", "engine",
                         "create", "build", "make", "simple", "full"):
                return w

        return category

    def _decide_mode(
        self, category: str, confidence: float, references: List[str] = None
    ) -> str:
        """Decide blueprint mode: strict, guide, or free.

        - strict: We have a predefined template AND high confidence
        - guide: We know the category, suggest structure but don't force types
        - free: Unknown category, let LLM decide everything
        """
        if category == "unknown":
            return "free"

        # If references provided, use strict (transpilation-like)
        if references:
            return "strict"

        # Any confidence in a known category → guide
        # Guide doesn't force types, just suggests module structure
        if confidence >= 0.15:
            return "guide"

        # Very low confidence → free, let LLM figure it out
        return "free"

    # ── History / learning ──────────────────────────────────

    def _find_similar(self, goal_lower: str, category: str) -> Optional[Dict]:
        """Find similar past project for calibration."""
        for entry in reversed(self.history):
            if entry.get("category") == category:
                return entry
        return None

    def _load_history(self):
        """Load history from JSONL file."""
        try:
            with open(self.db_path) as f:
                for line in f:
                    line = line.strip()
                    if line:
                        self.history.append(json.loads(line))
        except (OSError, json.JSONDecodeError):
            pass

    def _save_history(self):
        """Save history to JSONL file."""
        try:
            path = Path(self.db_path)
            path.parent.mkdir(parents=True, exist_ok=True)
            with open(path, "w") as f:
                for entry in self.history:
                    f.write(json.dumps(entry) + "\n")
        except OSError:
            pass
