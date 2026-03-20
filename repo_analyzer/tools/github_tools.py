"""GitHub repository analysis tools for the Agno agent."""

import json
import os
from typing import Optional

import requests
from agno.tools import Toolkit


class GitHubRepoTools(Toolkit):
    """Tools to fetch and analyze GitHub repositories."""

    def __init__(self, github_token: Optional[str] = None):
        super().__init__(name="github_repo_tools")
        self.token = github_token or os.getenv("GITHUB_TOKEN")
        self.headers = {"Accept": "application/vnd.github.v3+json"}
        if self.token:
            self.headers["Authorization"] = f"Bearer {self.token}"
        self.register(self.get_repo_info)
        self.register(self.get_repo_structure)
        self.register(self.get_repo_languages)
        self.register(self.get_repo_contributors)
        self.register(self.get_recent_commits)
        self.register(self.get_open_issues)
        self.register(self.get_releases)
        self.register(self.get_file_content)
        self.register(self.search_code_in_repo)
        self.register(self.get_repo_activity)

    def _api_get(self, url: str, params: Optional[dict] = None) -> dict:
        """Make a GET request to the GitHub API."""
        resp = requests.get(url, headers=self.headers, params=params, timeout=30)
        resp.raise_for_status()
        return resp.json()

    def get_repo_info(self, owner: str, repo: str) -> str:
        """Get general information about a GitHub repository including stars, forks,
        description, license, topics, creation date, and last update.

        Args:
            owner: The GitHub username or organization (e.g. 'agno-agi').
            repo: The repository name (e.g. 'agno').

        Returns:
            JSON string with repository metadata.
        """
        data = self._api_get(f"https://api.github.com/repos/{owner}/{repo}")
        info = {
            "name": data["full_name"],
            "description": data.get("description"),
            "stars": data["stargazers_count"],
            "forks": data["forks_count"],
            "watchers": data["subscribers_count"],
            "open_issues": data["open_issues_count"],
            "license": data.get("license", {}).get("spdx_id") if data.get("license") else None,
            "topics": data.get("topics", []),
            "language": data.get("language"),
            "created_at": data["created_at"],
            "updated_at": data["updated_at"],
            "pushed_at": data["pushed_at"],
            "default_branch": data["default_branch"],
            "homepage": data.get("homepage"),
            "size_kb": data["size"],
            "is_archived": data["archived"],
            "has_wiki": data["has_wiki"],
            "has_discussions": data.get("has_discussions", False),
        }
        return json.dumps(info, indent=2)

    def get_repo_structure(self, owner: str, repo: str, path: str = "") -> str:
        """Get the directory/file structure of a repository at a given path.

        Args:
            owner: The GitHub username or organization.
            repo: The repository name.
            path: Path within the repo to list (default: root).

        Returns:
            JSON string listing files and directories with their types and sizes.
        """
        data = self._api_get(
            f"https://api.github.com/repos/{owner}/{repo}/contents/{path}"
        )
        if isinstance(data, list):
            items = []
            for item in data:
                items.append({
                    "name": item["name"],
                    "type": item["type"],  # 'file' or 'dir'
                    "size": item.get("size", 0),
                    "path": item["path"],
                })
            items.sort(key=lambda x: (x["type"] != "dir", x["name"]))
            return json.dumps(items, indent=2)
        return json.dumps({"name": data["name"], "type": data["type"], "size": data.get("size")})

    def get_repo_languages(self, owner: str, repo: str) -> str:
        """Get the programming languages used in a repository with byte counts.

        Args:
            owner: The GitHub username or organization.
            repo: The repository name.

        Returns:
            JSON with languages and their byte counts, plus percentage breakdown.
        """
        data = self._api_get(f"https://api.github.com/repos/{owner}/{repo}/languages")
        total = sum(data.values()) if data else 1
        breakdown = {
            lang: {"bytes": count, "percentage": round(count / total * 100, 2)}
            for lang, count in data.items()
        }
        return json.dumps(breakdown, indent=2)

    def get_repo_contributors(self, owner: str, repo: str, top_n: int = 15) -> str:
        """Get the top contributors to a repository.

        Args:
            owner: The GitHub username or organization.
            repo: The repository name.
            top_n: Number of top contributors to return (default: 15).

        Returns:
            JSON list of contributors with their commit counts.
        """
        data = self._api_get(
            f"https://api.github.com/repos/{owner}/{repo}/contributors",
            params={"per_page": top_n},
        )
        contributors = [
            {"username": c["login"], "contributions": c["contributions"], "type": c["type"]}
            for c in data[:top_n]
        ]
        return json.dumps(contributors, indent=2)

    def get_recent_commits(self, owner: str, repo: str, count: int = 20) -> str:
        """Get the most recent commits from a repository.

        Args:
            owner: The GitHub username or organization.
            repo: The repository name.
            count: Number of recent commits to fetch (default: 20).

        Returns:
            JSON list of recent commits with author, date, and message.
        """
        data = self._api_get(
            f"https://api.github.com/repos/{owner}/{repo}/commits",
            params={"per_page": count},
        )
        commits = []
        for c in data[:count]:
            commits.append({
                "sha": c["sha"][:8],
                "author": c["commit"]["author"]["name"],
                "date": c["commit"]["author"]["date"],
                "message": c["commit"]["message"].split("\n")[0],
            })
        return json.dumps(commits, indent=2)

    def get_open_issues(self, owner: str, repo: str, count: int = 15) -> str:
        """Get open issues from a repository, sorted by most recent.

        Args:
            owner: The GitHub username or organization.
            repo: The repository name.
            count: Number of issues to fetch (default: 15).

        Returns:
            JSON list of open issues with title, labels, and creation date.
        """
        data = self._api_get(
            f"https://api.github.com/repos/{owner}/{repo}/issues",
            params={"state": "open", "per_page": count, "sort": "created", "direction": "desc"},
        )
        issues = []
        for issue in data[:count]:
            if "pull_request" not in issue:
                issues.append({
                    "number": issue["number"],
                    "title": issue["title"],
                    "labels": [l["name"] for l in issue.get("labels", [])],
                    "created_at": issue["created_at"],
                    "comments": issue["comments"],
                    "author": issue["user"]["login"],
                })
        return json.dumps(issues, indent=2)

    def get_releases(self, owner: str, repo: str, count: int = 10) -> str:
        """Get the most recent releases from a repository.

        Args:
            owner: The GitHub username or organization.
            repo: The repository name.
            count: Number of releases to fetch (default: 10).

        Returns:
            JSON list of releases with tag, name, date, and whether it's a prerelease.
        """
        data = self._api_get(
            f"https://api.github.com/repos/{owner}/{repo}/releases",
            params={"per_page": count},
        )
        releases = []
        for r in data[:count]:
            releases.append({
                "tag": r["tag_name"],
                "name": r.get("name", ""),
                "published_at": r["published_at"],
                "prerelease": r["prerelease"],
                "author": r["author"]["login"],
            })
        return json.dumps(releases, indent=2)

    def get_file_content(self, owner: str, repo: str, file_path: str) -> str:
        """Read the content of a specific file in the repository.

        Args:
            owner: The GitHub username or organization.
            repo: The repository name.
            file_path: Path to the file (e.g. 'README.md', 'pyproject.toml').

        Returns:
            The decoded text content of the file (truncated to 15000 chars).
        """
        import base64

        data = self._api_get(
            f"https://api.github.com/repos/{owner}/{repo}/contents/{file_path}"
        )
        if data.get("encoding") == "base64" and data.get("content"):
            content = base64.b64decode(data["content"]).decode("utf-8", errors="replace")
            if len(content) > 15000:
                content = content[:15000] + "\n\n... [truncated]"
            return content
        return f"File too large or not text. Size: {data.get('size', 'unknown')} bytes"

    def search_code_in_repo(self, owner: str, repo: str, query: str) -> str:
        """Search for code patterns within a repository.

        Args:
            owner: The GitHub username or organization.
            repo: The repository name.
            query: Search query (e.g. 'class Agent', 'def run', 'import').

        Returns:
            JSON list of matching files with paths and text fragments.
        """
        data = self._api_get(
            "https://api.github.com/search/code",
            params={"q": f"{query} repo:{owner}/{repo}", "per_page": 15},
        )
        results = []
        for item in data.get("items", [])[:15]:
            results.append({
                "file": item["path"],
                "name": item["name"],
                "score": item.get("score"),
            })
        return json.dumps(
            {"total_matches": data.get("total_count", 0), "results": results}, indent=2
        )

    def get_repo_activity(self, owner: str, repo: str) -> str:
        """Get repository activity stats: commit frequency, code frequency, and participation.

        Args:
            owner: The GitHub username or organization.
            repo: The repository name.

        Returns:
            JSON with weekly commit activity and participation stats.
        """
        stats = {}
        try:
            participation = self._api_get(
                f"https://api.github.com/repos/{owner}/{repo}/stats/participation"
            )
            if isinstance(participation, dict):
                stats["weekly_commits_last_year"] = participation.get("all", [])[-12:]
                stats["owner_commits_last_12_weeks"] = participation.get("owner", [])[-12:]
        except Exception:
            stats["weekly_commits"] = "Not available"

        try:
            commit_activity = self._api_get(
                f"https://api.github.com/repos/{owner}/{repo}/stats/commit_activity"
            )
            if isinstance(commit_activity, list) and commit_activity:
                recent = commit_activity[-4:]
                stats["last_4_weeks_total_commits"] = sum(w.get("total", 0) for w in recent)
        except Exception:
            pass

        return json.dumps(stats, indent=2)
