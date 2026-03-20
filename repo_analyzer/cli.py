"""CLI entry point for the AI Repo Analyzer."""

import argparse
import sys

from dotenv import load_dotenv


def main():
    """Main CLI entry point."""
    load_dotenv()

    parser = argparse.ArgumentParser(
        description="AI-powered GitHub repository analyzer built with Agno",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""\
Examples:
  repo-analyzer agno-agi/agno
  repo-analyzer langchain-ai/langchain --model claude-sonnet-4-5
  repo-analyzer facebook/react --interactive
        """,
    )
    parser.add_argument(
        "repository",
        nargs="?",
        help="GitHub repository in 'owner/repo' format (e.g. agno-agi/agno)",
    )
    parser.add_argument(
        "--model",
        default="claude-sonnet-4-5",
        help="Claude model ID to use (default: claude-sonnet-4-5)",
    )
    parser.add_argument(
        "--interactive", "-i",
        action="store_true",
        help="Start an interactive chat session with the analyzer agent",
    )

    args = parser.parse_args()

    if args.interactive:
        _run_interactive(args.model, args.repository)
    elif args.repository:
        _run_analysis(args.repository, args.model)
    else:
        parser.print_help()
        sys.exit(1)


def _run_analysis(repository: str, model_id: str):
    """Run a one-shot analysis on a repository."""
    if "/" not in repository:
        print(f"Error: Invalid repository format '{repository}'. Use 'owner/repo'.")
        sys.exit(1)

    owner, repo = repository.split("/", 1)

    from repo_analyzer.agent import analyze_repo

    print(f"\n🔍 Analyzing {owner}/{repo}...\n")
    analyze_repo(owner, repo, model_id=model_id)


def _run_interactive(model_id: str, initial_repo: str = None):
    """Run an interactive chat session with the analyzer."""
    from repo_analyzer.agent import create_analyzer_agent

    agent = create_analyzer_agent(model_id=model_id)

    print("\n🤖 AI Repo Analyzer - Interactive Mode")
    print("   Type 'quit' or 'exit' to stop.\n")

    if initial_repo:
        owner, repo = initial_repo.split("/", 1)
        prompt = (
            f"Analyze the GitHub repository '{owner}/{repo}' in depth. "
            f"Use all available tools to gather comprehensive data."
        )
        agent.print_response(prompt, stream=True)
        print()

    while True:
        try:
            user_input = input("You> ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nGoodbye!")
            break

        if not user_input:
            continue
        if user_input.lower() in ("quit", "exit", "q"):
            print("Goodbye!")
            break

        agent.print_response(user_input, stream=True)
        print()


if __name__ == "__main__":
    main()
