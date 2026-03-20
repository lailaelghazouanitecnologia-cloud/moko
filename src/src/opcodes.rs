//! Iterative opcode generation — stack-safe extraction of control flow
//! from tree-sitter CST into Roska opcodes.
//!
//! This replaces the recursive `collect_calls_and_locals` for Depth 3,
//! using an explicit work stack to handle arbitrarily deep Python files.

use crate::model::*;
use tree_sitter::Node;

/// Maximum opcode nesting depth to prevent runaway expansion
const MAX_NESTING: usize = 8;

/// Extract opcodes from a function body using iterative traversal.
pub fn extract_opcodes(func_node: &Node, source: &str) -> (Vec<Opcode>, Vec<LocalVar>) {
    let body = match find_child_by_kind(func_node, "block") {
        Some(b) => b,
        None => return (Vec::new(), Vec::new()),
    };

    let mut opcodes = Vec::new();
    let mut locals = Vec::new();

    extract_block_opcodes(&body, source, &mut opcodes, &mut locals, 0);

    (opcodes, locals)
}

fn extract_block_opcodes(
    node: &Node,
    source: &str,
    opcodes: &mut Vec<Opcode>,
    locals: &mut Vec<LocalVar>,
    depth: usize,
) {
    if depth > MAX_NESTING {
        return;
    }

    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        match child.kind() {
            "expression_statement" => {
                if let Some(expr) = child.child(0) {
                    extract_expression_opcode(&expr, source, opcodes, locals, depth);
                }
            }
            "return_statement" => {
                let val = child
                    .child(1)
                    .map(|n| node_text(&n, source))
                    .unwrap_or_else(|| "None".to_string());
                opcodes.push(Opcode::Ret { val });
            }
            "raise_statement" => {
                let exc = child
                    .child(1)
                    .map(|n| node_text(&n, source))
                    .unwrap_or_else(|| "Exception".to_string());
                opcodes.push(Opcode::Raise { exc });
            }
            "if_statement" => {
                extract_if_opcode(&child, source, opcodes, locals, depth);
            }
            "for_statement" => {
                let iter_node = child.child(3).map(|n| node_text(&n, source)).unwrap_or_default();
                let var = child.child(1).map(|n| node_text(&n, source)).unwrap_or_default();
                let mut loop_body = Vec::new();

                if let Some(block) = find_child_by_kind(&child, "block") {
                    extract_block_opcodes(&block, source, &mut loop_body, locals, depth + 1);
                }

                opcodes.push(Opcode::Loop {
                    iter: iter_node,
                    var,
                    body: loop_body,
                });
            }
            "while_statement" => {
                let cond = child.child(1).map(|n| node_text(&n, source)).unwrap_or_default();
                let mut loop_body = Vec::new();

                if let Some(block) = find_child_by_kind(&child, "block") {
                    extract_block_opcodes(&block, source, &mut loop_body, locals, depth + 1);
                }

                opcodes.push(Opcode::Loop {
                    iter: cond,
                    var: String::new(),
                    body: loop_body,
                });
            }
            "try_statement" => {
                extract_try_opcode(&child, source, opcodes, locals, depth);
            }
            "with_statement" => {
                extract_with_opcode(&child, source, opcodes, locals, depth);
            }
            "assert_statement" => {
                let test = child
                    .child(1)
                    .map(|n| node_text(&n, source))
                    .unwrap_or_default();
                opcodes.push(Opcode::Assert { test });
            }
            "pass_statement" | "break_statement" | "continue_statement" => {
                // Skip noise ops
            }
            _ => {
                // Recurse into blocks within match/case, etc.
                if child.kind() == "block" {
                    extract_block_opcodes(&child, source, opcodes, locals, depth + 1);
                }
            }
        }
    }
}

fn extract_expression_opcode(
    expr: &Node,
    source: &str,
    opcodes: &mut Vec<Opcode>,
    locals: &mut Vec<LocalVar>,
    depth: usize,
) {
    match expr.kind() {
        "assignment" => {
            let target = expr.child(0).map(|n| node_text(&n, source)).unwrap_or_default();
            let val = expr.child(2).map(|n| node_text(&n, source)).unwrap_or_default();

            // Track locals
            if !target.starts_with("self.") && !target.contains('.') {
                locals.push(LocalVar {
                    name: target.clone(),
                    var_type: infer_type_from_rhs(&val),
                });
            }

            // Check if RHS is a call → emit Call with out instead of Store
            if let Some(rhs_node) = expr.child(2) {
                if rhs_node.kind() == "call" {
                    let func = rhs_node
                        .child(0)
                        .map(|n| node_text(&n, source))
                        .unwrap_or_default();
                    let args = extract_call_args(&rhs_node, source);
                    opcodes.push(Opcode::Call {
                        func,
                        args,
                        out: Some(target),
                    });
                    return;
                }
                // Check for `await call()`
                if rhs_node.kind() == "await" {
                    if let Some(inner) = rhs_node.child(1) {
                        if inner.kind() == "call" {
                            let func = inner
                                .child(0)
                                .map(|n| node_text(&n, source))
                                .unwrap_or_default();
                            let args = extract_call_args(&inner, source);
                            opcodes.push(Opcode::Await {
                                val: format!("{}({})", func, args.join(", ")),
                            });
                            return;
                        }
                    }
                    opcodes.push(Opcode::Await { val });
                    return;
                }
                // Check for `new Type()`
                if rhs_node.kind() == "call" {
                    let func_text = rhs_node.child(0).map(|n| node_text(&n, source)).unwrap_or_default();
                    if func_text.chars().next().map_or(false, |c| c.is_uppercase()) {
                        let args = extract_call_args(&rhs_node, source);
                        opcodes.push(Opcode::New {
                            type_name: func_text,
                            args,
                            out: Some(target),
                        });
                        return;
                    }
                }
            }

            opcodes.push(Opcode::Store { val, target });
        }
        "call" => {
            let func = expr.child(0).map(|n| node_text(&n, source)).unwrap_or_default();
            let args = extract_call_args(expr, source);

            // Detect constructor calls (PascalCase)
            if func.chars().next().map_or(false, |c| c.is_uppercase()) && !func.contains('.') {
                opcodes.push(Opcode::New {
                    type_name: func,
                    args,
                    out: None,
                });
            } else {
                opcodes.push(Opcode::Call {
                    func,
                    args,
                    out: None,
                });
            }
        }
        "await" => {
            let val = expr.child(1).map(|n| node_text(&n, source)).unwrap_or_default();
            opcodes.push(Opcode::Await { val });
        }
        "yield" => {
            let val = expr.child(1).map(|n| node_text(&n, source)).unwrap_or_default();
            opcodes.push(Opcode::Yield { val });
        }
        "augmented_assignment" => {
            let target = expr.child(0).map(|n| node_text(&n, source)).unwrap_or_default();
            let val = node_text(expr, source);
            opcodes.push(Opcode::Store { val, target });
        }
        _ => {
            // Check for nested calls in other expressions
            if depth < MAX_NESTING {
                collect_nested_calls(expr, source, opcodes);
            }
        }
    }
}

fn extract_if_opcode(
    node: &Node,
    source: &str,
    opcodes: &mut Vec<Opcode>,
    locals: &mut Vec<LocalVar>,
    depth: usize,
) {
    let cond = node.child(1).map(|n| node_text(&n, source)).unwrap_or_default();
    let mut if_body = Vec::new();
    let mut else_body = Vec::new();

    // First block is the if-body
    if let Some(block) = find_child_by_kind(node, "block") {
        extract_block_opcodes(&block, source, &mut if_body, locals, depth + 1);
    }

    // Handle elif/else
    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        match child.kind() {
            "elif_clause" => {
                let elif_cond = child.child(1).map(|n| node_text(&n, source)).unwrap_or_default();
                let mut elif_body = Vec::new();
                if let Some(block) = find_child_by_kind(&child, "block") {
                    extract_block_opcodes(&block, source, &mut elif_body, locals, depth + 1);
                }
                else_body.push(Opcode::BrTrue {
                    cond: elif_cond,
                    body: elif_body,
                    else_body: Vec::new(),
                });
            }
            "else_clause" => {
                if let Some(block) = find_child_by_kind(&child, "block") {
                    extract_block_opcodes(&block, source, &mut else_body, locals, depth + 1);
                }
            }
            _ => {}
        }
    }

    opcodes.push(Opcode::BrTrue {
        cond,
        body: if_body,
        else_body,
    });
}

fn extract_try_opcode(
    node: &Node,
    source: &str,
    opcodes: &mut Vec<Opcode>,
    locals: &mut Vec<LocalVar>,
    depth: usize,
) {
    let mut try_body = Vec::new();
    let mut handlers = Vec::new();
    let mut finalize = Vec::new();
    let mut found_try_block = false;

    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        match child.kind() {
            "block" if !found_try_block => {
                found_try_block = true;
                extract_block_opcodes(&child, source, &mut try_body, locals, depth + 1);
            }
            "except_clause" | "except_group_clause" => {
                let exc_type = child.child(1).map(|n| node_text(&n, source));
                let name = child
                    .child(3)
                    .and_then(|n| if n.kind() == "identifier" { Some(node_text(&n, source)) } else { None });
                let mut handler_body = Vec::new();
                if let Some(block) = find_child_by_kind(&child, "block") {
                    extract_block_opcodes(&block, source, &mut handler_body, locals, depth + 1);
                }
                handlers.push(ExceptHandler {
                    exc_type,
                    name,
                    body: handler_body,
                });
            }
            "finally_clause" => {
                if let Some(block) = find_child_by_kind(&child, "block") {
                    extract_block_opcodes(&block, source, &mut finalize, locals, depth + 1);
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

fn extract_with_opcode(
    node: &Node,
    source: &str,
    opcodes: &mut Vec<Opcode>,
    locals: &mut Vec<LocalVar>,
    depth: usize,
) {
    let ctx_expr = node
        .child(1)
        .map(|n| node_text(&n, source))
        .unwrap_or_default();

    // Look for "as var"
    let as_var = {
        let mut cursor = node.walk();
        let result = node.children(&mut cursor)
            .find(|c| c.kind() == "as_pattern")
            .and_then(|n| n.child(2))
            .map(|n| node_text(&n, source));
        result
    };

    let mut with_body = Vec::new();
    if let Some(block) = find_child_by_kind(node, "block") {
        extract_block_opcodes(&block, source, &mut with_body, locals, depth + 1);
    }

    opcodes.push(Opcode::With {
        ctx: ctx_expr,
        var: as_var,
        body: with_body,
    });
}

fn extract_call_args(call_node: &Node, source: &str) -> Vec<String> {
    find_child_by_kind(call_node, "argument_list")
        .map(|al| {
            let mut cursor = al.walk();
            al.children(&mut cursor)
                .filter(|c| c.kind() != "(" && c.kind() != ")" && c.kind() != ",")
                .take(5) // limit for brevity
                .map(|c| truncate_str(&node_text(&c, source), 60))
                .collect()
        })
        .unwrap_or_default()
}

fn collect_nested_calls(node: &Node, source: &str, opcodes: &mut Vec<Opcode>) {
    let mut stack = vec![*node];
    while let Some(current) = stack.pop() {
        let mut cursor = current.walk();
        for child in current.children(&mut cursor) {
            if child.kind() == "call" {
                let func = child.child(0).map(|n| node_text(&n, source)).unwrap_or_default();
                let args = extract_call_args(&child, source);
                opcodes.push(Opcode::Call {
                    func,
                    args,
                    out: None,
                });
            } else if child.child_count() > 0
                && child.kind() != "function_definition"
                && child.kind() != "class_definition"
            {
                stack.push(child);
            }
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

fn truncate_str(s: &str, max: usize) -> String {
    if s.len() <= max {
        s.to_string()
    } else {
        format!("{}...", &s[..max])
    }
}

fn infer_type_from_rhs(val: &str) -> String {
    let v = val.trim();
    if v == "True" || v == "False" {
        "bool".to_string()
    } else if v == "None" {
        "None".to_string()
    } else if v.starts_with('"') || v.starts_with('\'') || v.starts_with("f\"") {
        "str".to_string()
    } else if v.starts_with('[') {
        "list".to_string()
    } else if v.starts_with('{') {
        "dict".to_string()
    } else if v.parse::<i64>().is_ok() {
        "int".to_string()
    } else if v.parse::<f64>().is_ok() {
        "float".to_string()
    } else {
        "Any".to_string()
    }
}
