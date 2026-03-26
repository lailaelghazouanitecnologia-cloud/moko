mod dot;
mod emit;
mod graph;
mod model;
mod olevel;
mod opcodes;
mod parse;
mod parse_ts;

use clap::Parser as ClapParser;
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

#[derive(ClapParser)]
#[command(name = "lyzed-ts", about = "Tree-sitter Python analyzer → Roska YAML")]
struct Cli {
    /// Root directory of Python package to analyze
    #[arg(short, long)]
    input: PathBuf,

    /// Output directory for YAML descriptors
    #[arg(short, long)]
    output: PathBuf,

    /// Package name
    #[arg(short, long, default_value = "package")]
    name: String,

    /// Maximum opcode depth (0=overview, 1=structure, 2=detail, 3=body)
    #[arg(short, long, default_value = "3")]
    depth: u8,

    /// Output optimization level (0=raw, 1=structural, 2=semantic, 3=intent)
    #[arg(long, default_value = "0")]
    olevel: u8,

    /// Emit DOT/Graphviz files for graph visualization
    #[arg(long)]
    dot: bool,

    /// Emit MicroGraph YAML files
    #[arg(long)]
    graph: bool,

    /// Enable opcode extraction (Depth 3 body-level opcodes)
    #[arg(long)]
    opcodes: bool,

    /// Language to parse (auto-detected from files if not specified)
    #[arg(long, default_value = "auto")]
    lang: String,
}

#[derive(Debug, Clone, Copy, PartialEq)]
enum Lang {
    Python,
    TypeScript,
}

/// Stack size for main thread — large enough for deeply nested ASTs.
const MAIN_STACK_SIZE: usize = 256 * 1024 * 1024; // 256 MB

fn main() {
    let builder = std::thread::Builder::new().stack_size(MAIN_STACK_SIZE);
    let handler = builder
        .spawn(|| real_main())
        .expect("Failed to spawn thread");
    handler.join().expect("Thread panicked");
}

fn real_main() {
    let cli = Cli::parse();

    if !cli.input.exists() {
        eprintln!("Error: input path {:?} does not exist", cli.input);
        std::process::exit(1);
    }

    std::fs::create_dir_all(&cli.output).expect("Failed to create output directory");

    // Detect language
    let lang = detect_language(&cli);
    let extensions: &[&str] = match lang {
        Lang::Python => &["py"],
        Lang::TypeScript => &["ts", "tsx"],
    };

    // Collect source files
    let source_files: Vec<PathBuf> = WalkDir::new(&cli.input)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| {
            let path_str = e.path().to_string_lossy();
            e.path().extension().map_or(false, |ext| {
                extensions.iter().any(|x| ext == *x)
            })
                && !path_str.contains("__pycache__")
                && !path_str.contains(".egg-info")
                && !path_str.contains("node_modules")
                && !path_str.contains(".d.ts") // skip declaration files
                && !path_str.contains("/dist/")
                && !path_str.contains("/build/")
        })
        .map(|e| e.path().to_path_buf())
        .collect();

    eprintln!("[lyzed-ts] Found {} {:?} files in {:?}", source_files.len(), lang, cli.input);

    // Build module tree from directory structure
    let mut workspace = match lang {
        Lang::Python => {
            let mut parser = parse::create_parser();
            build_workspace(&cli, &source_files, &mut parser, Lang::Python)
        }
        Lang::TypeScript => {
            let mut parser = parse_ts::create_parser();
            build_workspace(&cli, &source_files, &mut parser, Lang::TypeScript)
        }
    };

    // Extract opcodes if requested (Depth 3) — Python only for now
    if cli.opcodes && lang == Lang::Python {
        eprintln!("[lyzed-ts] Extracting opcodes (iterative)...");
        let mut py_parser = parse::create_parser();
        extract_all_opcodes(&mut workspace, &cli.input, &mut py_parser);
    }

    // Apply O-level filtering
    let o = olevel::OLevel::from_u8(cli.olevel);
    if o != olevel::OLevel::O0 {
        eprintln!("[lyzed-ts] Applying O{} filter...", cli.olevel);
        olevel::apply_olevel(&mut workspace, o);
    }

    // Emit YAML descriptors
    if let Err(e) = emit::emit_workspace(&workspace, &cli.output) {
        eprintln!("[lyzed-ts] Error emitting YAML: {}", e);
        std::process::exit(1);
    }

    // Build and emit MicroGraphs
    if cli.graph || cli.dot {
        eprintln!("[lyzed-ts] Building workspace graph...");
        let wg = graph::build_workspace_graph(&workspace);

        if cli.graph {
            if let Err(e) = emit::emit_workspace_graph(&wg, &cli.output) {
                eprintln!("[lyzed-ts] Error emitting graphs: {}", e);
                std::process::exit(1);
            }
        }

        if cli.dot {
            if let Err(e) = dot::emit_dot(&wg, &cli.output) {
                eprintln!("[lyzed-ts] Error emitting DOT: {}", e);
                std::process::exit(1);
            }
        }

        eprintln!(
            "[lyzed-ts] Graph: {} module graphs, {} meta-nodes, {} meta-edges",
            wg.module_graphs.len(),
            wg.meta_graph.stats.node_count,
            wg.meta_graph.stats.edge_count,
        );
    }

    eprintln!(
        "[lyzed-ts] Done: {} modules, {} files, {} total lines → {:?}",
        workspace.modules.len(),
        workspace.total_files,
        workspace.total_lines,
        cli.output
    );
}

fn extract_all_opcodes(
    workspace: &mut model::Workspace,
    root: &Path,
    parser: &mut tree_sitter::Parser,
) {
    for module in &mut workspace.modules {
        extract_module_opcodes(module, root, parser);
    }
}

fn extract_module_opcodes(
    module: &mut model::Module,
    root: &Path,
    parser: &mut tree_sitter::Parser,
) {
    for file in &mut module.files {
        let file_path = root.join(&file.file);
        let source = match std::fs::read_to_string(&file_path) {
            Ok(s) => s,
            Err(e) => {
                eprintln!("[lyzed-ts] Warning: cannot read {}: {}", file_path.display(), e);
                continue;
            }
        };

        let tree = match parser.parse(&source, None) {
            Some(t) => t,
            None => {
                eprintln!("[lyzed-ts] Warning: failed to parse {}", file_path.display());
                continue;
            }
        };

        let root_node = tree.root_node();

        // Extract opcodes for top-level functions
        for func in &mut file.functions {
            if let Some((start, _end)) = func.lines {
                if let Some(func_node) = find_function_at_line(&root_node, start) {
                    let (ops, locals) = opcodes::extract_opcodes(&func_node, &source);
                    if let Some(detail) = &mut func.detail {
                        detail.body = if ops.is_empty() { None } else { Some(ops) };
                        if detail.locals.is_empty() {
                            detail.locals = locals;
                        }
                    }
                }
            }
        }

        // Extract opcodes for methods in types
        for t in &mut file.types {
            for method in &mut t.methods {
                if let Some((start, _end)) = method.lines {
                    if let Some(func_node) = find_function_at_line(&root_node, start) {
                        let (ops, locals) = opcodes::extract_opcodes(&func_node, &source);
                        if let Some(detail) = &mut method.detail {
                            detail.body = if ops.is_empty() { None } else { Some(ops) };
                            if detail.locals.is_empty() {
                                detail.locals = locals;
                            }
                        }
                    }
                }
            }
        }
    }

    for sub in &mut module.submodules {
        extract_module_opcodes(sub, root, parser);
    }
}

/// Find a function_definition node that starts at the given line (1-indexed).
fn find_function_at_line<'a>(root: &'a tree_sitter::Node<'a>, line: usize) -> Option<tree_sitter::Node<'a>> {
    let target_row = line.saturating_sub(1); // tree-sitter uses 0-indexed rows

    let mut stack = vec![*root];
    while let Some(node) = stack.pop() {
        if (node.kind() == "function_definition" || node.kind() == "decorated_definition")
            && node.start_position().row == target_row
        {
            // If decorated, return the inner function_definition
            if node.kind() == "decorated_definition" {
                let mut cursor = node.walk();
                for child in node.children(&mut cursor) {
                    if child.kind() == "function_definition" {
                        return Some(child);
                    }
                }
            }
            return Some(node);
        }

        let mut cursor = node.walk();
        for child in node.children(&mut cursor) {
            if child.child_count() > 0 {
                stack.push(child);
            }
        }
    }

    None
}

fn detect_language(cli: &Cli) -> Lang {
    if cli.lang == "python" || cli.lang == "py" {
        return Lang::Python;
    }
    if cli.lang == "typescript" || cli.lang == "ts" {
        return Lang::TypeScript;
    }
    // Auto-detect: count files by extension
    let mut py_count = 0;
    let mut ts_count = 0;
    for entry in WalkDir::new(&cli.input).into_iter().filter_map(|e| e.ok()) {
        if let Some(ext) = entry.path().extension() {
            match ext.to_str().unwrap_or("") {
                "py" => py_count += 1,
                "ts" | "tsx" => ts_count += 1,
                _ => {}
            }
        }
    }
    if ts_count > py_count { Lang::TypeScript } else { Lang::Python }
}

fn build_workspace(
    cli: &Cli,
    source_files: &[PathBuf],
    parser: &mut tree_sitter::Parser,
    lang: Lang,
) -> model::Workspace {
    // Group files by module path (first directory component)
    let mut top_modules: BTreeMap<String, Vec<PathBuf>> = BTreeMap::new();

    for f in source_files {
        let rel = f.strip_prefix(&cli.input).unwrap_or(f);
        let components: Vec<String> = rel
            .components()
            .map(|c| c.as_os_str().to_string_lossy().to_string())
            .collect();

        let module_name = if components.len() <= 1 {
            "__root__".to_string()
        } else {
            components[0].clone()
        };

        top_modules.entry(module_name).or_default().push(f.clone());
    }

    let mut modules = Vec::new();
    let mut total_files = 0;
    let mut total_lines = 0;

    for (mod_name, files) in &top_modules {
        let module = build_module(mod_name, files, &cli.input, parser, lang);
        total_files += count_files(&module);
        total_lines += module.total_lines;
        modules.push(module);
    }

    model::Workspace {
        name: cli.name.clone(),
        path: cli.input.to_string_lossy().to_string(),
        purpose: None,
        tags: Vec::new(),
        modules,
        shared_deps: Vec::new(),
        total_files,
        total_lines,
    }
}

fn build_module(
    name: &str,
    files: &[PathBuf],
    root: &Path,
    parser: &mut tree_sitter::Parser,
    lang: Lang,
) -> model::Module {
    // Separate direct files from submodule files
    let mut direct_files = Vec::new();
    let mut sub_groups: BTreeMap<String, Vec<PathBuf>> = BTreeMap::new();

    for f in files {
        let rel = f.strip_prefix(root).unwrap_or(f);
        let components: Vec<String> = rel
            .components()
            .map(|c| c.as_os_str().to_string_lossy().to_string())
            .collect();

        if name == "__root__" {
            // Root-level files
            direct_files.push(f.clone());
        } else if components.len() <= 2 {
            // Direct file in this module (e.g., agent/agent.py)
            direct_files.push(f.clone());
        } else {
            // File in a submodule (e.g., agent/memory/manager.py)
            let sub_name = components[1].clone();
            sub_groups.entry(sub_name).or_default().push(f.clone());
        }
    }

    let mut file_descs = Vec::new();
    let mut total_lines = 0;

    for f in &direct_files {
        let source = match std::fs::read_to_string(f) {
            Ok(s) => s,
            Err(_) => continue,
        };

        let rel_path = f
            .strip_prefix(root)
            .unwrap_or(f)
            .to_string_lossy()
            .to_string();
        let line_count = source.lines().count();
        total_lines += line_count;

        eprintln!("  parsing: {} ({} lines)", rel_path, line_count);
        let fd = match lang {
            Lang::Python => parse::parse_file(parser, &source, &rel_path, line_count),
            Lang::TypeScript => parse_ts::parse_file(parser, &source, &rel_path, line_count),
        };
        file_descs.push(fd);
    }

    // Build submodules
    let mut submodules = Vec::new();
    for (sub_name, sub_files) in &sub_groups {
        let sub_root = if name == "__root__" {
            root.to_path_buf()
        } else {
            root.join(name)
        };
        let sub = build_module(sub_name, sub_files, &sub_root, parser, lang);
        total_lines += sub.total_lines;
        submodules.push(sub);
    }

    // Extract module purpose from __init__.py or index.ts
    let purpose = file_descs
        .iter()
        .find(|f| f.file.ends_with("__init__.py") || f.file.ends_with("index.ts") || f.file.ends_with("index.tsx"))
        .and_then(|f| f.purpose.clone());

    model::Module {
        name: name.to_string(),
        purpose,
        tags: Vec::new(),
        files: file_descs,
        submodules,
        total_lines,
        dominant_layer: None, // computed at emit time
    }
}

fn count_files(module: &model::Module) -> usize {
    let direct = module.files.len();
    let sub: usize = module.submodules.iter().map(|s| count_files(s)).sum();
    direct + sub
}
