"""Reference Intelligence Engine — extract deep insights from Roska descriptors."""
from .models import (
    ProjectIntelligence, ArchPattern, Feature, DesignDecision,
    StyleProfile, QualityTargets, MetricsGlobal, MetricsPerModule,
    MetricsPerType, MetricsPerFunction, DependencyGraph,
)
from .intelligence import IntelligenceGenerator
