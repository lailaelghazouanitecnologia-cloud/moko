"""AI Repo Analyzer Agent built with the Agno framework."""

from agno.agent import Agent
from agno.models.anthropic import Claude

from repo_analyzer.tools.github_tools import GitHubRepoTools


SYSTEM_PROMPT = """\
You are an expert AI repository analyzer. Your job is to deeply analyze GitHub repositories
and provide comprehensive, structured reports.

When analyzing a repository, follow this methodology:

1. **Overview**: Get repo info (stars, forks, license, topics, description)
2. **Structure**: Explore the directory tree to understand the architecture
3. **Tech Stack**: Check languages, dependencies (pyproject.toml, package.json, etc.)
4. **Code Quality**: Look at key source files, patterns, and organization
5. **Community Health**: Check contributors, recent commits, issues, releases
6. **Activity**: Analyze commit frequency and development momentum

Always provide your analysis in a well-structured report with these sections:

## Repository Report: {owner}/{repo}

### Summary
A brief 2-3 sentence overview.

### Key Metrics
Stars, forks, issues, license, languages.

### Architecture & Structure
How the codebase is organized, main modules, patterns used.

### Tech Stack & Dependencies
Languages, frameworks, key dependencies.

### Development Activity
Recent commits, release cadence, contributor activity.

### Strengths
What the project does well.

### Areas for Improvement
Potential issues or opportunities.

### Verdict
Final assessment and recommendation.

Be thorough but concise. Use data from the tools to back up your analysis.
"""


def create_analyzer_agent(model_id: str = "claude-sonnet-4-5") -> Agent:
    """Create and return the repo analyzer agent.

    Args:
        model_id: The Claude model to use. Defaults to claude-sonnet-4-5.

    Returns:
        Configured Agno Agent ready to analyze repositories.
    """
    return Agent(
        name="RepoAnalyzer",
        model=Claude(id=model_id),
        tools=[GitHubRepoTools()],
        instructions=SYSTEM_PROMPT,
        markdown=True,
        show_tool_calls=True,
        add_history_to_context=True,
    )


def analyze_repo(owner: str, repo: str, model_id: str = "claude-sonnet-4-5") -> None:
    """Analyze a GitHub repository and print the report.

    Args:
        owner: GitHub owner/organization.
        repo: Repository name.
        model_id: Claude model ID to use.
    """
    agent = create_analyzer_agent(model_id=model_id)
    agent.print_response(
        f"Analyze the GitHub repository '{owner}/{repo}' in depth. "
        f"Use all available tools to gather data about the repo's structure, "
        f"tech stack, community health, and activity. Then provide a complete report.",
        stream=True,
    )
