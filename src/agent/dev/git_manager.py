"""
GitManager — thin wrapper around subprocess for git branch operations.

Used by the BranchPipelineOrchestrator to create/merge branches
for each module in the generation pipeline.
"""
from __future__ import annotations

import subprocess
from pathlib import Path
from typing import Optional


class GitError(Exception):
    """Git operation failed."""
    pass


class GitManager:
    """Real git branch operations for a project directory."""

    def __init__(self, project_dir: Path, verbose: bool = False):
        self.project_dir = Path(project_dir)
        self.verbose = verbose

    def _log(self, msg: str):
        if self.verbose:
            print(f"  [git] {msg}")

    def _run(self, *args: str, check: bool = True) -> subprocess.CompletedProcess:
        """Run a git command in the project directory."""
        cmd = ["git"] + list(args)
        self._log(f"$ {' '.join(cmd)}")
        try:
            result = subprocess.run(
                cmd, cwd=self.project_dir,
                capture_output=True, text=True, timeout=30,
            )
            if check and result.returncode != 0:
                raise GitError(
                    f"git {args[0]} failed (rc={result.returncode}): "
                    f"{result.stderr.strip()}"
                )
            return result
        except subprocess.TimeoutExpired:
            raise GitError(f"git {args[0]} timed out")

    def init_repo(self) -> None:
        """Initialize a git repo with an initial commit if .git doesn't exist."""
        if (self.project_dir / ".git").exists():
            self._log("repo already initialized")
            return
        self.project_dir.mkdir(parents=True, exist_ok=True)
        self._run("init")
        # Create initial commit so branches have a base
        gitignore = self.project_dir / ".gitignore"
        if not gitignore.exists():
            gitignore.write_text("node_modules/\ndist/\n")
        self._run("add", "-A")
        self._run("commit", "-m", "initial commit", "--allow-empty")
        self._log("repo initialized with initial commit")

    def current_branch(self) -> str:
        """Get the current branch name."""
        result = self._run("rev-parse", "--abbrev-ref", "HEAD")
        return result.stdout.strip()

    def create_branch(self, name: str, from_branch: str = "main") -> None:
        """Create and checkout a new branch from the given base."""
        self._run("checkout", "-b", name, from_branch)
        self._log(f"created branch {name} from {from_branch}")

    def checkout(self, branch: str) -> None:
        """Checkout an existing branch."""
        self._run("checkout", branch)

    def commit_all(self, message: str) -> str:
        """Stage all changes and commit. Returns the commit hash."""
        self._run("add", "-A")
        # Check if there's anything to commit
        status = self._run("status", "--porcelain")
        if not status.stdout.strip():
            self._log("nothing to commit")
            return ""
        self._run("commit", "-m", message)
        result = self._run("rev-parse", "HEAD")
        commit_hash = result.stdout.strip()
        self._log(f"committed: {commit_hash[:8]} — {message}")
        return commit_hash

    def merge(self, source: str, into: str = "main",
              message: str = "") -> bool:
        """Merge source branch into target. Returns success."""
        self.checkout(into)
        msg = message or f"merge {source} into {into}"
        result = self._run("merge", source, "--no-ff", "-m", msg, check=False)
        if result.returncode != 0:
            self._log(f"merge failed: {result.stderr.strip()}")
            # Abort the failed merge
            self._run("merge", "--abort", check=False)
            return False
        self._log(f"merged {source} into {into}")
        return True

    def delete_branch(self, name: str) -> None:
        """Delete a local branch."""
        self._run("branch", "-d", name, check=False)

    def has_uncommitted(self) -> bool:
        """Check if there are uncommitted changes."""
        result = self._run("status", "--porcelain")
        return bool(result.stdout.strip())

    def get_file_at_branch(self, branch: str, file_path: str) -> Optional[str]:
        """Read a file's content from a specific branch without checking it out."""
        result = self._run("show", f"{branch}:{file_path}", check=False)
        if result.returncode != 0:
            return None
        return result.stdout

    def branch_exists(self, name: str) -> bool:
        """Check if a branch exists locally."""
        result = self._run("branch", "--list", name, check=False)
        return bool(result.stdout.strip())

    def ensure_main_branch(self) -> None:
        """Ensure 'main' branch exists (rename 'master' if needed)."""
        current = self.current_branch()
        if current == "master":
            self._run("branch", "-m", "master", "main")
            self._log("renamed master -> main")
