//! O-Level filtering — controls how much of the parsed AST is emitted.
//!
//! Depth = how much you parse.
//! O-level = how much you show of what was parsed.
//!
//! O0: Raw — everything, no filtering
//! O1: Structural — prune noise (dunder methods, stdlib imports, trivial funcs)
//! O2: Semantic — only what "surprises" (branching, external calls, public API)
//! O3: Intent — maximum compression (1 line per module, types + sigs only)

use crate::model::*;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OLevel {
    O0 = 0, // Raw
    O1 = 1, // Structural
    O2 = 2, // Semantic
    O3 = 3, // Intent
}

impl OLevel {
    pub fn from_u8(v: u8) -> Self {
        match v {
            0 => OLevel::O0,
            1 => OLevel::O1,
            2 => OLevel::O2,
            _ => OLevel::O3,
        }
    }
}

/// Filter a workspace in-place according to the O-level.
pub fn apply_olevel(workspace: &mut Workspace, level: OLevel) {
    if level == OLevel::O0 {
        return; // Raw — emit everything
    }

    for module in &mut workspace.modules {
        filter_module(module, level);
    }
}

fn filter_module(module: &mut Module, level: OLevel) {
    for file in &mut module.files {
        filter_file(file, level);
    }
    for sub in &mut module.submodules {
        filter_module(sub, level);
    }
}

fn filter_file(file: &mut FileDescriptor, level: OLevel) {
    match level {
        OLevel::O0 => {}
        OLevel::O1 => filter_o1(file),
        OLevel::O2 => filter_o2(file),
        OLevel::O3 => filter_o3(file),
    }
}

// ── O1: Structural — prune noise ──────────────────────────────────

const STDLIB_PREFIXES: &[&str] = &[
    "os", "sys", "typing", "collections", "pathlib", "abc", "enum",
    "dataclasses", "functools", "itertools", "json", "re", "io",
    "contextlib", "logging", "copy", "hashlib", "uuid", "time",
    "datetime", "math", "string", "textwrap", "warnings",
];

const DUNDER_NOISE: &[&str] = &[
    "__repr__", "__str__", "__hash__", "__eq__", "__ne__",
    "__lt__", "__le__", "__gt__", "__ge__", "__len__",
    "__bool__", "__contains__", "__iter__", "__next__",
    "__enter__", "__exit__", "__del__", "__copy__",
    "__deepcopy__", "__format__", "__sizeof__",
];

fn filter_o1(file: &mut FileDescriptor) {
    // Suppress stdlib imports
    file.imports.retain(|imp| {
        let root = imp.sym.split('.').next().unwrap_or(&imp.sym);
        !STDLIB_PREFIXES.contains(&root)
    });

    // Collapse dunder methods in types
    for t in &mut file.types {
        let dunder_count = t.methods.iter()
            .filter(|m| DUNDER_NOISE.contains(&m.name.as_str()))
            .count();

        if dunder_count > 0 {
            t.methods.retain(|m| !DUNDER_NOISE.contains(&m.name.as_str()));
            // Add a note about suppressed dunders
            if file.notes.is_empty() || !file.notes.iter().any(|n| n.contains("dunder")) {
                // We track this at type level via ctx
                let existing = t.ctx.clone().unwrap_or_default();
                t.ctx = Some(if existing.is_empty() {
                    format!("+{} dunder methods", dunder_count)
                } else {
                    format!("{} (+{} dunder methods)", existing, dunder_count)
                });
            }
        }
    }

    // Suppress trivial functions (< 3 lines, no branching, no external calls)
    for func in &mut file.functions {
        if is_trivial_function(func) {
            // Keep sig but strip detail
            func.detail = None;
        }
    }

    // Suppress trivial fields with obvious types
    for t in &mut file.types {
        t.fields.retain(|f| !is_obvious_field(f));
    }
}

fn is_trivial_function(func: &FuncDescriptor) -> bool {
    let line_count = func.lines
        .map(|(start, end)| end.saturating_sub(start))
        .unwrap_or(0);

    if line_count > 3 {
        return false;
    }

    // If it has external calls, not trivial
    if let Some(detail) = &func.detail {
        let has_external = detail.calls.iter().any(|c| {
            !c.starts_with("self.") && c.contains('.')
        });
        if has_external {
            return false;
        }
    }

    true
}

fn is_obvious_field(field: &FieldDef) -> bool {
    // name: str, count: int, is_active: bool — obvious, suppress
    let name = field.name.to_lowercase();
    let ftype = field.field_type.to_lowercase();

    // "name" with type "str" is obvious
    if (name.contains("name") || name.contains("label") || name.contains("title"))
        && (ftype == "str" || ftype == "string")
    {
        return true;
    }
    if (name.starts_with("is_") || name.starts_with("has_") || name.starts_with("can_"))
        && ftype == "bool"
    {
        return true;
    }
    if (name.contains("count") || name.contains("num_") || name.contains("max_") || name.contains("min_"))
        && (ftype == "int" || ftype == "float")
    {
        return true;
    }

    false
}

// ── O2: Semantic — only surprising things ─────────────────────────

fn filter_o2(file: &mut FileDescriptor) {
    // First apply O1 filters
    filter_o1(file);

    // Remove private functions with no external calls
    file.functions.retain(|f| {
        if f.vis == Visibility::Pub {
            return true; // Always keep public API
        }
        surprise_score(f) > 0.3
    });

    // Remove trivial __init__ that just assigns params
    for t in &mut file.types {
        for method in &mut t.methods {
            if method.name == "__init__" && is_trivial_init(method) {
                let param_count = method.sig
                    .split(',')
                    .count()
                    .saturating_sub(1); // subtract self
                method.detail = None;
                method.sig = format!("__init__(self, ...{} params)", param_count);
            }
        }

        // Remove private methods with low surprise
        t.methods.retain(|m| {
            if m.vis == Visibility::Pub || m.name == "__init__" {
                return true;
            }
            surprise_score(m) > 0.3
        });
    }

    // Suppress re-export __init__.py files
    if file.file.ends_with("__init__.py") && file.types.is_empty() {
        let export_names: Vec<String> = file.exports.iter().map(|e| e.name.clone()).collect();
        if !export_names.is_empty() {
            file.notes.push(format!("re-exports: [{}]", export_names.join(", ")));
            file.imports.clear();
            file.data.clear();
        }
    }
}

fn surprise_score(func: &FuncDescriptor) -> f32 {
    let mut score: f32 = 0.0;

    // Public = always interesting
    if func.vis == Visibility::Pub {
        score += 0.5;
    }

    // Async = typically important
    if func.is_async {
        score += 0.2;
    }

    // Has decorators = special behavior
    if !func.decorators.is_empty() {
        score += 0.15;
    }

    // Long function = complex
    let lines = func.lines
        .map(|(s, e)| e.saturating_sub(s))
        .unwrap_or(0);
    if lines > 20 {
        score += 0.2;
    }

    if let Some(detail) = &func.detail {
        // External calls = side effects
        let external = detail.calls.iter()
            .filter(|c| !c.starts_with("self.") && c.contains('.'))
            .count();
        score += (external as f32 * 0.15).min(0.5);

        // Has opcodes with branching
        if let Some(body) = &detail.body {
            let has_branching = body.iter().any(|op| matches!(op,
                Opcode::BrTrue { .. } | Opcode::Try { .. } | Opcode::Loop { .. }
            ));
            if has_branching {
                score += 0.3;
            }
        }
    }

    score.min(1.0)
}

fn is_trivial_init(func: &FuncDescriptor) -> bool {
    if let Some(detail) = &func.detail {
        // No external calls, no branching in body
        let only_self_assigns = detail.calls.iter()
            .all(|c| c.starts_with("self.") || c == "super().__init__" || c == "super");

        if !only_self_assigns {
            return false;
        }

        if let Some(body) = &detail.body {
            // Only Store ops to self.X or super().__init__ calls
            return body.iter().all(|op| match op {
                Opcode::Store { target, .. } => target.starts_with("self."),
                Opcode::Call { func, .. } => func == "super().__init__" || func.starts_with("super"),
                _ => false,
            });
        }

        // No body = trivial enough
        return true;
    }
    true
}

// ── O3: Intent — maximum compression ──────────────────────────────

fn filter_o3(file: &mut FileDescriptor) {
    // Only keep public types (name + kind only, no fields/methods)
    for t in &mut file.types {
        t.methods.clear();
        t.fields.clear();
        t.variants.clear();
        t.decorators.clear();
        t.ctx = None;
    }
    file.types.retain(|t| t.vis == Visibility::Pub);

    // Only keep public function signatures
    for f in &mut file.functions {
        f.detail = None;
        f.decorators.clear();
    }
    file.functions.retain(|f| f.vis == Visibility::Pub);

    // Only keep cross-module imports
    file.imports.retain(|imp| {
        let root = imp.sym.split('.').next().unwrap_or(&imp.sym);
        !STDLIB_PREFIXES.contains(&root)
    });

    // Strip all data entries
    file.data.clear();

    // Strip notes
    file.notes.clear();
}
