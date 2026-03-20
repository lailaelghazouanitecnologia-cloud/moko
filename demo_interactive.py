#!/usr/bin/env python3
"""Demo: Interactive repo analyzer session."""

from dotenv import load_dotenv

load_dotenv()

from repo_analyzer.agent import create_analyzer_agent

agent = create_analyzer_agent()

print("🤖 AI Repo Analyzer - Interactive Demo")
print("   Ask me to analyze any GitHub repository!\n")
print("   Examples:")
print("   - 'Analyze agno-agi/agno'")
print("   - 'Compare facebook/react and vuejs/core'")
print("   - 'What technologies does vercel/next.js use?'")
print("   - 'Show me the top contributors of python/cpython'\n")

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
