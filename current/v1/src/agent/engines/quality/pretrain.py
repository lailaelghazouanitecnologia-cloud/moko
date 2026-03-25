"""
Pre-train the quality classifier with synthetic records via LLM.

Generates ~150 realistic code examples across issue types, module roles,
and severities. Validates each with the real _compute_score() pipeline
(LLM estimates are discarded). Stores in global.db as __synthetic__ records.

Usage:
    from quality.pretrain import run_pretrain
    run_pretrain(provider="groq", model="meta-llama/llama-4-scout-17b-16e-instruct")
"""
from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path
from typing import Optional

from .global_db import GlobalQualityDB, GlobalQualityRecord
from .quality_features import QualityFeatureExtractor, detect_issues
from .embedder import build_embedder, EmbedderConfig


ISSUE_TYPES = [
    "weak_types", "stub_impl", "shallow_algorithm", "bad_naming",
    "no_docs", "poor_encapsulation", "missing_error_handling",
    "private_access", "hardcoded_template", "code_typos",
]

MODULE_ROLES = ["types", "service", "util", "controller", "barrel"]

SEVERITIES = ["critical", "major", "minor"]

ACTIONS = {
    "weak_types": ("add_types", "auto"),
    "stub_impl": ("rewrite_algorithm", "llm_rewrite"),
    "shallow_algorithm": ("rewrite_algorithm", "llm_rewrite"),
    "bad_naming": ("rename", "auto"),
    "no_docs": ("add_docs", "prompt_hint"),
    "poor_encapsulation": ("encapsulate", "auto"),
    "missing_error_handling": ("add_error_handling", "auto"),
    "private_access": ("restructure", "prompt_hint"),
    "hardcoded_template": ("extract_constants", "auto"),
    "code_typos": ("fix_typos", "prompt_hint"),
}

PROMPT_TEMPLATE = """You are an expert TypeScript code quality evaluator.

Generate a REALISTIC TypeScript code example that has the following quality issue:
  issue_type: {issue_type}
  module_role: {module_role}  (this file is a {module_role} file)
  severity: {severity}

The code should be 15-40 lines, look like real production code (not contrived),
and clearly demonstrate the issue.

Then generate the CORRECTED version of the same code with the issue fixed.

Return ONLY valid JSON (no markdown, no explanation):
{{
  "code": "... the TypeScript code with the issue ...",
  "corrected_code": "... the same code with the issue fixed ..."
}}"""


def run_pretrain(
    provider: str = "groq",
    model: Optional[str] = None,
    max_records: int = 150,
    verbose: bool = True,
):
    """Generate synthetic training records and validate with real pipeline.

    Args:
        provider: LLM provider name
        model: Model override
        max_records: Target number of records to generate
        verbose: Print progress
    """
    from ...core.llm.providers import LLMProvider, LLMMessage

    llm = LLMProvider(provider=provider, model=model)

    def _call_llm(prompt_text: str) -> str:
        msgs = [LLMMessage(role="user", content=prompt_text)]
        resp = llm.complete(msgs, temperature=0.7, max_tokens=2000)
        return resp.content
    db = GlobalQualityDB()
    embedder = build_embedder(EmbedderConfig(backend="tfidf"))
    extractor = QualityFeatureExtractor()

    # Import _compute_score from QualityEngine
    from . import QualityEngine
    import tempfile
    _engine = QualityEngine(tempfile.mkdtemp(), project_name="__pretrain__")

    existing = db.total_records(project="__synthetic__")
    if existing >= max_records:
        if verbose:
            print(f"Already have {existing} synthetic records (target: {max_records}). Skipping.")
        return existing

    generated = 0
    errors = 0
    combinations = []

    # Build combinations: issue_type × module_role × severity (top N)
    for issue_type in ISSUE_TYPES:
        for role in MODULE_ROLES[:3]:  # top 3 roles
            for sev in SEVERITIES[:2]:  # top 2 severities
                combinations.append((issue_type, role, sev))

    if verbose:
        print(f"Pre-training: generating up to {max_records} records from {len(combinations)} combinations")
        print(f"Existing synthetic: {existing}")

    target = max_records - existing

    for i, (issue_type, role, severity) in enumerate(combinations):
        if generated >= target:
            break

        prompt = PROMPT_TEMPLATE.format(
            issue_type=issue_type,
            module_role=role,
            severity=severity,
        )

        try:
            text = _call_llm(prompt)

            # Parse JSON from response
            data = _extract_json(text)
            if not data or "code" not in data or "corrected_code" not in data:
                errors += 1
                continue

            code = data["code"]
            corrected = data["corrected_code"]

            if len(code) < 30 or len(corrected) < 30:
                errors += 1
                continue

            # Validate with REAL pipeline (not LLM estimate)
            features_before = extractor.extract(code)
            features_after = extractor.extract(corrected)
            score_before = _engine._compute_score(features_before)
            score_after = _engine._compute_score(features_after)
            real_delta = score_after - score_before

            action, strategy = ACTIONS.get(issue_type, ("llm_review", "llm_rewrite"))

            # Generate embedding
            embedding = embedder.embed_issue(code, 0, issue_type)

            rec = GlobalQualityRecord(
                project_name="__synthetic__",
                issue_type=issue_type,
                severity=severity,
                features=features_before.to_dict(),
                action=action,
                strategy=strategy,
                applied=True,
                score_before=score_before,
                score_after=score_after,
                quality_delta=real_delta,
                language="typescript",
                module_role=role,
                emb_model=embedder.name,
                run_id="pretrain",
            )
            db.record(rec, embedding=embedding)
            generated += 1

            if verbose and generated % 10 == 0:
                print(f"  [{generated}/{target}] last: {issue_type}/{role} delta={real_delta:+.3f}")

            # Rate limit
            time.sleep(0.5)

        except Exception as e:
            errors += 1
            if verbose:
                print(f"  Error: {e}")
            time.sleep(1)

    total = db.total_records(project="__synthetic__")
    if verbose:
        print(f"\nPre-training done: {generated} new records ({errors} errors)")
        print(f"Total synthetic: {total}")

    return total


def _extract_json(text: str) -> Optional[dict]:
    """Extract JSON from LLM response (handles markdown fences)."""
    text = text.strip()

    # Remove markdown fences
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines)

    # Try direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try finding JSON in text
    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        try:
            return json.loads(text[start:end + 1])
        except json.JSONDecodeError:
            pass

    return None
