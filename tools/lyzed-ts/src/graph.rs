//! MicroGraph system — hierarchical graph partitioning with Ports.
//!
//! Layer 0: WorkspaceGraph — one MicroGraph per top-level module
//! Layer 1: ModuleGraph — classes + functions as nodes, calls + imports as edges
//! Layer 2: EntityGraph (optional) — control flow graph per function
//!
//! Ports connect MicroGraphs: when an edge crosses graph boundaries,
//! both endpoints get a Port entry pointing to each other.

use crate::model::*;
use std::collections::{HashMap, HashSet};

// ── Core types ─────────────────────────────────────────────────────

#[derive(Debug, Clone, serde::Serialize)]
pub struct MicroGraph {
    pub id: String,
    pub level: u8, // 0=workspace, 1=module, 2=entity
    #[serde(skip_serializing_if = "Option::is_none")]
    pub purpose: Option<String>,
    pub nodes: Vec<GraphNode>,
    pub internal_edges: Vec<GraphEdge>,
    pub ports: Vec<Port>,
    pub stats: GraphStats,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct GraphNode {
    pub id: String,
    pub kind: GraphNodeKind,
    pub label: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub file: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lines: Option<usize>,
}

#[derive(Debug, Clone, serde::Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum GraphNodeKind {
    Module,
    Class,
    Function,
    Data,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct GraphEdge {
    pub from: String,
    pub to: String,
    pub kind: GraphEdgeKind,
    #[serde(skip_serializing_if = "is_one")]
    pub weight: u32, // number of times this edge appears
}

fn is_one(v: &u32) -> bool {
    *v == 1
}

#[derive(Debug, Clone, serde::Serialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum GraphEdgeKind {
    Imports,
    Calls,
    Inherits,
    Contains, // parent-child relationship
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct Port {
    pub local_node: String,
    pub direction: PortDir,
    pub remote_graph: String,
    pub remote_node: String,
    pub edge_kind: GraphEdgeKind,
}

#[derive(Debug, Clone, serde::Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum PortDir {
    In,
    Out,
    BiDir,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct GraphStats {
    pub node_count: usize,
    pub edge_count: usize,
    pub port_count: usize,
    pub types: usize,
    pub functions: usize,
    pub lines: usize,
}

// ── WorkspaceGraph ─────────────────────────────────────────────────

#[derive(Debug, Clone, serde::Serialize)]
pub struct WorkspaceGraph {
    pub name: String,
    pub meta_graph: MicroGraph, // Level 0: modules as nodes
    pub module_graphs: Vec<MicroGraph>, // Level 1: per-module detail
}

// ── Builder ────────────────────────────────────────────────────────

pub fn build_workspace_graph(workspace: &Workspace) -> WorkspaceGraph {
    // Build per-module MicroGraphs (Level 1)
    let module_graphs: Vec<MicroGraph> = workspace
        .modules
        .iter()
        .map(|m| build_module_graph(m))
        .collect();

    // Build symbol → module index for cross-module resolution
    let mut symbol_to_module: HashMap<String, String> = HashMap::new();
    for module in &workspace.modules {
        for file in &module.files {
            for t in &file.types {
                symbol_to_module.insert(t.name.clone(), module.name.clone());
                symbol_to_module.insert(
                    format!("{}.{}", module.name, t.name),
                    module.name.clone(),
                );
            }
            for f in &file.functions {
                symbol_to_module.insert(f.name.clone(), module.name.clone());
                symbol_to_module.insert(
                    format!("{}.{}", module.name, f.name),
                    module.name.clone(),
                );
            }
            for e in &file.exports {
                symbol_to_module.insert(e.name.clone(), module.name.clone());
            }
        }
    }

    // Build meta-graph (Level 0)
    let meta_graph = build_meta_graph(workspace, &module_graphs, &symbol_to_module);

    // Add ports to module graphs based on cross-module edges
    let module_graphs = add_ports_to_modules(module_graphs, workspace, &symbol_to_module);

    WorkspaceGraph {
        name: workspace.name.clone(),
        meta_graph,
        module_graphs,
    }
}

fn build_module_graph(module: &Module) -> MicroGraph {
    let mut nodes = Vec::new();
    let mut edges = Vec::new();
    let mut type_count = 0;
    let mut func_count = 0;

    for file in &module.files {
        // Add type nodes
        for t in &file.types {
            type_count += 1;
            let node_id = format!("{}.{}", module.name, t.name);
            nodes.push(GraphNode {
                id: node_id.clone(),
                kind: GraphNodeKind::Class,
                label: t.name.clone(),
                file: Some(file.file.clone()),
                lines: t.lines.map(|(s, e)| e.saturating_sub(s)),
            });

            // Inheritance edges
            for base in &t.bases {
                edges.push(GraphEdge {
                    from: node_id.clone(),
                    to: base.clone(),
                    kind: GraphEdgeKind::Inherits,
                    weight: 1,
                });
            }

            // Method call edges
            for method in &t.methods {
                if let Some(detail) = &method.detail {
                    for call in &detail.calls {
                        if !call.starts_with("self.") && !call.starts_with("super") {
                            edges.push(GraphEdge {
                                from: format!("{}.{}", node_id, method.name),
                                to: call.clone(),
                                kind: GraphEdgeKind::Calls,
                                weight: 1,
                            });
                        }
                    }
                }
            }
        }

        // Add function nodes
        for f in &file.functions {
            func_count += 1;
            let node_id = format!("{}.{}", module.name, f.name);
            nodes.push(GraphNode {
                id: node_id.clone(),
                kind: GraphNodeKind::Function,
                label: f.name.clone(),
                file: Some(file.file.clone()),
                lines: f.lines.map(|(s, e)| e.saturating_sub(s)),
            });

            if let Some(detail) = &f.detail {
                for call in &detail.calls {
                    if !call.starts_with("self.") {
                        edges.push(GraphEdge {
                            from: node_id.clone(),
                            to: call.clone(),
                            kind: GraphEdgeKind::Calls,
                            weight: 1,
                        });
                    }
                }
            }
        }
    }

    // Deduplicate edges and count weights
    let edges = dedup_edges(edges);

    MicroGraph {
        id: module.name.clone(),
        level: 1,
        purpose: module.purpose.clone(),
        nodes: nodes.clone(),
        internal_edges: edges.clone(),
        ports: Vec::new(), // filled later
        stats: GraphStats {
            node_count: nodes.len(),
            edge_count: edges.len(),
            port_count: 0,
            types: type_count,
            functions: func_count,
            lines: module.total_lines,
        },
    }
}

fn build_meta_graph(
    workspace: &Workspace,
    module_graphs: &[MicroGraph],
    symbol_to_module: &HashMap<String, String>,
) -> MicroGraph {
    let mut nodes = Vec::new();
    let mut edges = Vec::new();
    let mut seen_edges: HashSet<(String, String, String)> = HashSet::new();

    for (i, module) in workspace.modules.iter().enumerate() {
        nodes.push(GraphNode {
            id: module.name.clone(),
            kind: GraphNodeKind::Module,
            label: format!(
                "{} ({}t, {}f)",
                module.name,
                module_graphs.get(i).map(|g| g.stats.types).unwrap_or(0),
                module_graphs.get(i).map(|g| g.stats.functions).unwrap_or(0),
            ),
            file: None,
            lines: Some(module.total_lines),
        });

        // Cross-module edges from imports
        for file in &module.files {
            for imp in &file.imports {
                let parts: Vec<&str> = imp.sym.split('.').collect();
                let target_root = parts[0];

                // Check if target is an internal module
                if workspace.modules.iter().any(|m| m.name == target_root)
                    && target_root != module.name
                {
                    let key = (
                        module.name.clone(),
                        target_root.to_string(),
                        "imports".to_string(),
                    );
                    if seen_edges.insert(key) {
                        edges.push(GraphEdge {
                            from: module.name.clone(),
                            to: target_root.to_string(),
                            kind: GraphEdgeKind::Imports,
                            weight: 1,
                        });
                    }
                }
            }

            // Cross-module edges from calls
            for func in &file.functions {
                if let Some(detail) = &func.detail {
                    for call in &detail.calls {
                        if let Some(target_mod) = resolve_call_module(call, symbol_to_module) {
                            if target_mod != module.name {
                                let key = (
                                    module.name.clone(),
                                    target_mod.clone(),
                                    "calls".to_string(),
                                );
                                if seen_edges.insert(key) {
                                    edges.push(GraphEdge {
                                        from: module.name.clone(),
                                        to: target_mod,
                                        kind: GraphEdgeKind::Calls,
                                        weight: 1,
                                    });
                                }
                            }
                        }
                    }
                }
            }

            // Cross-module edges from inheritance
            for t in &file.types {
                for base in &t.bases {
                    if let Some(target_mod) = symbol_to_module.get(base) {
                        if target_mod != &module.name {
                            let key = (
                                module.name.clone(),
                                target_mod.clone(),
                                "inherits".to_string(),
                            );
                            if seen_edges.insert(key) {
                                edges.push(GraphEdge {
                                    from: module.name.clone(),
                                    to: target_mod.clone(),
                                    kind: GraphEdgeKind::Inherits,
                                    weight: 1,
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    let edges = dedup_edges(edges);

    MicroGraph {
        id: workspace.name.clone(),
        level: 0,
        purpose: workspace.purpose.clone(),
        nodes: nodes.clone(),
        internal_edges: edges.clone(),
        ports: Vec::new(),
        stats: GraphStats {
            node_count: nodes.len(),
            edge_count: edges.len(),
            port_count: 0,
            types: workspace.modules.iter().flat_map(|m| &m.files).map(|f| f.types.len()).sum(),
            functions: workspace.modules.iter().flat_map(|m| &m.files).map(|f| f.functions.len()).sum(),
            lines: workspace.total_lines,
        },
    }
}

fn add_ports_to_modules(
    mut module_graphs: Vec<MicroGraph>,
    workspace: &Workspace,
    symbol_to_module: &HashMap<String, String>,
) -> Vec<MicroGraph> {
    // Build module name → index
    let mod_idx: HashMap<String, usize> = module_graphs
        .iter()
        .enumerate()
        .map(|(i, g)| (g.id.clone(), i))
        .collect();

    // Collect all cross-module relationships
    let mut ports_to_add: Vec<(usize, Port)> = Vec::new();

    for (i, module) in workspace.modules.iter().enumerate() {
        for file in &module.files {
            // Import ports
            for imp in &file.imports {
                let parts: Vec<&str> = imp.sym.split('.').collect();
                let target_root = parts[0].to_string();
                if mod_idx.contains_key(&target_root) && target_root != module.name {
                    ports_to_add.push((
                        i,
                        Port {
                            local_node: imp.sym.clone(),
                            direction: PortDir::Out,
                            remote_graph: target_root.clone(),
                            remote_node: imp.sym.clone(),
                            edge_kind: GraphEdgeKind::Imports,
                        },
                    ));
                }
            }

            // Call ports
            for func in &file.functions {
                if let Some(detail) = &func.detail {
                    for call in &detail.calls {
                        if let Some(target_mod) = resolve_call_module(call, symbol_to_module) {
                            if target_mod != module.name {
                                ports_to_add.push((
                                    i,
                                    Port {
                                        local_node: format!("{}.{}", module.name, func.name),
                                        direction: PortDir::Out,
                                        remote_graph: target_mod.clone(),
                                        remote_node: call.clone(),
                                        edge_kind: GraphEdgeKind::Calls,
                                    },
                                ));
                            }
                        }
                    }
                }
            }

            // Inheritance ports
            for t in &file.types {
                for base in &t.bases {
                    if let Some(target_mod) = symbol_to_module.get(base) {
                        if target_mod != &module.name {
                            ports_to_add.push((
                                i,
                                Port {
                                    local_node: format!("{}.{}", module.name, t.name),
                                    direction: PortDir::Out,
                                    remote_graph: target_mod.clone(),
                                    remote_node: base.clone(),
                                    edge_kind: GraphEdgeKind::Inherits,
                                },
                            ));
                        }
                    }
                }
            }
        }
    }

    // Apply ports
    for (idx, port) in ports_to_add {
        if idx < module_graphs.len() {
            module_graphs[idx].ports.push(port);
        }
    }

    // Update port counts
    for g in &mut module_graphs {
        g.stats.port_count = g.ports.len();
    }

    module_graphs
}

fn resolve_call_module(call: &str, symbol_to_module: &HashMap<String, String>) -> Option<String> {
    // Try full call path
    if let Some(m) = symbol_to_module.get(call) {
        return Some(m.clone());
    }
    // Try prefix (e.g., "Model.invoke" → look up "Model")
    if let Some(prefix) = call.split('.').next() {
        if let Some(m) = symbol_to_module.get(prefix) {
            return Some(m.clone());
        }
    }
    None
}

fn dedup_edges(mut edges: Vec<GraphEdge>) -> Vec<GraphEdge> {
    let mut seen: HashMap<(String, String, String), usize> = HashMap::new();
    let mut result: Vec<GraphEdge> = Vec::new();

    for edge in edges.drain(..) {
        let key = (
            edge.from.clone(),
            edge.to.clone(),
            format!("{:?}", edge.kind),
        );
        if let Some(idx) = seen.get(&key) {
            result[*idx].weight += 1;
        } else {
            seen.insert(key, result.len());
            result.push(edge);
        }
    }

    result
}
