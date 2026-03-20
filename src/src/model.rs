//! Roska-compatible data model for Python analysis.
//! Mirrors the types from roska/crates/descriptor/src/*.rs
//! adapted for Python (struct→class, crate→package, impl→methods).

use serde::Serialize;

// ── Depth ──────────────────────────────────────────────────────────
#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Depth {
    Overview = 0,  // purpose + tags (~10 tokens/file)
    Structure = 1, // + imports, type names, function sigs (~60 tokens)
    Detail = 2,    // + fields, params, locals, calls (~150 tokens)
    Body = 3,      // + opcodes, full execution flow (~300 tokens)
}

// ── Hierarchy ──────────────────────────────────────────────────────
#[derive(Debug, Clone, Serialize)]
pub struct Workspace {
    pub name: String,
    pub path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub purpose: Option<String>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub tags: Vec<String>,
    pub modules: Vec<Module>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub shared_deps: Vec<String>,
    pub total_files: usize,
    pub total_lines: usize,
}

#[derive(Debug, Clone, Serialize)]
pub struct Module {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub purpose: Option<String>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub tags: Vec<String>,
    pub files: Vec<FileDescriptor>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub submodules: Vec<Module>,
    pub total_lines: usize,
}

// ── File ───────────────────────────────────────────────────────────
#[derive(Debug, Clone, Serialize)]
pub struct FileDescriptor {
    pub file: String,
    pub lines: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub purpose: Option<String>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub tags: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ctx: Option<String>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub notes: Vec<String>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub imports: Vec<ImportEntry>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub data: Vec<DataEntry>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub types: Vec<TypeDescriptor>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub functions: Vec<FuncDescriptor>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub exports: Vec<ExportEntry>,
}

// ── Imports ────────────────────────────────────────────────────────
#[derive(Debug, Clone, Serialize)]
pub struct ImportEntry {
    pub sym: String,
    #[serde(skip_serializing_if = "is_default_import_kind")]
    pub kind: ImportKind,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ctx: Option<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ImportKind {
    Use,       // regular import
    Typing,    // TYPE_CHECKING imports
    Decorator, // decorator import
    Base,      // base class import
}

fn is_default_import_kind(k: &ImportKind) -> bool {
    *k == ImportKind::Use
}

// ── Data (constants, module-level assignments) ─────────────────────
#[derive(Debug, Clone, Serialize)]
pub struct DataEntry {
    pub name: String,
    #[serde(rename = "type")]
    pub data_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub val: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ctx: Option<String>,
}

// ── Types (classes) ────────────────────────────────────────────────
#[derive(Debug, Clone, Serialize)]
pub struct TypeDescriptor {
    pub name: String,
    pub kind: TypeKind,
    #[serde(skip_serializing_if = "is_default_visibility")]
    pub vis: Visibility,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ctx: Option<String>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub bases: Vec<String>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub decorators: Vec<String>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub fields: Vec<FieldDef>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub variants: Vec<VariantDef>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub methods: Vec<FuncDescriptor>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lines: Option<(usize, usize)>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum TypeKind {
    Struct,    // @dataclass or plain class with fields
    Enum,      // class(Enum) / class(StrEnum)
    Trait,     // ABC / Protocol
    TypeAlias, // type alias
    Model,     // Pydantic BaseModel
}

#[derive(Debug, Clone, Serialize)]
pub struct FieldDef {
    pub name: String,
    #[serde(rename = "type")]
    pub field_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ctx: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct VariantDef {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub val: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ctx: Option<String>,
}

// ── Functions ──────────────────────────────────────────────────────
#[derive(Debug, Clone, Serialize)]
pub struct FuncDescriptor {
    pub name: String,
    pub sig: String,
    #[serde(skip_serializing_if = "std::ops::Not::not")]
    pub is_async: bool,
    #[serde(skip_serializing_if = "is_default_visibility")]
    pub vis: Visibility,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub decorators: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lines: Option<(usize, usize)>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub detail: Option<FuncDetail>,
}

#[derive(Debug, Clone, Serialize)]
pub struct FuncDetail {
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub locals: Vec<LocalVar>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub calls: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub body: Option<Vec<Opcode>>,
}

#[derive(Debug, Clone, Serialize)]
pub struct LocalVar {
    pub name: String,
    #[serde(rename = "type")]
    pub var_type: String,
}

// ── Visibility ─────────────────────────────────────────────────────
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Visibility {
    Private,  // _name or __name
    Pub,      // public (no underscore prefix)
    Protected, // _name (single underscore, Python convention)
}

impl Default for Visibility {
    fn default() -> Self {
        Visibility::Pub
    }
}

fn is_default_visibility(v: &Visibility) -> bool {
    *v == Visibility::Pub
}

// ── Opcodes ────────────────────────────────────────────────────────
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "op")]
pub enum Opcode {
    Call {
        func: String,
        #[serde(skip_serializing_if = "Vec::is_empty")]
        args: Vec<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        out: Option<String>,
    },
    Ret {
        val: String,
    },
    Try {
        body: Vec<Opcode>,
        #[serde(skip_serializing_if = "Vec::is_empty")]
        handlers: Vec<ExceptHandler>,
        #[serde(skip_serializing_if = "Vec::is_empty")]
        finalize: Vec<Opcode>,
    },
    Br {
        to: String,
    },
    BrTrue {
        cond: String,
        body: Vec<Opcode>,
        #[serde(skip_serializing_if = "Vec::is_empty")]
        else_body: Vec<Opcode>,
    },
    Raise {
        exc: String,
    },
    New {
        type_name: String,
        #[serde(skip_serializing_if = "Vec::is_empty")]
        args: Vec<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        out: Option<String>,
    },
    Store {
        val: String,
        target: String,
    },
    Load {
        src: String,
    },
    FieldAccess {
        src: String,
        name: String,
    },
    Loop {
        iter: String,
        var: String,
        body: Vec<Opcode>,
    },
    With {
        ctx: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        var: Option<String>,
        body: Vec<Opcode>,
    },
    Yield {
        val: String,
    },
    Await {
        val: String,
    },
    Assert {
        test: String,
    },
    Label {
        name: String,
    },
}

#[derive(Debug, Clone, Serialize)]
pub struct ExceptHandler {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub exc_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    pub body: Vec<Opcode>,
}

// ── Exports ────────────────────────────────────────────────────────
#[derive(Debug, Clone, Serialize)]
pub struct ExportEntry {
    pub name: String,
    pub kind: ExportKind,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ExportKind {
    Func,
    Type,
    Const,
    Data,
}

// ── Dependency Graph ───────────────────────────────────────────────
#[derive(Debug, Clone, Serialize)]
pub struct DepGraph {
    pub nodes: Vec<DepNode>,
    pub edges: Vec<DepEdge>,
}

#[derive(Debug, Clone, Serialize)]
pub struct DepNode {
    pub id: String,
    pub kind: DepNodeKind,
    pub file: String,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum DepNodeKind {
    Module,
    Class,
    Function,
}

#[derive(Debug, Clone, Serialize)]
pub struct DepEdge {
    pub from: String,
    pub to: String,
    pub kind: DepEdgeKind,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum DepEdgeKind {
    Imports,
    Calls,
    Inherits,
}
