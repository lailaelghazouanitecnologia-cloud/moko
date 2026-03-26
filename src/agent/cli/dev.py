"""CLI for ava dev — re-exports from dev/cli.py during migration."""
from ..dev.cli import register_subparser, cmd_dev
from ..dev.cli import register_features_subparser, cmd_features
from ..dev.cli import register_duel_subparser, cmd_duel
from ..dev.cli import register_intel_subparser, cmd_intel

__all__ = [
    "register_subparser", "cmd_dev",
    "register_features_subparser", "cmd_features",
    "register_duel_subparser", "cmd_duel",
    "register_intel_subparser", "cmd_intel",
]
