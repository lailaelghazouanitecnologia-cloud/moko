mod emit;
mod model;
mod parse;

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
}

fn main() {
    // Use larger stack to handle deeply nested Python files
    let builder = std::thread::Builder::new().stack_size(256 * 1024 * 1024);
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

    // Collect all Python files
    let py_files: Vec<PathBuf> = WalkDir::new(&cli.input)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.path().extension().map_or(false, |ext| ext == "py")
                && !e.path().to_string_lossy().contains("__pycache__")
                && !e.path().to_string_lossy().contains(".egg-info")
        })
        .map(|e| e.path().to_path_buf())
        .collect();

    eprintln!("[lyzed-ts] Found {} Python files in {:?}", py_files.len(), cli.input);

    let mut parser = parse::create_parser();

    // Build module tree from directory structure
    let workspace = build_workspace(&cli, &py_files, &mut parser);

    // Emit YAML
    emit::emit_workspace(&workspace, &cli.output);

    eprintln!(
        "[lyzed-ts] Done: {} modules, {} files, {} total lines → {:?}",
        workspace.modules.len(),
        workspace.total_files,
        workspace.total_lines,
        cli.output
    );
}

fn build_workspace(
    cli: &Cli,
    py_files: &[PathBuf],
    parser: &mut tree_sitter::Parser,
) -> model::Workspace {
    // Group files by module path (first directory component)
    let mut top_modules: BTreeMap<String, Vec<PathBuf>> = BTreeMap::new();

    for f in py_files {
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
        let module = build_module(mod_name, files, &cli.input, parser);
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
        let fd = parse::parse_file(parser, &source, &rel_path, line_count);
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
        let sub = build_module(sub_name, sub_files, &sub_root, parser);
        total_lines += sub.total_lines;
        submodules.push(sub);
    }

    // Extract module purpose from __init__.py docstring
    let purpose = file_descs
        .iter()
        .find(|f| f.file.ends_with("__init__.py"))
        .and_then(|f| f.purpose.clone());

    model::Module {
        name: name.to_string(),
        purpose,
        tags: Vec::new(),
        files: file_descs,
        submodules,
        total_lines,
    }
}

fn count_files(module: &model::Module) -> usize {
    let direct = module.files.len();
    let sub: usize = module.submodules.iter().map(|s| count_files(s)).sum();
    direct + sub
}
