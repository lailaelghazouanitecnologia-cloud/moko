//! DOT/Graphviz export for MicroGraphs.
//!
//! Generates .dot files that can be rendered with:
//!   dot -Tsvg graph.dot -o graph.svg
//!   dot -Tpng graph.dot -o graph.png

use crate::graph::*;
use std::path::Path;

/// Export the entire workspace graph as DOT files.
pub fn emit_dot(wg: &WorkspaceGraph, out_dir: &Path) -> Result<(), String> {
    // Meta graph (module-level overview)
    let meta_dot = render_micro_graph(&wg.meta_graph, true);
    std::fs::write(out_dir.join("workspace.dot"), meta_dot)
        .map_err(|e| format!("Failed to write workspace.dot: {}", e))?;

    // Per-module graphs
    for mg in &wg.module_graphs {
        let dot = render_micro_graph(mg, false);
        let filename = format!("{}.dot", mg.id);
        std::fs::write(out_dir.join(&filename), dot)
            .map_err(|e| format!("Failed to write {}: {}", filename, e))?;
    }

    // Combined graph with all modules as subgraphs
    let combined = render_combined(wg);
    std::fs::write(out_dir.join("combined.dot"), combined)
        .map_err(|e| format!("Failed to write combined.dot: {}", e))?;

    eprintln!(
        "[roska] DOT: workspace.dot + {} module graphs + combined.dot → {:?}",
        wg.module_graphs.len(),
        out_dir
    );
    Ok(())
}

fn render_micro_graph(mg: &MicroGraph, is_meta: bool) -> String {
    let mut dot = String::new();
    dot.push_str(&format!(
        "digraph \"{}\" {{\n  rankdir=LR;\n  label=\"{}\";\n  fontname=\"Helvetica\";\n  node [fontname=\"Helvetica\", fontsize=10];\n  edge [fontname=\"Helvetica\", fontsize=8];\n\n",
        escape_dot(&mg.id),
        escape_dot(&format!("{} (L{}: {}n, {}e, {}p)",
            mg.id, mg.level, mg.stats.node_count, mg.stats.edge_count, mg.stats.port_count)),
    ));

    // Nodes
    for node in &mg.nodes {
        let (shape, color) = match node.kind {
            GraphNodeKind::Module => ("box3d", "#4A90D9"),
            GraphNodeKind::Class => ("record", "#E8A838"),
            GraphNodeKind::Function => ("ellipse", "#50C878"),
            GraphNodeKind::Data => ("note", "#C0C0C0"),
        };

        let label = if is_meta {
            &node.label
        } else {
            &node.id
        };

        dot.push_str(&format!(
            "  \"{}\" [label=\"{}\", shape={}, style=filled, fillcolor=\"{}\"];\n",
            escape_dot(&node.id),
            escape_dot(label),
            shape,
            color,
        ));
    }

    dot.push('\n');

    // Internal edges
    for edge in &mg.internal_edges {
        let (style, color, label) = edge_style(&edge.kind);
        let weight_label = if edge.weight > 1 {
            format!("{} (x{})", label, edge.weight)
        } else {
            label.to_string()
        };

        dot.push_str(&format!(
            "  \"{}\" -> \"{}\" [label=\"{}\", style={}, color=\"{}\"];\n",
            escape_dot(&edge.from),
            escape_dot(&edge.to),
            weight_label,
            style,
            color,
        ));
    }

    // Port edges (cross-graph, shown as dashed)
    for port in &mg.ports {
        let (_, color, label) = edge_style(&port.edge_kind);
        let target_label = format!("{}::{}", port.remote_graph, port.remote_node);

        // Create external node placeholder
        dot.push_str(&format!(
            "  \"ext_{}\" [label=\"{}\", shape=plaintext, fontcolor=\"gray50\"];\n",
            escape_dot(&target_label),
            escape_dot(&target_label),
        ));
        dot.push_str(&format!(
            "  \"{}\" -> \"ext_{}\" [label=\"{}\", style=dashed, color=\"{}\"];\n",
            escape_dot(&port.local_node),
            escape_dot(&target_label),
            label,
            color,
        ));
    }

    dot.push_str("}\n");
    dot
}

fn render_combined(wg: &WorkspaceGraph) -> String {
    let mut dot = String::new();
    dot.push_str(&format!(
        "digraph \"{}\" {{\n  rankdir=LR;\n  label=\"{} — Combined Graph\";\n  fontname=\"Helvetica\";\n  node [fontname=\"Helvetica\", fontsize=9];\n  edge [fontname=\"Helvetica\", fontsize=7];\n  compound=true;\n\n",
        escape_dot(&wg.name),
        escape_dot(&wg.name),
    ));

    // Each module as a subgraph/cluster
    for mg in &wg.module_graphs {
        dot.push_str(&format!(
            "  subgraph \"cluster_{}\" {{\n    label=\"{}\";\n    style=rounded;\n    color=\"#4A90D9\";\n\n",
            escape_dot(&mg.id),
            escape_dot(&mg.id),
        ));

        for node in &mg.nodes {
            let (shape, color) = match node.kind {
                GraphNodeKind::Module => ("box3d", "#4A90D9"),
                GraphNodeKind::Class => ("record", "#E8A838"),
                GraphNodeKind::Function => ("ellipse", "#50C878"),
                GraphNodeKind::Data => ("note", "#C0C0C0"),
            };
            dot.push_str(&format!(
                "    \"{}\" [label=\"{}\", shape={}, style=filled, fillcolor=\"{}\"];\n",
                escape_dot(&node.id),
                escape_dot(&node.label),
                shape,
                color,
            ));
        }

        // Internal edges
        for edge in &mg.internal_edges {
            let (style, color, label) = edge_style(&edge.kind);
            dot.push_str(&format!(
                "    \"{}\" -> \"{}\" [label=\"{}\", style={}, color=\"{}\"];\n",
                escape_dot(&edge.from),
                escape_dot(&edge.to),
                label,
                style,
                color,
            ));
        }

        dot.push_str("  }\n\n");
    }

    // Cross-module edges from meta graph
    for edge in &wg.meta_graph.internal_edges {
        let (_style, color, label) = edge_style(&edge.kind);
        dot.push_str(&format!(
            "  \"{}\" -> \"{}\" [label=\"{}\", style=bold, color=\"{}\", penwidth=2];\n",
            escape_dot(&edge.from),
            escape_dot(&edge.to),
            label,
            color,
        ));
    }

    dot.push_str("}\n");
    dot
}

fn edge_style(kind: &GraphEdgeKind) -> (&str, &str, &str) {
    match kind {
        GraphEdgeKind::Imports => ("solid", "#4A90D9", "imports"),
        GraphEdgeKind::Calls => ("solid", "#50C878", "calls"),
        GraphEdgeKind::Inherits => ("bold", "#E8A838", "inherits"),
        GraphEdgeKind::Contains => ("dotted", "#999999", "contains"),
    }
}

fn escape_dot(s: &str) -> String {
    s.replace('\\', "\\\\")
        .replace('"', "\\\"")
        .replace('\n', "\\n")
}
