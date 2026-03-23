"""Blueprint engine — source extraction + multi-source composition."""
from .extractor import SourceExtractor, ExtractedType, ExtractedMethod
from .composer import BlueprintComposer, CompositionPlan
from .project import ProjectBlueprint, Layer, game_engine_project
