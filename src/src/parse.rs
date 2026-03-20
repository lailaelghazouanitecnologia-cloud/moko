//! Tree-sitter based Python parser.
//! Extracts classes, functions, imports, fields, decorators, assignments,
//! call graph, and opcodes from Python source files.

use crate::model::*;
use tree_sitter::{Node, Parser};

pub fn create_parser() -> Parser {
    let mut parser = Parser::new();
    let language = tree_sitter_python::LANGUAGE;
    parser
        .set_language(&language.into())
        .expect("Failed to set Python language");
    parser
}

pub fn parse_file(
    parser: &mut Parser,
    source: &str,
    rel_path: &str,
    line_count: usize,
) -> FileDescriptor {
    let tree = parser.parse(source, None).expect("Failed to parse");
    let root = tree.root_node();

    let mut file = FileDescriptor {
        file: rel_path.to_string(),
        lines: line_count,
        purpose: None,
        tags: Vec::new(),
        ctx: None,
        notes: Vec::new(),
        imports: Vec::new(),
        data: Vec::new(),
        types: Vec::new(),
        functions: Vec::new(),
        exports: Vec::new(),
    };

    // Extract module-level docstring
    if let Some(first_child) = root.child(0) {
        if first_child.kind() == "expression_statement" {
            if let Some(expr) = first_child.child(0) {
                if expr.kind() == "string" {
                    file.purpose = Some(clean_docstring(&node_text(&expr, source)));
                }
            }
        }
    }

    // Walk top-level nodes
    let mut cursor = root.walk();
    for child in root.children(&mut cursor) {
        match child.kind() {
            "import_statement" | "import_from_statement" => {
                extract_imports(&child, source, &mut file.imports);
            }
            "class_definition" => {
                let td = extract_class(&child, source);
                file.types.push(td);
            }
            "function_definition" | "decorated_definition" => {
                let fd = extract_function_or_decorated(&child, source);
                file.functions.push(fd);
            }
            "assignment" | "augmented_assignment" => {
                if let Some(data) = extract_assignment(&child, source) {
                    file.data.push(data);
                }
            }
            "expression_statement" => {
                // type-annotated assignments at module level
                if let Some(ann) = child.child(0) {
                    if ann.kind() == "assignment" {
                        if let Some(data) = extract_assignment(&ann, source) {
                            file.data.push(data);
                        }
                    }
                }
            }
            _ => {}
        }
    }

    // Build __all__ exports or infer from public names
    extract_exports(&root, source, &mut file);

    file
}

// ── Imports ────────────────────────────────────────────────────────
fn extract_imports(node: &Node, source: &str, imports: &mut Vec<ImportEntry>) {
    match node.kind() {
        "import_statement" => {
            // import foo, import foo.bar
            let mut cursor = node.walk();
            for child in node.children(&mut cursor) {
                if child.kind() == "dotted_name" || child.kind() == "aliased_import" {
                    let sym = node_text(&child, source);
                    imports.push(ImportEntry {
                        sym,
                        kind: ImportKind::Use,
                        ctx: None,
                    });
                }
            }
        }
        "import_from_statement" => {
            // from foo import bar, baz
            let module = find_child_by_kind(node, "dotted_name")
                .or_else(|| find_child_by_kind(node, "relative_import"))
                .map(|n| node_text(&n, source))
                .unwrap_or_default();

            // Check for wildcard
            if let Some(_wc) = find_child_by_kind(node, "wildcard_import") {
                imports.push(ImportEntry {
                    sym: format!("{}.*", module),
                    kind: ImportKind::Use,
                    ctx: None,
                });
                return;
            }

            let mut cursor = node.walk();
            for child in node.children(&mut cursor) {
                if child.kind() == "dotted_name" && child.start_position() != node.child(1).map(|n| n.start_position()).unwrap_or_default() {
                    let name = node_text(&child, source);
                    if name != module {
                        imports.push(ImportEntry {
                            sym: format!("{}.{}", module, name),
                            kind: ImportKind::Use,
                            ctx: None,
                        });
                    }
                } else if child.kind() == "aliased_import" {
                    let name = child.child(0).map(|n| node_text(&n, source)).unwrap_or_default();
                    imports.push(ImportEntry {
                        sym: format!("{}.{}", module, name),
                        kind: ImportKind::Use,
                        ctx: None,
                    });
                }
            }

            // If we found no imported names, import the module itself
            if imports.is_empty() || imports.last().map(|i| !i.sym.starts_with(&module)).unwrap_or(true) {
                // Try import_list
                if let Some(import_list) = find_child_by_kind(node, "import_list") {
                    let mut lc = import_list.walk();
                    for item in import_list.children(&mut lc) {
                        match item.kind() {
                            "dotted_name" | "aliased_import" => {
                                let name = if item.kind() == "aliased_import" {
                                    item.child(0).map(|n| node_text(&n, source)).unwrap_or_default()
                                } else {
                                    node_text(&item, source)
                                };
                                imports.push(ImportEntry {
                                    sym: format!("{}.{}", module, name),
                                    kind: ImportKind::Use,
                                    ctx: None,
                                });
                            }
                            _ => {}
                        }
                    }
                }
            }
        }
        _ => {}
    }
}

// ── Classes ────────────────────────────────────────────────────────
fn extract_class(node: &Node, source: &str) -> TypeDescriptor {
    let (decorators, class_node) = if node.kind() == "decorated_definition" {
        let decos = extract_decorators(node, source);
        let inner = find_child_by_kind(node, "class_definition")
            .unwrap_or(*node);
        (decos, inner)
    } else {
        (Vec::new(), *node)
    };

    let name = find_child_by_kind(&class_node, "identifier")
        .map(|n| node_text(&n, source))
        .unwrap_or_else(|| "Unknown".to_string());

    let bases = extract_bases(&class_node, source);
    let body = find_child_by_kind(&class_node, "block")
        .unwrap_or(class_node);

    // Determine kind
    let kind = classify_type(&bases, &decorators);
    let vis = name_visibility(&name);

    let mut fields = Vec::new();
    let mut methods = Vec::new();
    let mut variants = Vec::new();
    let mut class_docstring = None;

    let method_count = {
        let mut mc = body.walk();
        body.children(&mut mc)
            .filter(|c| c.kind() == "function_definition" || c.kind() == "decorated_definition")
            .count()
    };

    let mut cursor = body.walk();
    for child in body.children(&mut cursor) {
        match child.kind() {
            "function_definition" | "decorated_definition" => {
                let func = extract_function_or_decorated(&child, source);
                // Extract fields from __init__
                if func.name == "__init__" {
                    extract_init_fields(&child, source, &mut fields);
                }
                methods.push(func);
            }
            "expression_statement" => {
                if let Some(expr) = child.child(0) {
                    match expr.kind() {
                        "string" if class_docstring.is_none() => {
                            class_docstring = Some(clean_docstring(&node_text(&expr, source)));
                        }
                        "assignment" => {
                            if let Some(field) = extract_class_var(&expr, source) {
                                if kind == TypeKind::Enum {
                                    variants.push(VariantDef {
                                        name: field.name,
                                        val: field.default,
                                        ctx: None,
                                    });
                                } else {
                                    fields.push(field);
                                }
                            }
                        }
                        _ => {}
                    }
                }
            }
            // Type-annotated class variables (PEP 526)
            "type" => {
                // Actually this is handled differently by tree-sitter-python
            }
            _ => {
                // Handle annotated assignments (e.g., name: str = "default")
                if child.kind() == "expression_statement" || child.kind() == "assignment" {
                    if let Some(field) = extract_class_var(&child, source) {
                        fields.push(field);
                    }
                }
            }
        }
    }

    // Also extract annotated class-level fields
    extract_annotated_fields(&body, source, &mut fields);

    TypeDescriptor {
        name,
        kind,
        vis,
        ctx: class_docstring,
        bases,
        decorators,
        fields,
        variants,
        methods,
        lines: Some((
            class_node.start_position().row + 1,
            class_node.end_position().row + 1,
        )),
    }
}

fn classify_type(bases: &[String], decorators: &[String]) -> TypeKind {
    if bases.iter().any(|b| b == "Enum" || b == "StrEnum" || b == "IntEnum" || b.ends_with("Enum")) {
        TypeKind::Enum
    } else if bases.iter().any(|b| b == "ABC" || b == "Protocol" || b.contains("ABC")) {
        TypeKind::Trait
    } else if bases.iter().any(|b| b == "BaseModel" || b.contains("BaseModel")) {
        TypeKind::Model
    } else if decorators.iter().any(|d| d.contains("dataclass")) {
        TypeKind::Struct
    } else {
        TypeKind::Struct
    }
}

fn extract_bases(class_node: &Node, source: &str) -> Vec<String> {
    let mut bases = Vec::new();
    if let Some(arg_list) = find_child_by_kind(class_node, "argument_list") {
        let mut cursor = arg_list.walk();
        for child in arg_list.children(&mut cursor) {
            match child.kind() {
                "identifier" | "attribute" => {
                    bases.push(node_text(&child, source));
                }
                "keyword_argument" => {
                    // metaclass=ABCMeta etc
                    bases.push(node_text(&child, source));
                }
                _ => {}
            }
        }
    }
    bases
}

fn extract_decorators(node: &Node, source: &str) -> Vec<String> {
    let mut decos = Vec::new();
    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        if child.kind() == "decorator" {
            // Skip the @ sign
            let text = node_text(&child, source);
            let deco = text.trim_start_matches('@').trim().to_string();
            decos.push(deco);
        }
    }
    decos
}

fn extract_annotated_fields(body: &Node, source: &str, fields: &mut Vec<FieldDef>) {
    let mut cursor = body.walk();
    for child in body.children(&mut cursor) {
        if child.kind() == "expression_statement" {
            if let Some(expr) = child.child(0) {
                if expr.kind() == "type" {
                    // name: Type = default
                    if let (Some(name_node), Some(type_node)) = (expr.child(0), expr.child_by_field_name("type")) {
                        let name = node_text(&name_node, source);
                        if !name.starts_with('#') && name != "..." {
                            let field_type = node_text(&type_node, source);
                            // Check if there's a default value (would be assignment wrapping this)
                            fields.push(FieldDef {
                                name,
                                field_type,
                                default: None,
                                ctx: None,
                            });
                        }
                    }
                }
            }
        }
    }
}

fn extract_class_var(node: &Node, source: &str) -> Option<FieldDef> {
    // Handles: name = value, name: Type = value
    let lhs = node.child(0)?;
    let name = node_text(&lhs, source);

    // Skip dunder assignments like __slots__
    if name.starts_with("__") && name.ends_with("__") && name != "__init__" {
        return None;
    }

    let rhs = node.child(2).map(|n| node_text(&n, source));

    // Check for type annotation
    let field_type = if lhs.kind() == "type" {
        lhs.child_by_field_name("type")
            .map(|n| node_text(&n, source))
            .unwrap_or_else(|| "Any".to_string())
    } else {
        infer_type_from_value(rhs.as_deref())
    };

    let actual_name = if lhs.kind() == "type" {
        lhs.child(0).map(|n| node_text(&n, source)).unwrap_or(name)
    } else {
        name
    };

    Some(FieldDef {
        name: actual_name,
        field_type,
        default: rhs,
        ctx: None,
    })
}

fn extract_init_fields(node: &Node, source: &str, fields: &mut Vec<FieldDef>) {
    // Look for self.x = ... patterns in __init__ body
    let func_node = if node.kind() == "decorated_definition" {
        find_child_by_kind(node, "function_definition").unwrap_or(*node)
    } else {
        *node
    };

    let body = match find_child_by_kind(&func_node, "block") {
        Some(b) => b,
        None => return,
    };

    walk_for_self_assignments(&body, source, fields);
}

fn walk_for_self_assignments(node: &Node, source: &str, fields: &mut Vec<FieldDef>) {
    walk_for_self_assignments_inner(node, source, fields, 0);
}

fn walk_for_self_assignments_inner(node: &Node, source: &str, fields: &mut Vec<FieldDef>, depth: usize) {
    if depth > 6 { return; }
    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        if child.kind() == "expression_statement" {
            if let Some(expr) = child.child(0) {
                if expr.kind() == "assignment" {
                    if let Some(lhs) = expr.child(0) {
                        let lhs_text = node_text(&lhs, source);
                        if lhs_text.starts_with("self.") {
                            let field_name = lhs_text.strip_prefix("self.").unwrap().to_string();
                            // Don't duplicate fields already declared as class vars
                            if !fields.iter().any(|f| f.name == field_name) {
                                let rhs = expr.child(2).map(|n| node_text(&n, source));
                                fields.push(FieldDef {
                                    name: field_name,
                                    field_type: infer_type_from_value(rhs.as_deref()),
                                    default: rhs,
                                    ctx: None,
                                });
                            }
                        }
                    }
                }
            }
        }
        // Recurse into if/else/try blocks
        if child.kind() == "block" || child.kind() == "if_statement"
            || child.kind() == "try_statement" || child.kind() == "else_clause"
        {
            walk_for_self_assignments_inner(&child, source, fields, depth + 1);
        }
    }
}

// ── Functions ──────────────────────────────────────────────────────
fn extract_function_or_decorated(node: &Node, source: &str) -> FuncDescriptor {
    if node.kind() == "decorated_definition" {
        let decorators = extract_decorators(node, source);
        if let Some(func_node) = find_child_by_kind(node, "function_definition") {
            let mut fd = extract_function_def(&func_node, source);
            fd.decorators = decorators;
            return fd;
        }
        if let Some(class_node) = find_child_by_kind(node, "class_definition") {
            // Decorated class at module level — shouldn't reach here, but handle gracefully
            let name = find_child_by_kind(&class_node, "identifier")
                .map(|n| node_text(&n, source))
                .unwrap_or_default();
            return FuncDescriptor {
                name,
                sig: String::new(),
                is_async: false,
                vis: Visibility::Pub,
                decorators,
                lines: Some((
                    node.start_position().row + 1,
                    node.end_position().row + 1,
                )),
                detail: None,
            };
        }
    }
    extract_function_def(node, source)
}

fn extract_function_def(node: &Node, source: &str) -> FuncDescriptor {
    let name = find_child_by_kind(node, "identifier")
        .map(|n| node_text(&n, source))
        .unwrap_or_else(|| "unknown".to_string());

    let is_async = node.kind() == "function_definition"
        && node.parent().map_or(false, |p| {
            node_text(&p, source).starts_with("async ")
        })
        || source[node.start_byte()..node.start_byte().saturating_add(10)].starts_with("async ");

    let params = find_child_by_kind(node, "parameters")
        .map(|n| node_text(&n, source))
        .unwrap_or_else(|| "()".to_string());

    let return_type = find_child_by_kind(node, "type")
        .map(|n| node_text(&n, source))
        .unwrap_or_default();

    let sig = if return_type.is_empty() {
        format!("{}{}", name, params)
    } else {
        format!("{}{} -> {}", name, params, return_type)
    };

    let vis = name_visibility(&name);

    // Extract function body details (Depth 2+)
    let detail = extract_func_detail(node, source);

    FuncDescriptor {
        name,
        sig,
        is_async,
        vis,
        decorators: Vec::new(),
        lines: Some((
            node.start_position().row + 1,
            node.end_position().row + 1,
        )),
        detail: Some(detail),
    }
}

fn extract_func_detail(node: &Node, source: &str) -> FuncDetail {
    let body = match find_child_by_kind(node, "block") {
        Some(b) => b,
        None => {
            return FuncDetail {
                locals: Vec::new(),
                calls: Vec::new(),
                body: None,
            }
        }
    };

    let mut calls = Vec::new();

    // Use iterative call extraction to avoid stack overflow on large files
    collect_calls_only(&body, source, &mut calls);
    calls.sort();
    calls.dedup();

    FuncDetail {
        locals: Vec::new(),
        calls,
        body: None,  // Opcodes generated in a separate pass (--depth 3)
    }
}

const MAX_DEPTH: usize = 4;

/// Lightweight call extraction without opcodes — iterative to avoid stack overflow
fn collect_calls_only(node: &Node, source: &str, calls: &mut Vec<String>) {
    let mut stack = vec![*node];
    while let Some(current) = stack.pop() {
        let mut cursor = current.walk();
        for child in current.children(&mut cursor) {
            if child.kind() == "call" {
                if let Some(func_node) = child.child(0) {
                    calls.push(node_text(&func_node, source));
                }
            }
            if child.child_count() > 0
                && child.kind() != "function_definition"
                && child.kind() != "class_definition"
            {
                stack.push(child);
            }
        }
    }
}

fn collect_calls_and_locals(
    node: &Node,
    source: &str,
    calls: &mut Vec<String>,
    locals: &mut Vec<LocalVar>,
    opcodes: &mut Vec<Opcode>,
    depth: usize,
) {
    if depth > MAX_DEPTH {
        return;
    }
    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        match child.kind() {
            "call" => {
                let func_name = child.child(0).map(|n| node_text(&n, source)).unwrap_or_default();
                calls.push(func_name.clone());

                let args: Vec<String> = find_child_by_kind(&child, "argument_list")
                    .map(|al| {
                        let mut ac = al.walk();
                        al.children(&mut ac)
                            .filter(|c| c.kind() != "(" && c.kind() != ")" && c.kind() != ",")
                            .map(|c| node_text(&c, source))
                            .take(5)  // Limit args for brevity
                            .collect()
                    })
                    .unwrap_or_default();

                opcodes.push(Opcode::Call {
                    func: func_name,
                    args,
                    out: None,
                });
            }
            "return_statement" => {
                let val = child.child(1).map(|n| node_text(&n, source)).unwrap_or_else(|| "None".to_string());
                opcodes.push(Opcode::Ret { val });
            }
            "raise_statement" => {
                let exc = child.child(1).map(|n| node_text(&n, source)).unwrap_or_else(|| "Exception".to_string());
                opcodes.push(Opcode::Raise { exc });
            }
            "if_statement" => {
                let cond = child.child(1).map(|n| node_text(&n, source)).unwrap_or_default();
                let mut if_body = Vec::new();
                let mut else_body = Vec::new();

                if let Some(block) = find_child_by_kind(&child, "block") {
                    collect_calls_and_locals(&block, source, calls, locals, &mut if_body, depth + 1);
                }
                if let Some(else_clause) = find_child_by_kind(&child, "else_clause") {
                    collect_calls_and_locals(&else_clause, source, calls, locals, &mut else_body, depth + 1);
                }

                opcodes.push(Opcode::BrTrue {
                    cond,
                    body: if_body,
                    else_body,
                });
            }
            "for_statement" => {
                let iter = child.child(3).map(|n| node_text(&n, source)).unwrap_or_default();
                let var = child.child(1).map(|n| node_text(&n, source)).unwrap_or_default();
                let mut loop_body = Vec::new();

                if let Some(block) = find_child_by_kind(&child, "block") {
                    collect_calls_and_locals(&block, source, calls, locals, &mut loop_body, depth + 1);
                }

                opcodes.push(Opcode::Loop {
                    iter,
                    var,
                    body: loop_body,
                });
            }
            "while_statement" => {
                let cond = child.child(1).map(|n| node_text(&n, source)).unwrap_or_default();
                let mut loop_body = Vec::new();

                if let Some(block) = find_child_by_kind(&child, "block") {
                    collect_calls_and_locals(&block, source, calls, locals, &mut loop_body, depth + 1);
                }

                opcodes.push(Opcode::Loop {
                    iter: cond,
                    var: String::new(),
                    body: loop_body,
                });
            }
            "try_statement" => {
                let mut try_body = Vec::new();
                let mut handlers = Vec::new();
                let mut finalize = Vec::new();

                let mut tc = child.walk();
                for try_child in child.children(&mut tc) {
                    match try_child.kind() {
                        "block" if try_body.is_empty() => {
                            collect_calls_and_locals(&try_child, source, calls, locals, &mut try_body, depth + 1);
                        }
                        "except_clause" => {
                            let exc_type = try_child.child(1).map(|n| node_text(&n, source));
                            let exc_name = find_child_by_kind(&try_child, "as_pattern")
                                .and_then(|n| n.child(2))
                                .map(|n| node_text(&n, source));
                            let mut handler_body = Vec::new();
                            if let Some(block) = find_child_by_kind(&try_child, "block") {
                                collect_calls_and_locals(&block, source, calls, locals, &mut handler_body, depth + 1);
                            }
                            handlers.push(ExceptHandler {
                                exc_type,
                                name: exc_name,
                                body: handler_body,
                            });
                        }
                        "finally_clause" => {
                            if let Some(block) = find_child_by_kind(&try_child, "block") {
                                collect_calls_and_locals(&block, source, calls, locals, &mut finalize, depth + 1);
                            }
                        }
                        _ => {}
                    }
                }

                opcodes.push(Opcode::Try {
                    body: try_body,
                    handlers,
                    finalize,
                });
            }
            "with_statement" => {
                let ctx_expr = child.child(1).map(|n| node_text(&n, source)).unwrap_or_default();
                let as_var = find_child_by_kind(&child, "as_pattern")
                    .and_then(|n| n.child(2))
                    .map(|n| node_text(&n, source));
                let mut with_body = Vec::new();

                if let Some(block) = find_child_by_kind(&child, "block") {
                    collect_calls_and_locals(&block, source, calls, locals, &mut with_body, depth + 1);
                }

                opcodes.push(Opcode::With {
                    ctx: ctx_expr,
                    var: as_var,
                    body: with_body,
                });
            }
            "expression_statement" => {
                if let Some(expr) = child.child(0) {
                    match expr.kind() {
                        "assignment" => {
                            let target = expr.child(0).map(|n| node_text(&n, source)).unwrap_or_default();
                            let val = expr.child(2).map(|n| node_text(&n, source)).unwrap_or_default();

                            // Track locals (non self.x assignments)
                            if !target.starts_with("self.") && !target.contains(".") {
                                locals.push(LocalVar {
                                    name: target.clone(),
                                    var_type: infer_type_from_value(Some(&val)),
                                });
                            }

                            opcodes.push(Opcode::Store { val, target });

                            // Recurse into RHS for calls
                            collect_calls_and_locals(&expr, source, calls, locals, &mut Vec::new(), depth + 1);
                        }
                        "call" => {
                            let func_name = expr.child(0).map(|n| node_text(&n, source)).unwrap_or_default();
                            calls.push(func_name.clone());
                            opcodes.push(Opcode::Call {
                                func: func_name,
                                args: Vec::new(),
                                out: None,
                            });
                        }
                        "await" => {
                            let val = expr.child(1).map(|n| node_text(&n, source)).unwrap_or_default();
                            opcodes.push(Opcode::Await { val: val.clone() });
                            collect_calls_and_locals(&expr, source, calls, locals, &mut Vec::new(), depth + 1);
                        }
                        "yield" => {
                            let val = expr.child(1).map(|n| node_text(&n, source)).unwrap_or_default();
                            opcodes.push(Opcode::Yield { val });
                        }
                        _ => {
                            collect_calls_and_locals(&expr, source, calls, locals, &mut Vec::new(), depth + 1);
                        }
                    }
                }
            }
            "assert_statement" => {
                let test = child.child(1).map(|n| node_text(&n, source)).unwrap_or_default();
                opcodes.push(Opcode::Assert { test });
            }
            _ => {
                // Recurse into other statement types for nested calls
                collect_calls_and_locals(&child, source, calls, locals, opcodes, depth + 1);
            }
        }
    }
}

// ── Assignments (module level) ─────────────────────────────────────
fn extract_assignment(node: &Node, source: &str) -> Option<DataEntry> {
    let lhs = node.child(0)?;
    let name = node_text(&lhs, source);

    // Skip if it's a complex expression
    if name.contains('.') || name.contains('[') {
        return None;
    }

    let rhs = node.child(2).map(|n| node_text(&n, source));
    let data_type = if lhs.kind() == "type" {
        lhs.child_by_field_name("type")
            .map(|n| node_text(&n, source))
            .unwrap_or_else(|| infer_type_from_value(rhs.as_deref()))
    } else {
        infer_type_from_value(rhs.as_deref())
    };

    let actual_name = if lhs.kind() == "type" {
        lhs.child(0).map(|n| node_text(&n, source)).unwrap_or(name)
    } else {
        name
    };

    Some(DataEntry {
        name: actual_name,
        data_type,
        val: rhs.map(|v| truncate(&v, 120)),
        ctx: None,
    })
}

// ── Exports ────────────────────────────────────────────────────────
fn extract_exports(root: &Node, source: &str, file: &mut FileDescriptor) {
    // Look for __all__ = [...]
    let mut cursor = root.walk();
    for child in root.children(&mut cursor) {
        if child.kind() == "expression_statement" {
            if let Some(assign) = child.child(0) {
                if assign.kind() == "assignment" {
                    if let Some(lhs) = assign.child(0) {
                        if node_text(&lhs, source) == "__all__" {
                            if let Some(rhs) = assign.child(2) {
                                extract_all_list(&rhs, source, &mut file.exports);
                                return;
                            }
                        }
                    }
                }
            }
        }
    }

    // No __all__, infer from public top-level names
    for t in &file.types {
        if t.vis == Visibility::Pub {
            file.exports.push(ExportEntry {
                name: t.name.clone(),
                kind: ExportKind::Type,
            });
        }
    }
    for f in &file.functions {
        if f.vis == Visibility::Pub {
            file.exports.push(ExportEntry {
                name: f.name.clone(),
                kind: ExportKind::Func,
            });
        }
    }
    for d in &file.data {
        if !d.name.starts_with('_') {
            file.exports.push(ExportEntry {
                name: d.name.clone(),
                kind: ExportKind::Data,
            });
        }
    }
}

fn extract_all_list(node: &Node, source: &str, exports: &mut Vec<ExportEntry>) {
    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        if child.kind() == "string" {
            let name = node_text(&child, source)
                .trim_matches('"')
                .trim_matches('\'')
                .to_string();
            exports.push(ExportEntry {
                name,
                kind: ExportKind::Type, // Will be refined later
            });
        }
    }
}

// ── Helpers ────────────────────────────────────────────────────────
fn node_text(node: &Node, source: &str) -> String {
    source[node.start_byte()..node.end_byte()].to_string()
}

fn find_child_by_kind<'a>(node: &'a Node<'a>, kind: &str) -> Option<Node<'a>> {
    let mut cursor = node.walk();
    let result = node.children(&mut cursor).find(|c| c.kind() == kind);
    result
}

fn name_visibility(name: &str) -> Visibility {
    if name.starts_with("__") && !name.ends_with("__") {
        Visibility::Private
    } else if name.starts_with('_') && !name.starts_with("__") {
        Visibility::Protected
    } else {
        Visibility::Pub
    }
}

fn clean_docstring(s: &str) -> String {
    let s = s.trim();
    let s = s.trim_start_matches("\"\"\"").trim_end_matches("\"\"\"");
    let s = s.trim_start_matches("'''").trim_end_matches("'''");
    let s = s.trim_start_matches('"').trim_end_matches('"');
    s.lines()
        .map(|l| l.trim())
        .filter(|l| !l.is_empty())
        .collect::<Vec<_>>()
        .join(" ")
}

fn truncate(s: &str, max: usize) -> String {
    if s.len() <= max {
        s.to_string()
    } else {
        let mut end = max;
        while end > 0 && !s.is_char_boundary(end) {
            end -= 1;
        }
        format!("{}...", &s[..end])
    }
}

fn infer_type_from_value(val: Option<&str>) -> String {
    match val {
        None => "Any".to_string(),
        Some(v) => {
            let v = v.trim();
            if v == "True" || v == "False" {
                "bool".to_string()
            } else if v == "None" {
                "None".to_string()
            } else if v.starts_with('"') || v.starts_with('\'') || v.starts_with("f\"") || v.starts_with("f'") {
                "str".to_string()
            } else if v.starts_with('[') {
                "list".to_string()
            } else if v.starts_with('{') {
                "dict".to_string()
            } else if v.starts_with('(') {
                "tuple".to_string()
            } else if v.parse::<i64>().is_ok() {
                "int".to_string()
            } else if v.parse::<f64>().is_ok() {
                "float".to_string()
            } else {
                "Any".to_string()
            }
        }
    }
}
