"""Reference Intelligence Engine — extract deep insights from Roska descriptors."""
from .models import (
    ProjectIntelligence, ArchPattern, Feature, DesignDecision,
    StyleProfile, QualityTargets, MetricsGlobal, MetricsPerModule,
    MetricsPerType, MetricsPerFunction, DependencyGraph,
)
from .intelligence import IntelligenceGenerator
from .feature_ast import (
    FeatureNode, GoalAnalysis, build_feature_ast,
    analyze_goal, auto_select, interactive_select,
    print_tree, print_plan,
)
