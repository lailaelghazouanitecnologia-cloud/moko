#!/usr/bin/env python3
"""Demo script: Analyze the Agno repository."""

from dotenv import load_dotenv

load_dotenv()

from repo_analyzer.agent import analyze_repo

if __name__ == "__main__":
    # Analyze the Agno AI framework repository
    analyze_repo("agno-agi", "agno")
