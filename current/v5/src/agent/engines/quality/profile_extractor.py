"""
ProfileExtractor — builds CodeProfile from a project directory or set of files.

Extracted from learned_scorer.py for modularity. Uses shared metrics from
metrics.py to avoid duplicating regex patterns.
"""
from __future__ import annotations

import math
import re
from pathlib import Path
from typing import Dict, List, Set, Tuple

from .code_profile import CodeProfile
from .metrics import extract_metrics


class ProfileExtractor:
    """Extract a CodeProfile from a project directory or set of files."""

    def extract_project(self, project_dir: str, name: str = "") -> CodeProfile:
        """Analyze an entire project and build its profile."""
        src_dir = Path(project_dir)
        if (src_dir / "src").exists():
            src_dir = src_dir / "src"

        files: Dict[str, str] = {}
        for ts_file in src_dir.rglob("*.ts"):
            rel = str(ts_file.relative_to(src_dir))
            try:
                content = ts_file.read_text()
                if len(content) < 100_000:
                    files[rel] = content
            except Exception:
                pass

        if not files:
            return CodeProfile(name=name)

        return self.extract_files(files, name=name or str(project_dir))

    def extract_files(self, files: Dict[str, str], name: str = "") -> CodeProfile:
        """Build profile from a set of files."""
        p = CodeProfile(name=name)

        all_code = "\n".join(files.values())
        per_file_metrics: List[Dict[str, float]] = []
        class_sizes: List[int] = []
        method_counts: List[int] = []
        complexities: List[float] = []

        total_loc = 0
        total_classes = 0
        total_interfaces = 0
        total_methods = 0
        total_private = 0
        total_exports = 0
        total_items = 0

        for filename, code in files.items():
            lines = code.split("\n")
            loc = len([l for l in lines if l.strip() and not l.strip().startswith("//")])
            if loc < 3:
                continue

            total_loc += loc
            p.total_files += 1

            # Use shared metrics for common counts
            cm = extract_metrics(code)

            complexity = cm.branch_count / max(loc, 1)
            per_file_metrics.append({
                "complexity": complexity,
                "avg_func_len": self._avg_func_length(code, loc),
            })
            complexities.append(complexity)

            # Class analysis
            n_classes = cm.class_count
            total_classes += n_classes
            if n_classes > 0:
                class_sizes.append(loc / n_classes)

            # Methods per class
            methods = re.findall(
                r"(?:private|public|protected|async|static)\s+\w+\s*\(",
                code
            )
            n_methods = len(methods)
            total_methods += n_methods
            if n_classes > 0:
                method_counts.append(n_methods / n_classes)

            total_private += cm.private_count
            total_interfaces += cm.interface_count

            exports = len(re.findall(r"\bexport\s+(?:class|interface|type|function|const|enum)\b", code))
            total_exports += exports
            total_items += n_classes + cm.interface_count + cm.type_alias_count

        if total_loc == 0:
            return p

        p.total_loc = total_loc
        scale = 100.0 / total_loc

        # Use shared metrics on all_code for densities
        all_cm = extract_metrics(all_code)

        # Type system densities (from shared metrics)
        p.readonly_density = all_cm.readonly_count * scale
        p.generic_density = all_cm.generic_count * scale
        p.union_density = all_cm.union_count * scale
        p.type_alias_density = all_cm.type_alias_count * scale
        p.any_density = all_cm.any_count * scale
        p.unknown_density = all_cm.unknown_count * scale

        # Sophisticated type patterns
        p.discriminated_union_count = len(re.findall(
            r"(?:kind|type|tag|status)\s*:\s*['\"]", all_code
        ))
        p.branded_type_count = len(re.findall(
            r"string\s*&\s*\{\s*(?:readonly\s+)?__\w+", all_code
        ))
        p.const_assertion_count = len(re.findall(r"\bas\s+const\b", all_code))
        p.mapped_type_count = len(re.findall(r"\[\s*\w+\s+in\s+keyof\b", all_code))
        p.conditional_type_count = len(re.findall(r"\bextends\b.*\?.*:", all_code))

        # Architecture
        p.avg_class_size = sum(class_sizes) / len(class_sizes) if class_sizes else 0
        p.avg_method_count = sum(method_counts) / len(method_counts) if method_counts else 0
        total_members = total_methods + len(re.findall(
            r"^\s+(?:private|public|protected|readonly)\s+\w+\s*[:=]", all_code, re.MULTILINE
        ))
        p.private_ratio = total_private / max(total_members, 1)
        p.interface_to_class_ratio = total_interfaces / max(total_classes, 1)
        p.export_ratio = total_exports / max(total_items, 1)

        # Implementation depth
        p.avg_complexity = sum(complexities) / len(complexities) if complexities else 0
        if per_file_metrics:
            p.avg_function_length = sum(m["avg_func_len"] for m in per_file_metrics) / len(per_file_metrics)
        error_count = all_cm.try_count + all_cm.catch_count + all_cm.throw_count
        p.error_handling_density = error_count * scale
        validation_count = len(re.findall(r"\b(?:typeof|instanceof)\b", all_code))
        p.validation_density = validation_count * scale

        # Consistency
        if len(complexities) > 1:
            mean_c = sum(complexities) / len(complexities)
            p.complexity_stddev = math.sqrt(sum((c - mean_c) ** 2 for c in complexities) / len(complexities))
        if len(method_counts) > 1:
            mean_m = sum(method_counts) / len(method_counts)
            p.method_count_stddev = math.sqrt(sum((m - mean_m) ** 2 for m in method_counts) / len(method_counts))

        p.naming_consistency = self._measure_naming_consistency(files)
        p.import_coherence, p.type_reuse_ratio, p.dead_export_ratio = \
            self._measure_coherence(files)

        # Code conciseness (from shared metrics)
        p.optional_chaining_density = all_cm.optional_chaining_count * scale
        p.nullish_coalescing_density = all_cm.nullish_coalescing_count * scale

        ternary_count = all_cm.ternary_count
        if_count = len(re.findall(r"\bif\s*\(", all_code))
        p.ternary_ratio = ternary_count / max(ternary_count + if_count, 1)

        p.literal_type_density = len(re.findall(r"['\"][-\w]+['\"]\s*\|", all_code)) * scale

        # Comments analysis
        comment_lines = 0
        trivial_comments = 0
        total_comments = 0
        for line in all_code.split("\n"):
            stripped = line.strip()
            if stripped.startswith("//") or stripped.startswith("*") or stripped.startswith("/*"):
                comment_lines += 1
                total_comments += 1
                comment_text = re.sub(r"^[/*\s]+", "", stripped).lower()
                if re.match(r"^(get|set|create|delete|update|return|check|validate|constructor|import)\s+\w+\s*$", comment_text):
                    trivial_comments += 1
                elif len(comment_text) < 4:
                    trivial_comments += 1
        p.comment_density = comment_lines * scale
        p.unnecessary_comment_ratio = trivial_comments / max(total_comments, 1)

        # Boilerplate ratio
        validation_lines = 0
        for line in all_code.split("\n"):
            stripped = line.strip()
            if re.search(r"typeof\s+\w+\s*!==|instanceof\s+\w+|throw\s+new\s+TypeError|throw\s+new\s+RangeError", stripped):
                validation_lines += 1
            elif re.match(r"if\s*\(\s*!", stripped) and "throw" in stripped:
                validation_lines += 1
        p.boilerplate_ratio = validation_lines / max(total_loc, 1)

        p.avg_exports_per_file = len(re.findall(
            r"\bexport\s+(?:class|interface|type|function|const|enum)\b", all_code
        )) / max(p.total_files, 1)

        void_methods = len(re.findall(r"\):\s*void\s*\{", all_code))
        all_methods = len(re.findall(r"\):\s*\w+", all_code))
        p.void_method_ratio = void_methods / max(all_methods, 1)

        # Rich metrics via TypeScriptAnalyzer
        self._extract_rich_metrics(p, files, all_code, total_loc, scale)

        return p

    def _extract_rich_metrics(self, p: CodeProfile, files: Dict[str, str],
                               all_code: str, total_loc: int, scale: float):
        """Extract rich metrics using the TypeScript static analyzer."""
        from .ts_analyzer import TypeScriptAnalyzer

        analyzer = TypeScriptAnalyzer()
        result = analyzer.analyze(files)

        if result.functions:
            ccs = [analyzer._cognitive_for_block(f.body) for f in result.functions]
            p.cognitive_complexity_avg = sum(ccs) / len(ccs)
            func_lengths = [f.loc for f in result.functions]
            p.max_function_length = max(func_lengths)
            p.long_function_ratio = sum(1 for l in func_lengths if l > 50) / len(func_lengths)
            param_counts = [f.param_count for f in result.functions]
            p.parameter_count_avg = sum(param_counts) / len(param_counts)
            p.high_param_ratio = sum(1 for c in param_counts if c > 4) / len(param_counts)
            return_counts = [f.body.count("return ") + f.body.count("return;")
                             for f in result.functions]
            p.return_point_count_avg = sum(return_counts) / len(return_counts)
            guards = [analyzer.has_guard_clauses(f) for f in result.functions]
            p.early_return_ratio = sum(guards) / len(guards)
            p.guard_clause_ratio = p.early_return_ratio

        p.max_nesting_depth = result.nesting.max_depth
        p.avg_nesting_depth = result.nesting.avg_depth

        coupling = result.coupling
        if coupling.afferent:
            p.afferent_coupling_avg = sum(coupling.afferent.values()) / len(coupling.afferent)
        if coupling.efferent:
            p.efferent_coupling_avg = sum(coupling.efferent.values()) / len(coupling.efferent)
        if coupling.instability:
            p.instability_index = sum(coupling.instability.values()) / len(coupling.instability)
        p.dependency_depth = coupling.max_depth
        p.circular_dependency_count = coupling.circular_count

        if result.classes:
            cohesions = [analyzer.class_cohesion(c) for c in result.classes]
            p.cohesion_ratio = sum(cohesions) / len(cohesions)
            p.single_responsibility = p.cohesion_ratio
            p.god_class_count = sum(
                1 for c in result.classes
                if c.method_count > 10 or c.loc > 200
            )
            di_count = sum(1 for c in result.classes if analyzer.uses_dependency_injection(c))
            p.dependency_injection_ratio = di_count / len(result.classes)

        # Module size variance
        module_locs: Dict[str, int] = {}
        for filename, code in files.items():
            mod = analyzer._module_from_path(filename)
            loc = len([l for l in code.split("\n") if l.strip()])
            module_locs[mod] = module_locs.get(mod, 0) + loc
        if len(module_locs) > 1:
            mean_ml = sum(module_locs.values()) / len(module_locs)
            if mean_ml > 0:
                variance = sum((v - mean_ml) ** 2 for v in module_locs.values()) / len(module_locs)
                p.module_size_variance = math.sqrt(variance) / mean_ml

        # Naming & Legibility (use shared metrics for identifiers)
        all_cm = extract_metrics(all_code)
        if all_cm.identifier_count > 0:
            p.avg_identifier_length = all_cm.avg_identifier_length
            p.semantic_name_score = 1.0 - all_cm.generic_name_ratio
            p.naming_convention_uniformity = all_cm.camel_case_ratio

            # Short name ratio (specific — needs filtering beyond shared metrics)
            identifiers = re.findall(r'\b([a-zA-Z_]\w{2,})\b', all_code)
            from .metrics import TS_KEYWORDS
            idents = [i for i in identifiers if i.lower() not in TS_KEYWORDS]
            if idents:
                short_excluded = {'i', 'j', 'k', 'e', '_', 'x', 'y', 'id'}
                short = [i for i in idents if len(i) < 3 and i not in short_excluded]
                p.short_name_ratio = len(short) / len(idents)

        # Magic numbers
        all_numeric_literals = re.findall(r'(?<!\w)(\d+\.?\d*)(?!\w)', all_code)
        non_trivial = [n for n in all_numeric_literals if n not in ('0', '1', '2', '0.0', '1.0')]
        named_consts = len(re.findall(r'\bconst\s+\w+\s*[:=]\s*\d', all_code))
        p.magic_number_density = len(non_trivial) * scale
        p.meaningful_constant_ratio = named_consts / max(named_consts + len(non_trivial), 1)

        # Error Handling
        if result.functions:
            public_funcs = [f for f in result.functions if f.is_public]
            if public_funcs:
                error_handled = sum(
                    1 for f in public_funcs
                    if re.search(r'\btry\b|\bthrow\b|\bcatch\b', f.body)
                )
                p.error_boundary_coverage = error_handled / len(public_funcs)

        p.empty_catch_count = len(re.findall(r'catch\s*\([^)]*\)\s*\{\s*\}', all_code))

        assertion_count = len(re.findall(r'\b(?:assert|console\.assert|expect)\b', all_code))
        func_count = len(result.functions) if result.functions else 1
        p.assertion_density = assertion_count / func_count

        potential_null_access = len(re.findall(r'\.\w+', all_code))
        safe_access = all_cm.optional_chaining_count
        null_checks = len(re.findall(r'!==?\s*null|!==?\s*undefined|\?\?', all_code))
        p.null_safety_coverage = (safe_access + null_checks) / max(potential_null_access, 1)

        async_calls = len(re.findall(r'\bawait\b', all_code))
        promise_then = len(re.findall(r'\.then\(', all_code))
        promise_catch = len(re.findall(r'\.catch\(', all_code))
        unhandled = max(0, promise_then - promise_catch)
        total_async = async_calls + promise_then
        p.unhandled_promise_ratio = unhandled / max(total_async, 1)

        # Duplication
        p.duplicate_block_ratio = result.duplicates.ratio

        all_exports_set: Set[str] = set()
        all_imports_set: Set[str] = set()
        for imp_list in result.imports_by_file.values():
            for imp in imp_list:
                all_imports_set.update(imp.names)
        for m in re.finditer(r'\bexport\s+(?:class|interface|type|function|const|enum)\s+(\w+)', all_code):
            all_exports_set.add(m.group(1))
        dead_exports = all_exports_set - all_imports_set
        p.dead_code_ratio = len(dead_exports) / max(len(all_exports_set), 1)

        # Unused parameters
        total_params = 0
        unused_params = 0
        for func in result.functions:
            for param in func.params:
                param_name = param.split(":")[0].strip()
                param_name = re.sub(r'^(private|public|protected|readonly)\s+', '', param_name).strip()
                if not param_name or param_name == '_':
                    continue
                total_params += 1
                if param_name not in func.body.split("{", 1)[-1] if "{" in func.body else "":
                    unused_params += 1
        p.unused_parameter_ratio = unused_params / max(total_params, 1)

        # Commented code ratio
        comment_lines_code = 0
        comment_lines_total = 0
        for line in all_code.split("\n"):
            stripped = line.strip()
            if stripped.startswith("//") or stripped.startswith("*"):
                comment_lines_total += 1
                text = re.sub(r'^[/*\s]+', '', stripped)
                if re.match(r'(if|for|while|return|const|let|var|import|export|class|function)\b', text):
                    comment_lines_code += 1
                elif text.endswith(';') or text.endswith('{') or text.endswith('}'):
                    comment_lines_code += 1
        p.commented_code_ratio = comment_lines_code / max(comment_lines_total, 1)

        # Design Patterns
        interfaces = re.findall(r'interface\s+\w+[^{]*\{([^}]*)\}', all_code, re.DOTALL)
        if interfaces:
            methods_per_iface = [len(re.findall(r'\w+\s*\(', body)) for body in interfaces]
            p.interface_segregation_score = sum(methods_per_iface) / len(methods_per_iface)

        p.immutability_score = (all_cm.readonly_count + all_cm.const_count) / max(
            all_cm.readonly_count + all_cm.const_count + all_cm.let_count + len(re.findall(r'\bvar\b', all_code)), 1)

        p.factory_pattern_count = len(re.findall(
            r'\b(?:static\s+)?(?:create|build|from|of|make)\w*\s*[<(]', all_code
        ))

    def _avg_func_length(self, code: str, loc: int) -> float:
        """Calculate average function length for a file."""
        func_starts = [i for i, line in enumerate(code.split("\n"))
                       if re.search(r"(?:async\s+)?(?:private|public|protected|static)?\s*\w+\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{", line)]
        if len(func_starts) >= 2:
            lengths = [func_starts[i+1] - func_starts[i] for i in range(len(func_starts)-1)]
            return sum(lengths) / len(lengths)
        elif func_starts:
            return loc - func_starts[0]
        return 0

    def _measure_naming_consistency(self, files: Dict[str, str]) -> float:
        """Measure how consistently naming patterns are used across files."""
        patterns_per_file: List[set] = []

        for code in files.values():
            if len(code.split("\n")) < 5:
                continue
            patterns: set = set()
            if re.search(r"\breadonly\b", code):
                patterns.add("readonly")
            if re.search(r"private\s+readonly\b", code):
                patterns.add("private_readonly")
            if re.search(r"<\s*[A-Z]\w*\s*>", code):
                patterns.add("generics")
            if re.search(r"\btype\s+\w+\s*=", code):
                patterns.add("type_alias")
            if re.search(r"\binterface\s+\w+", code):
                patterns.add("interface")
            if re.search(r"\bthrow\s+new\s+\w+Error", code):
                patterns.add("typed_error")
            if re.search(r"\/\*\*", code):
                patterns.add("jsdoc")
            patterns_per_file.append(patterns)

        if len(patterns_per_file) < 2:
            return 1.0

        all_patterns = set()
        for p in patterns_per_file:
            all_patterns |= p

        if not all_patterns:
            return 1.0

        consistency_scores = []
        for pattern in all_patterns:
            count = sum(1 for p in patterns_per_file if pattern in p)
            ratio = count / len(patterns_per_file)
            consistency_scores.append(max(ratio, 1.0 - ratio))

        return sum(consistency_scores) / len(consistency_scores) if consistency_scores else 1.0

    def _measure_coherence(self, files: Dict[str, str]) -> Tuple[float, float, float]:
        """Measure cross-module coherence. Returns (import_coherence, type_reuse, dead_export_ratio)."""
        exports_by_file: Dict[str, set] = {}
        imports_by_file: Dict[str, set] = {}

        for filename, code in files.items():
            exported = set()
            for m in re.finditer(r"\bexport\s+(?:class|interface|type|function|const|enum)\s+(\w+)", code):
                exported.add(m.group(1))
            for m in re.finditer(r"export\s*\{\s*([^}]+)\}", code):
                for name in m.group(1).split(","):
                    name = name.strip().split(" as ")[0].strip()
                    if name:
                        exported.add(name)
            exports_by_file[filename] = exported

            imported = set()
            for m in re.finditer(r"import\s*\{([^}]+)\}\s*from", code):
                for name in m.group(1).split(","):
                    name = name.strip().split(" as ")[0].strip()
                    if name:
                        imported.add(name)
            imports_by_file[filename] = imported

        all_exports = set()
        all_imports = set()
        for exports in exports_by_file.values():
            all_exports |= exports
        for imports in imports_by_file.values():
            all_imports |= imports

        if not all_exports:
            return 1.0, 0.0, 0.0

        resolvable = all_imports & all_exports
        import_coherence = len(resolvable) / max(len(all_imports), 1)
        used_exports = all_exports & all_imports
        type_reuse = len(used_exports) / max(len(all_exports), 1)
        dead = all_exports - all_imports
        dead_ratio = len(dead) / max(len(all_exports), 1)

        return import_coherence, type_reuse, dead_ratio
