//! YAML emitter — produces Roska-compatible YAML descriptors.
//! Outputs workspace.yaml, module.yaml per module, and file.yaml per file.

use crate::model::*;
use std::path::Path;

pub fn emit_workspace(workspace: &Workspace, out_dir: &Path) {
    // Emit workspace.yaml
    let ws_path = out_dir.join("workspace.yaml");
    let ws_yaml = serde_yaml::to_string(&WorkspaceYaml::from(workspace)).unwrap();
    std::fs::write(&ws_path, format!("## Roska Workspace Descriptor — {}\n{}", workspace.name, ws_yaml)).unwrap();

    // Emit each module
    for module in &workspace.modules {
        emit_module(module, out_dir, &workspace.name);
    }

    // Emit dependency graph
    let dep_graph = build_dep_graph(workspace);
    if !dep_graph.nodes.is_empty() {
        let dep_path = out_dir.join("deps.yaml");
        let dep_yaml = serde_yaml::to_string(&dep_graph).unwrap();
        std::fs::write(&dep_path, format!("## Dependency Graph — {}\n{}", workspace.name, dep_yaml)).unwrap();
    }
}

fn emit_module(module: &Module, out_dir: &Path, pkg_name: &str) {
    let mod_dir = out_dir.join(&module.name);
    std::fs::create_dir_all(&mod_dir).unwrap();

    // Emit module.yaml
    let mod_yaml = serde_yaml::to_string(&ModuleYaml::from(module)).unwrap();
    std::fs::write(
        mod_dir.join("module.yaml"),
        format!("## Roska Module Descriptor — {}/{}\n{}", pkg_name, module.name, mod_yaml),
    ).unwrap();

    // Emit each file descriptor
    for file in &module.files {
        let file_stem = Path::new(&file.file)
            .file_stem()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();

        // Skip __init__.py unless it has significant content
        if file_stem == "__init__" && file.types.is_empty() && file.functions.is_empty() && file.lines < 50 {
            continue;
        }

        let file_yaml = serde_yaml::to_string(&file).unwrap();
        std::fs::write(
            mod_dir.join(format!("{}.yaml", file_stem)),
            format!("## Roska File Descriptor — {}\n{}", file.file, file_yaml),
        ).unwrap();
    }

    // Emit submodules recursively
    for sub in &module.submodules {
        emit_module(sub, &mod_dir, &format!("{}/{}", pkg_name, module.name));
    }
}

// ── Workspace YAML shape ───────────────────────────────────────────
#[derive(serde::Serialize)]
struct WorkspaceYaml {
    name: String,
    path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    purpose: Option<String>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    tags: Vec<String>,
    total_files: usize,
    total_lines: usize,
    modules: Vec<ModuleSummary>,
}

#[derive(serde::Serialize)]
struct ModuleSummary {
    name: String,
    files: usize,
    lines: usize,
    types: usize,
    functions: usize,
}

impl From<&Workspace> for WorkspaceYaml {
    fn from(ws: &Workspace) -> Self {
        WorkspaceYaml {
            name: ws.name.clone(),
            path: ws.path.clone(),
            purpose: ws.purpose.clone(),
            tags: ws.tags.clone(),
            total_files: ws.total_files,
            total_lines: ws.total_lines,
            modules: ws
                .modules
                .iter()
                .map(|m| ModuleSummary {
                    name: m.name.clone(),
                    files: m.files.len(),
                    lines: m.total_lines,
                    types: m.files.iter().map(|f| f.types.len()).sum(),
                    functions: m.files.iter().map(|f| f.functions.len()).sum(),
                })
                .collect(),
        }
    }
}

// ── Module YAML shape ──────────────────────────────────────────────
#[derive(serde::Serialize)]
struct ModuleYaml {
    name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    purpose: Option<String>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    tags: Vec<String>,
    total_lines: usize,
    files: Vec<FileSummary>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    submodules: Vec<String>,
}

#[derive(serde::Serialize)]
struct FileSummary {
    file: String,
    lines: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    purpose: Option<String>,
    types: usize,
    functions: usize,
    imports: usize,
    exports: usize,
}

impl From<&Module> for ModuleYaml {
    fn from(m: &Module) -> Self {
        ModuleYaml {
            name: m.name.clone(),
            purpose: m.purpose.clone(),
            tags: m.tags.clone(),
            total_lines: m.total_lines,
            files: m
                .files
                .iter()
                .map(|f| FileSummary {
                    file: f.file.clone(),
                    lines: f.lines,
                    purpose: f.purpose.clone(),
                    types: f.types.len(),
                    functions: f.functions.len(),
                    imports: f.imports.len(),
                    exports: f.exports.len(),
                })
                .collect(),
            submodules: m.submodules.iter().map(|s| s.name.clone()).collect(),
        }
    }
}

// ── Dependency Graph ───────────────────────────────────────────────
fn build_dep_graph(workspace: &Workspace) -> DepGraph {
    let mut nodes = Vec::new();
    let mut edges = Vec::new();
    let mut seen_imports = std::collections::HashSet::new();

    for module in &workspace.modules {
        nodes.push(DepNode {
            id: module.name.clone(),
            kind: DepNodeKind::Module,
            file: String::new(),
        });

        for file in &module.files {
            // Track classes as nodes
            for t in &file.types {
                nodes.push(DepNode {
                    id: format!("{}.{}", module.name, t.name),
                    kind: DepNodeKind::Class,
                    file: file.file.clone(),
                });

                // Inheritance edges
                for base in &t.bases {
                    edges.push(DepEdge {
                        from: format!("{}.{}", module.name, t.name),
                        to: base.clone(),
                        kind: DepEdgeKind::Inherits,
                    });
                }
            }

            // Import edges (module-level)
            for imp in &file.imports {
                let target_module = imp.sym.split('.').next().unwrap_or(&imp.sym).to_string();
                let edge_key = format!("{}→{}", module.name, target_module);
                if target_module != module.name && !seen_imports.contains(&edge_key) {
                    // Only add if target is an internal module
                    if workspace.modules.iter().any(|m| m.name == target_module) {
                        edges.push(DepEdge {
                            from: module.name.clone(),
                            to: target_module.clone(),
                            kind: DepEdgeKind::Imports,
                        });
                        seen_imports.insert(edge_key);
                    }
                }
            }

            // Call edges from function details
            for func in &file.functions {
                if let Some(detail) = &func.detail {
                    for call in &detail.calls {
                        // Only track cross-module calls
                        if call.contains('.') {
                            let parts: Vec<&str> = call.split('.').collect();
                            if parts.len() >= 2 {
                                edges.push(DepEdge {
                                    from: format!("{}.{}", module.name, func.name),
                                    to: call.clone(),
                                    kind: DepEdgeKind::Calls,
                                });
                            }
                        }
                    }
                }
            }

            // Also scan class methods for calls
            for t in &file.types {
                for method in &t.methods {
                    if let Some(detail) = &method.detail {
                        for call in &detail.calls {
                            if call.contains('.') && !call.starts_with("self.") {
                                edges.push(DepEdge {
                                    from: format!("{}.{}.{}", module.name, t.name, method.name),
                                    to: call.clone(),
                                    kind: DepEdgeKind::Calls,
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    DepGraph { nodes, edges }
}
