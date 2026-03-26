"""
Actors — worker actors dispatched by the supervisor.

Each actor handles a specific block type (analyze, implement, test, etc.).
The ActorRegistry maps BlockType → Actor for dispatch.
"""
from .base import BaseActor, ActorResult, ActorRegistry
