//! Tree-sitter based TypeScript/TSX parser.
//! Extracts classes, interfaces, functions, imports, enums, type aliases,
//! call graph, and opcodes from TypeScript source files.

use crate::model::*;
use tree_sitter::{Node, Parser};

pub fn create_parser() -> Parser {
    let mut parser = Parser::new();
    let language = tree_sitter_typescript::LANGUAGE_TYPESCRIPT;
    parser
        .set_language(&language.into())
        .expect("Failed to set TypeScript language");
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

    // Extract leading comment as purpose
    if let Some(first) = root.child(0) {
        if first.kind() == "comment" {
            let text = node_text(&first, source);
            file.purpose = Some(clean_comment(&text));
        }
    }

    // Walk top-level nodes
    let mut cursor = root.walk();
    for child in root.children(&mut cursor) {
        match child.kind() {
            "import_statement" => {
                extract_import(&child, source, &mut file.imports);
            }
            "export_statement" => {
                extract_export_statement(&child, source, &mut file);
            }
            "class_declaration" => {
                file.types.push(extract_class(&child, source, false));
            }
            "abstract_class_declaration" => {
                file.types.push(extract_class(&child, source, true));
            }
            "interface_declaration" => {
                file.types.push(extract_interface(&child, source));
            }
            "function_declaration" => {
                file.functions.push(extract_function(&child, source));
            }
            "lexical_declaration" | "variable_declaration" => {
                extract_variable_decl(&child, source, &mut file);
            }
            "enum_declaration" => {
                file.types.push(extract_enum(&child, source));
            }
            "type_alias_declaration" => {
                file.types.push(extract_type_alias(&child, source));
            }
            "expression_statement" => {
                // Module-level expressions (rare in TS)
            }
            _ => {}
        }
    }

    // Build exports list from what was marked export
    build_exports(&mut file);

    file
}

// ── Imports ────────────────────────────────────────────────────────

fn extract_import(node: &Node, source: &str, imports: &mut Vec<ImportEntry>) {
    let is_type_import = has_child_kind(node, "type");

    // Get the source module
    let module_str = find_child_by_kind(node, "string")
        .map(|n| {
            let t = node_text(&n, source);
            t.trim_matches('"').trim_matches('\'').to_string()
        })
        .unwrap_or_default();

    // Get import clause
    if let Some(clause) = find_child_by_kind(node, "import_clause") {
        // Named imports: import { A, B } from "mod"
        if let Some(named) = find_child_by_kind(&clause, "named_imports") {
            let mut c = named.walk();
            for child in named.children(&mut c) {
                if child.kind() == "import_specifier" {
                    let name = node_text(&child, source);
                    let kind = if is_type_import {
                        ImportKind::Typing
                    } else {
                        ImportKind::Use
                    };
                    imports.push(ImportEntry {
                        sym: format!("{}.{}", module_str, name),
                        kind,
                        ctx: None,
                    });
                }
            }
        }
        // Default import: import Foo from "mod"
        else if let Some(ident) = find_child_by_kind(&clause, "identifier") {
            let name = node_text(&ident, source);
            imports.push(ImportEntry {
                sym: format!("{}.{}", module_str, name),
                kind: if is_type_import { ImportKind::Typing } else { ImportKind::Use },
                ctx: None,
            });
        }
        // Namespace import: import * as foo from "mod"
        else if let Some(ns) = find_child_by_kind(&clause, "namespace_import") {
            let alias = find_child_by_kind(&ns, "identifier")
                .map(|n| node_text(&n, source))
                .unwrap_or_else(|| "*".to_string());
            imports.push(ImportEntry {
                sym: format!("{}.{}", module_str, alias),
                kind: ImportKind::Use,
                ctx: None,
            });
        }
    }
}

// ── Export statements ──────────────────────────────────────────────

fn extract_export_statement(node: &Node, source: &str, file: &mut FileDescriptor) {
    let mut c = node.walk();
    for child in node.children(&mut c) {
        match child.kind() {
            "class_declaration" => {
                let mut td = extract_class(&child, source, false);
                td.vis = Visibility::Pub;
                file.types.push(td);
            }
            "abstract_class_declaration" => {
                let mut td = extract_class(&child, source, true);
                td.vis = Visibility::Pub;
                file.types.push(td);
            }
            "interface_declaration" => {
                let mut td = extract_interface(&child, source);
                td.vis = Visibility::Pub;
                file.types.push(td);
            }
            "function_declaration" => {
                let mut fd = extract_function(&child, source);
                fd.vis = Visibility::Pub;
                file.functions.push(fd);
            }
            "lexical_declaration" | "variable_declaration" => {
                extract_variable_decl(&child, source, file);
            }
            "enum_declaration" => {
                let mut td = extract_enum(&child, source);
                td.vis = Visibility::Pub;
                file.types.push(td);
            }
            "type_alias_declaration" => {
                let mut td = extract_type_alias(&child, source);
                td.vis = Visibility::Pub;
                file.types.push(td);
            }
            _ => {}
        }
    }
}

// ── Classes ────────────────────────────────────────────────────────

fn extract_class(node: &Node, source: &str, is_abstract: bool) -> TypeDescriptor {
    let name = find_child_by_kind(node, "type_identifier")
        .map(|n| node_text(&n, source))
        .unwrap_or_else(|| "Unknown".to_string());

    let mut bases = Vec::new();
    let mut decorators = Vec::new();

    if is_abstract {
        decorators.push("abstract".to_string());
    }

    // class_heritage → extends_clause, implements_clause
    if let Some(heritage) = find_child_by_kind(node, "class_heritage") {
        let mut hc = heritage.walk();
        for child in heritage.children(&mut hc) {
            match child.kind() {
                "extends_clause" => {
                    let mut ec = child.walk();
                    for ext in child.children(&mut ec) {
                        if ext.kind() == "identifier" || ext.kind() == "type_identifier"
                            || ext.kind() == "member_expression"
                        {
                            bases.push(node_text(&ext, source));
                        }
                    }
                }
                "implements_clause" => {
                    let mut ic = child.walk();
                    for imp in child.children(&mut ic) {
                        if imp.kind() == "type_identifier" || imp.kind() == "generic_type" {
                            bases.push(node_text(&imp, source));
                        }
                    }
                }
                _ => {}
            }
        }
    }

    let vis = ts_visibility(&name, node, source);

    let mut fields = Vec::new();
    let mut methods = Vec::new();
    let mut class_doc = None;

    if let Some(body) = find_child_by_kind(node, "class_body") {
        let mut bc = body.walk();
        for child in body.children(&mut bc) {
            match child.kind() {
                "method_definition" => {
                    let fd = extract_method(&child, source);
                    methods.push(fd);
                }
                "public_field_definition" => {
                    if let Some(f) = extract_field(&child, source) {
                        fields.push(f);
                    }
                }
                "comment" if class_doc.is_none() => {
                    class_doc = Some(clean_comment(&node_text(&child, source)));
                }
                _ => {}
            }
        }
    }

    // Determine kind
    let kind = if is_abstract {
        TypeKind::Trait
    } else if bases.iter().any(|b| b.contains("BaseModel") || b.contains("Model")) {
        TypeKind::Model
    } else {
        TypeKind::Struct
    };

    TypeDescriptor {
        name,
        kind,
        vis,
        ctx: class_doc,
        bases,
        decorators,
        fields,
        variants: Vec::new(),
        methods,
        lines: Some((
            node.start_position().row + 1,
            node.end_position().row + 1,
        )),
    }
}

fn extract_method(node: &Node, source: &str) -> FuncDescriptor {
    let name = find_child_by_kind(node, "property_identifier")
        .map(|n| node_text(&n, source))
        .unwrap_or_else(|| "unknown".to_string());

    // Check for constructor
    let is_constructor = name == "constructor" || has_child_kind(node, "constructor");

    let actual_name = if is_constructor { "constructor".to_string() } else { name };

    let is_async = has_child_kind(node, "async");

    let params = find_child_by_kind(node, "formal_parameters")
        .map(|n| node_text(&n, source))
        .unwrap_or_else(|| "()".to_string());

    let return_type = find_child_by_kind(node, "type_annotation")
        .map(|n| {
            let t = node_text(&n, source);
            t.trim_start_matches(':').trim().to_string()
        })
        .unwrap_or_default();

    let sig = if return_type.is_empty() {
        format!("{}{}", actual_name, params)
    } else {
        format!("{}{}: {}", actual_name, params, return_type)
    };

    let vis = ts_member_visibility(node, source);

    let mut decorators = Vec::new();
    // Check for accessibility modifiers
    {
        let mut c = node.walk();
        for child in node.children(&mut c) {
            if child.kind() == "accessibility_modifier" {
                // Already handled in vis
            } else if child.kind() == "decorator" {
                decorators.push(node_text(&child, source).trim_start_matches('@').to_string());
            } else if child.kind() == "static" {
                decorators.push("static".to_string());
            } else if child.kind() == "override" {
                decorators.push("override".to_string());
            }
        }
    }

    // Extract calls from body
    let detail = extract_func_detail(node, source);

    FuncDescriptor {
        name: actual_name,
        sig,
        is_async,
        vis,
        decorators,
        lines: Some((
            node.start_position().row + 1,
            node.end_position().row + 1,
        )),
        detail: Some(detail),
    }
}

fn extract_field(node: &Node, source: &str) -> Option<FieldDef> {
    let name = find_child_by_kind(node, "property_identifier")
        .map(|n| node_text(&n, source))?;

    let field_type = find_child_by_kind(node, "type_annotation")
        .map(|n| {
            let t = node_text(&n, source);
            t.trim_start_matches(':').trim().to_string()
        })
        .unwrap_or_else(|| "any".to_string());

    // Check for default value
    let default = {
        let mut c = node.walk();
        let mut found_eq = false;
        let mut val = None;
        for child in node.children(&mut c) {
            if child.kind() == "=" {
                found_eq = true;
            } else if found_eq && child.kind() != "type_annotation" {
                val = Some(truncate(&node_text(&child, source), 80));
                break;
            }
        }
        val
    };

    Some(FieldDef {
        name,
        field_type,
        default,
        ctx: None,
    })
}

// ── Interfaces ─────────────────────────────────────────────────────

fn extract_interface(node: &Node, source: &str) -> TypeDescriptor {
    let name = find_child_by_kind(node, "type_identifier")
        .map(|n| node_text(&n, source))
        .unwrap_or_else(|| "Unknown".to_string());

    let mut bases = Vec::new();
    // extends_type_clause
    if let Some(ext) = find_child_by_kind(node, "extends_type_clause") {
        let mut ec = ext.walk();
        for child in ext.children(&mut ec) {
            if child.kind() == "type_identifier" || child.kind() == "generic_type" {
                bases.push(node_text(&child, source));
            }
        }
    }

    let mut fields = Vec::new();
    if let Some(body) = find_child_by_kind(node, "interface_body")
        .or_else(|| find_child_by_kind(node, "object_type"))
    {
        let mut bc = body.walk();
        for child in body.children(&mut bc) {
            match child.kind() {
                "property_signature" => {
                    let fname = child.child(0).map(|n| node_text(&n, source)).unwrap_or_default();
                    if fname == "}" || fname == "{" { continue; }
                    let ftype = find_child_by_kind(&child, "type_annotation")
                        .map(|n| {
                            let t = node_text(&n, source);
                            t.trim_start_matches(':').trim().to_string()
                        })
                        .unwrap_or_else(|| "any".to_string());
                    fields.push(FieldDef {
                        name: fname,
                        field_type: ftype,
                        default: None,
                        ctx: None,
                    });
                }
                "method_signature" => {
                    let fname = child.child(0).map(|n| node_text(&n, source)).unwrap_or_default();
                    let sig_text = node_text(&child, source);
                    fields.push(FieldDef {
                        name: fname,
                        field_type: format!("method: {}", sig_text),
                        default: None,
                        ctx: None,
                    });
                }
                _ => {}
            }
        }
    }

    // Get JSDoc comment above
    let doc = get_preceding_comment(node, source);

    TypeDescriptor {
        name,
        kind: TypeKind::Trait,
        vis: Visibility::Pub,
        ctx: doc,
        bases,
        decorators: vec!["interface".to_string()],
        fields,
        variants: Vec::new(),
        methods: Vec::new(),
        lines: Some((
            node.start_position().row + 1,
            node.end_position().row + 1,
        )),
    }
}

// ── Functions ──────────────────────────────────────────────────────

fn extract_function(node: &Node, source: &str) -> FuncDescriptor {
    let name = find_child_by_kind(node, "identifier")
        .map(|n| node_text(&n, source))
        .unwrap_or_else(|| "unknown".to_string());

    let is_async = has_child_kind(node, "async");

    let params = find_child_by_kind(node, "formal_parameters")
        .map(|n| node_text(&n, source))
        .unwrap_or_else(|| "()".to_string());

    let return_type = find_child_by_kind(node, "type_annotation")
        .map(|n| {
            let t = node_text(&n, source);
            t.trim_start_matches(':').trim().to_string()
        })
        .unwrap_or_default();

    let sig = if return_type.is_empty() {
        format!("{}{}", name, params)
    } else {
        format!("{}{}: {}", name, params, return_type)
    };

    let vis = ts_visibility(&name, node, source);

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

// ── Variable declarations ──────────────────────────────────────────

fn extract_variable_decl(node: &Node, source: &str, file: &mut FileDescriptor) {
    let mut c = node.walk();
    for child in node.children(&mut c) {
        if child.kind() == "variable_declarator" {
            let name = child.child(0)
                .map(|n| node_text(&n, source))
                .unwrap_or_default();

            if name.is_empty() { continue; }

            let type_ann = find_child_by_kind(&child, "type_annotation")
                .map(|n| {
                    let t = node_text(&n, source);
                    t.trim_start_matches(':').trim().to_string()
                });

            // Check if it's an arrow function or function expression
            let value_node = find_child_by_kind_2(&child, "arrow_function")
                .or_else(|| find_child_by_kind_2(&child, "function"));

            if let Some(func_node) = value_node {
                // It's a function assigned to a const
                let is_async = has_child_kind(&func_node, "async");

                let params = find_child_by_kind(&func_node, "formal_parameters")
                    .map(|n| node_text(&n, source))
                    .unwrap_or_else(|| "()".to_string());

                let ret = find_child_by_kind(&func_node, "type_annotation")
                    .or(type_ann.as_deref().map(|_| func_node)) // use type_ann if available
                    .map(|n| {
                        if n == func_node {
                            type_ann.clone().unwrap_or_default()
                        } else {
                            let t = node_text(&n, source);
                            t.trim_start_matches(':').trim().to_string()
                        }
                    })
                    .unwrap_or_default();

                let sig = if ret.is_empty() {
                    format!("{}{}", name, params)
                } else {
                    format!("{}{}: {}", name, params, ret)
                };

                let detail = extract_func_detail(&func_node, source);

                file.functions.push(FuncDescriptor {
                    name: name.clone(),
                    sig,
                    is_async,
                    vis: Visibility::Pub, // exported consts are public
                    decorators: Vec::new(),
                    lines: Some((
                        child.start_position().row + 1,
                        child.end_position().row + 1,
                    )),
                    detail: Some(detail),
                });
            } else {
                // It's a data constant
                let val = {
                    let mut vc = child.walk();
                    let mut found_eq = false;
                    let mut val = None;
                    for vchild in child.children(&mut vc) {
                        if vchild.kind() == "=" {
                            found_eq = true;
                        } else if found_eq && vchild.kind() != "type_annotation" {
                            val = Some(truncate(&node_text(&vchild, source), 120));
                            break;
                        }
                    }
                    val
                };

                let data_type = type_ann.unwrap_or_else(|| {
                    val.as_deref().map(infer_ts_type).unwrap_or_else(|| "any".to_string())
                });

                file.data.push(DataEntry {
                    name,
                    data_type,
                    val,
                    ctx: None,
                });
            }
        }
    }
}

// ── Enums ──────────────────────────────────────────────────────────

fn extract_enum(node: &Node, source: &str) -> TypeDescriptor {
    let name = find_child_by_kind(node, "identifier")
        .map(|n| node_text(&n, source))
        .unwrap_or_else(|| "Unknown".to_string());

    let mut variants = Vec::new();
    if let Some(body) = find_child_by_kind(node, "enum_body") {
        let mut bc = body.walk();
        for child in body.children(&mut bc) {
            if child.kind() == "enum_assignment" {
                let vname = child.child(0).map(|n| node_text(&n, source)).unwrap_or_default();
                let vval = child.child(2).map(|n| node_text(&n, source));
                variants.push(VariantDef {
                    name: vname,
                    val: vval,
                    ctx: None,
                });
            } else if child.kind() == "property_identifier" || child.kind() == "identifier" {
                variants.push(VariantDef {
                    name: node_text(&child, source),
                    val: None,
                    ctx: None,
                });
            }
        }
    }

    TypeDescriptor {
        name,
        kind: TypeKind::Enum,
        vis: Visibility::Pub,
        ctx: None,
        bases: Vec::new(),
        decorators: Vec::new(),
        fields: Vec::new(),
        variants,
        methods: Vec::new(),
        lines: Some((
            node.start_position().row + 1,
            node.end_position().row + 1,
        )),
    }
}

// ── Type aliases ───────────────────────────────────────────────────

fn extract_type_alias(node: &Node, source: &str) -> TypeDescriptor {
    let name = find_child_by_kind(node, "type_identifier")
        .map(|n| node_text(&n, source))
        .unwrap_or_else(|| "Unknown".to_string());

    // Extract fields if it's an object type
    let mut fields = Vec::new();
    if let Some(obj) = find_child_by_kind(node, "object_type") {
        let mut oc = obj.walk();
        for child in obj.children(&mut oc) {
            if child.kind() == "property_signature" {
                let fname = child.child(0).map(|n| node_text(&n, source)).unwrap_or_default();
                if fname == "{" || fname == "}" { continue; }
                let ftype = find_child_by_kind(&child, "type_annotation")
                    .map(|n| {
                        let t = node_text(&n, source);
                        t.trim_start_matches(':').trim().to_string()
                    })
                    .unwrap_or_else(|| "any".to_string());
                fields.push(FieldDef {
                    name: fname,
                    field_type: ftype,
                    default: None,
                    ctx: None,
                });
            }
        }
    }

    // Check for union types (like discriminated unions)
    let mut variants = Vec::new();
    if let Some(union) = find_child_by_kind(node, "union_type") {
        let mut uc = union.walk();
        for child in union.children(&mut uc) {
            if child.kind() == "type_identifier" || child.kind() == "literal_type"
                || child.kind() == "generic_type"
            {
                variants.push(VariantDef {
                    name: node_text(&child, source),
                    val: None,
                    ctx: None,
                });
            }
        }
    }

    let kind = if !variants.is_empty() {
        TypeKind::Enum // Union type → treat as enum-like
    } else {
        TypeKind::TypeAlias
    };

    TypeDescriptor {
        name,
        kind,
        vis: Visibility::Pub,
        ctx: None,
        bases: Vec::new(),
        decorators: vec!["type".to_string()],
        fields,
        variants,
        methods: Vec::new(),
        lines: Some((
            node.start_position().row + 1,
            node.end_position().row + 1,
        )),
    }
}

// ── Function detail (calls extraction) ─────────────────────────────

fn extract_func_detail(node: &Node, source: &str) -> FuncDetail {
    let body = find_child_by_kind(node, "statement_block")
        .or_else(|| find_child_by_kind(node, "expression_statement"))
        .or_else(|| find_child_by_kind(node, "call_expression"))
        .or_else(|| find_child_by_kind(node, "await_expression"))
        .or_else(|| find_child_by_kind(node, "parenthesized_expression"));

    let body = match body {
        Some(b) => b,
        None => return FuncDetail { locals: Vec::new(), calls: Vec::new(), body: None },
    };

    let mut calls = Vec::new();
    collect_calls_iterative(&body, source, &mut calls);
    calls.sort();
    calls.dedup();

    FuncDetail {
        locals: Vec::new(),
        calls,
        body: None, // Opcodes filled separately if --opcodes
    }
}

fn collect_calls_iterative(node: &Node, source: &str, calls: &mut Vec<String>) {
    let mut stack = vec![*node];
    while let Some(current) = stack.pop() {
        let mut cursor = current.walk();
        for child in current.children(&mut cursor) {
            if child.kind() == "call_expression" {
                if let Some(func_node) = child.child(0) {
                    let call_text = node_text(&func_node, source);
                    // Truncate very long call chains
                    calls.push(truncate(&call_text, 100));
                }
            } else if child.kind() == "new_expression" {
                if let Some(type_node) = child.child(1) {
                    calls.push(format!("new {}", node_text(&type_node, source)));
                }
            }
            if child.child_count() > 0
                && child.kind() != "function_declaration"
                && child.kind() != "class_declaration"
                && child.kind() != "arrow_function"
                && child.kind() != "function"
            {
                stack.push(child);
            }
        }
    }
}

// ── Exports builder ────────────────────────────────────────────────

fn build_exports(file: &mut FileDescriptor) {
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
        file.exports.push(ExportEntry {
            name: d.name.clone(),
            kind: ExportKind::Data,
        });
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

/// Version for non-lifetime-constrained searches — iterates children by index
fn find_child_by_kind_2<'a>(node: &'a Node<'a>, kind: &str) -> Option<Node<'a>> {
    for i in 0..node.child_count() {
        if let Some(child) = node.child(i) {
            if child.kind() == kind {
                return Some(child);
            }
        }
    }
    None
}

fn has_child_kind(node: &Node, kind: &str) -> bool {
    for i in 0..node.child_count() {
        if let Some(child) = node.child(i) {
            if child.kind() == kind {
                return true;
            }
        }
    }
    false
}

fn ts_visibility(name: &str, _node: &Node, _source: &str) -> Visibility {
    if name.starts_with('_') {
        Visibility::Private
    } else {
        Visibility::Pub
    }
}

fn ts_member_visibility(node: &Node, source: &str) -> Visibility {
    let mut c = node.walk();
    for child in node.children(&mut c) {
        if child.kind() == "accessibility_modifier" {
            let text = node_text(&child, source);
            return match text.as_str() {
                "private" => Visibility::Private,
                "protected" => Visibility::Protected,
                _ => Visibility::Pub,
            };
        }
    }
    Visibility::Pub
}

fn clean_comment(s: &str) -> String {
    let s = s.trim();
    let s = s.trim_start_matches("/**").trim_end_matches("*/");
    let s = s.trim_start_matches("//").trim_start_matches("/*").trim_end_matches("*/");
    s.lines()
        .map(|l| l.trim().trim_start_matches('*').trim())
        .filter(|l| !l.is_empty() && !l.starts_with('@'))
        .collect::<Vec<_>>()
        .join(" ")
}

fn get_preceding_comment(node: &Node, source: &str) -> Option<String> {
    if let Some(prev) = node.prev_sibling() {
        if prev.kind() == "comment" {
            return Some(clean_comment(&node_text(&prev, source)));
        }
    }
    None
}

fn truncate(s: &str, max: usize) -> String {
    if s.len() <= max {
        s.to_string()
    } else {
        format!("{}...", &s[..max])
    }
}

fn infer_ts_type(val: &str) -> String {
    let v = val.trim();
    if v == "true" || v == "false" {
        "boolean".to_string()
    } else if v == "null" || v == "undefined" {
        "null".to_string()
    } else if v.starts_with('"') || v.starts_with('\'') || v.starts_with('`') {
        "string".to_string()
    } else if v.starts_with('[') {
        "array".to_string()
    } else if v.starts_with('{') {
        "object".to_string()
    } else if v.parse::<i64>().is_ok() || v.parse::<f64>().is_ok() {
        "number".to_string()
    } else {
        "any".to_string()
    }
}
