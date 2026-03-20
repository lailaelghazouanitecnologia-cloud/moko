# AI Repo Analyzer

AI-powered GitHub repository analyzer built with the [Agno](https://github.com/agno-agi/agno) framework and Claude.

## What it does

This agent analyzes any public GitHub repository and generates a comprehensive report covering:

- **Overview & Metrics** — Stars, forks, license, topics
- **Architecture & Structure** — Directory tree, module organization
- **Tech Stack** — Languages, dependencies, frameworks
- **Community Health** — Contributors, issues, releases
- **Development Activity** — Commit frequency, recent changes
- **Strengths & Improvements** — Data-backed assessment

## Quick Start

### 1. Install dependencies

```bash
pip install -e .
```

### 2. Configure API keys

```bash
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
# Optionally add GITHUB_TOKEN for higher rate limits
```

### 3. Run the analyzer

**One-shot analysis:**

```bash
# Via CLI
repo-analyzer agno-agi/agno

# Via Python
python demo.py
```

**Interactive mode:**

```bash
# Via CLI
repo-analyzer agno-agi/agno --interactive

# Via Python
python demo_interactive.py
```

## Usage

### CLI

```bash
# Analyze a repository
repo-analyzer owner/repo

# Use a specific model
repo-analyzer owner/repo --model claude-sonnet-4-5

# Interactive chat mode
repo-analyzer --interactive

# Interactive with initial repo
repo-analyzer owner/repo -i
```

### Python API

```python
from repo_analyzer.agent import create_analyzer_agent, analyze_repo

# One-shot analysis
analyze_repo("agno-agi", "agno")

# Interactive / custom usage
agent = create_analyzer_agent()
agent.print_response("Analyze agno-agi/agno and focus on the architecture", stream=True)
```

## Project Structure

```
ai-repo-analyzer/
├── repo_analyzer/
│   ├── __init__.py
│   ├── agent.py            # Agno agent definition
│   ├── cli.py              # CLI entry point
│   └── tools/
│       ├── __init__.py
│       └── github_tools.py # GitHub API tools (10 tools)
├── demo.py                 # Quick demo script
├── demo_interactive.py     # Interactive demo
├── pyproject.toml          # Project config & dependencies
├── .env.example            # Environment variable template
└── README.md
```

## Available Tools

The agent has 10 GitHub analysis tools:

| Tool | Description |
|------|-------------|
| `get_repo_info` | Repository metadata (stars, forks, license, topics) |
| `get_repo_structure` | Directory/file listing at any path |
| `get_repo_languages` | Language breakdown with percentages |
| `get_repo_contributors` | Top contributors with commit counts |
| `get_recent_commits` | Latest commits with messages |
| `get_open_issues` | Open issues with labels |
| `get_releases` | Release history |
| `get_file_content` | Read any file in the repo |
| `search_code_in_repo` | Search for code patterns |
| `get_repo_activity` | Commit frequency and participation stats |

## Requirements

- Python 3.10+
- Anthropic API key (for Claude)
- GitHub token (optional, for higher API rate limits)

## Built With

- [Agno](https://github.com/agno-agi/agno) — Agent framework
- [Claude](https://www.anthropic.com/claude) — AI model
- [GitHub REST API](https://docs.github.com/en/rest) — Repository data
