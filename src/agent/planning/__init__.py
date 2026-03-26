"""
Planning — thinks about WHAT to do before HOW.

Reasoner    → analyzes goal, produces FunctionalSpec
Decomposer  → splits goal into ModuleTasks with dependencies
Translator  → converts blueprints to code via LLM
"""
from .reasoner import GoalReasoner, FunctionalSpec, ComponentSpec
from .decomposer import TaskDecomposer, ModuleTask
from .translator import BlueprintTranslator

__all__ = [
    "GoalReasoner", "FunctionalSpec", "ComponentSpec",
    "TaskDecomposer", "ModuleTask",
    "BlueprintTranslator",
]
