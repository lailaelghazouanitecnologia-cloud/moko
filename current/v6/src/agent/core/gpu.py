"""
gpu.py — GPU rental service for unlimited local LLM inference.

The user rents a GPU from our server for $1/hr. We handle:
  - Provisioning the GPU
  - Loading the selected model
  - Exposing an OpenAI-compatible endpoint + SSH access

The user picks a model from our catalog, pays $1, and gets:
  - Unlimited tokens for 1 hour
  - An OpenAI-compatible endpoint (works with ava agent automatically)
  - SSH access for direct control if desired

Architecture:
  User → /gpu start <model> → Our API → Provision GPU → Load model
  User ← endpoint_url + ssh credentials ← Our API

  /gpu models     → list available models + GPU requirements
  /gpu start <id> → rent GPU, load model, get endpoint
  /gpu stop       → release GPU, show session summary
  /gpu status     → runtime, tokens, cost, SSH info
  /gpu ssh        → show SSH connection command
"""
from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class GpuStatus(Enum):
    IDLE = "idle"
    PROVISIONING = "provisioning"
    LOADING_MODEL = "loading_model"
    READY = "ready"
    STOPPING = "stopping"
    ERROR = "error"


# ── Model catalog ────────────────────────────────────────────
# Models we offer, with GPU requirements and descriptions.
# These run on our infrastructure — user just picks one.

@dataclass
class GpuModel:
    """A model available in our GPU rental catalog."""
    id: str                  # short ID for CLI
    name: str                # display name
    hf_repo: str             # HuggingFace model ID
    gpu: str                 # GPU type assigned
    vram_gb: int             # VRAM required
    context_window: int      # max context tokens
    description: str         # one-liner
    tags: list[str] = field(default_factory=list)


MODEL_CATALOG = [
    GpuModel(
        id="llama-8b",
        name="Llama 3.1 8B Instruct",
        hf_repo="meta-llama/Llama-3.1-8B-Instruct",
        gpu="RTX 4090", vram_gb=16, context_window=131072,
        description="Fast, efficient. Good for code gen and quick tasks.",
        tags=["fast", "code", "chat"],
    ),
    GpuModel(
        id="qwen-32b",
        name="Qwen 2.5 32B Instruct (AWQ)",
        hf_repo="Qwen/Qwen2.5-32B-Instruct-AWQ",
        gpu="RTX 4090", vram_gb=18, context_window=131072,
        description="Strong reasoning + code. Best value on 4090.",
        tags=["reasoning", "code", "recommended"],
    ),
    GpuModel(
        id="mistral-7b",
        name="Mistral 7B Instruct v0.3",
        hf_repo="mistralai/Mistral-7B-Instruct-v0.3",
        gpu="RTX 4090", vram_gb=14, context_window=32768,
        description="Lightweight, fast responses. Good for simple tasks.",
        tags=["fast", "lightweight"],
    ),
    GpuModel(
        id="llama-70b",
        name="Llama 3.1 70B Instruct",
        hf_repo="meta-llama/Llama-3.1-70B-Instruct",
        gpu="A100 80GB", vram_gb=70, context_window=131072,
        description="Top-tier open model. Near-GPT-4 quality.",
        tags=["premium", "reasoning", "code"],
    ),
    GpuModel(
        id="qwen-72b",
        name="Qwen 2.5 72B Instruct",
        hf_repo="Qwen/Qwen2.5-72B-Instruct",
        gpu="A100 80GB", vram_gb=72, context_window=131072,
        description="Best open model for reasoning and code generation.",
        tags=["premium", "reasoning", "code", "recommended"],
    ),
    GpuModel(
        id="deepseek-v3",
        name="DeepSeek V3 (AWQ)",
        hf_repo="deepseek-ai/DeepSeek-V3-AWQ",
        gpu="A100 80GB", vram_gb=75, context_window=131072,
        description="SOTA open model. Exceptional at code and math.",
        tags=["premium", "code", "math", "sota"],
    ),
]

# Index by ID for fast lookup
_MODEL_INDEX = {m.id: m for m in MODEL_CATALOG}

# Pricing: $1/hr flat rate regardless of GPU
RENTAL_PRICE_PER_HOUR = 1.00


def get_model(model_id: str) -> Optional[GpuModel]:
    """Look up a model by ID."""
    return _MODEL_INDEX.get(model_id)


def list_models() -> list[GpuModel]:
    """Return all available models."""
    return MODEL_CATALOG


# ── GPU Session ──────────────────────────────────────────────

@dataclass
class GpuSession:
    """Active GPU rental session."""
    model: GpuModel
    status: GpuStatus = GpuStatus.IDLE
    # Connection info (provided by our server after provisioning)
    endpoint_url: str = ""          # OpenAI-compatible base URL
    ssh_host: str = ""              # SSH hostname
    ssh_port: int = 22
    ssh_user: str = "user"
    ssh_password: str = ""          # or key-based
    session_id: str = ""            # server-side session ID
    # Timing
    started_at: float = 0.0
    expires_at: float = 0.0         # started_at + 3600 (1 hour)
    # Usage tracking
    tokens_generated: int = 0
    requests_made: int = 0
    error: str = ""

    @property
    def elapsed_minutes(self) -> float:
        if self.started_at == 0:
            return 0.0
        return (time.time() - self.started_at) / 60

    @property
    def remaining_minutes(self) -> float:
        if self.expires_at == 0:
            return 0.0
        remaining = (self.expires_at - time.time()) / 60
        return max(0.0, remaining)

    @property
    def is_expired(self) -> bool:
        return self.expires_at > 0 and time.time() > self.expires_at

    @property
    def ssh_command(self) -> str:
        """SSH command to connect to the GPU."""
        if not self.ssh_host:
            return ""
        port = f" -p {self.ssh_port}" if self.ssh_port != 22 else ""
        return f"ssh {self.ssh_user}@{self.ssh_host}{port}"


# ── GPU Manager ──────────────────────────────────────────────

# Our server API endpoint (configurable via env)
_API_BASE = os.environ.get("AVA_GPU_API", "https://gpu.ava.dev/api/v1")


class GpuManager:
    """Manages GPU rental lifecycle via our server API.

    All GPU provisioning and model loading is handled server-side.
    The client just calls our API to start/stop/status.
    """

    def __init__(self, api_base: str = None, api_key: str = None):
        self.api_base = (api_base or _API_BASE).rstrip("/")
        self.api_key = api_key or os.environ.get("AVA_GPU_KEY", "")
        self.session: Optional[GpuSession] = None

    @property
    def is_active(self) -> bool:
        return (
            self.session is not None
            and self.session.status == GpuStatus.READY
            and not self.session.is_expired
        )

    def start(self, model_id: str) -> GpuSession:
        """Request a GPU session from our server.

        The server will:
          1. Find an available GPU matching the model's requirements
          2. Load the model via vLLM
          3. Return endpoint URL + SSH credentials
        """
        model = get_model(model_id)
        if model is None:
            self.session = GpuSession(
                model=MODEL_CATALOG[0],
                status=GpuStatus.ERROR,
                error=f"Unknown model: {model_id}. Use /gpu models to see available.",
            )
            return self.session

        self.session = GpuSession(
            model=model,
            status=GpuStatus.PROVISIONING,
        )

        try:
            data = self._api_post("/sessions", {
                "model_id": model_id,
                "hf_repo": model.hf_repo,
                "gpu_type": model.gpu,
            })

            self.session.session_id = data.get("session_id", "")
            self.session.endpoint_url = data.get("endpoint_url", "")
            self.session.ssh_host = data.get("ssh_host", "")
            self.session.ssh_port = data.get("ssh_port", 22)
            self.session.ssh_user = data.get("ssh_user", "user")
            self.session.ssh_password = data.get("ssh_password", "")
            self.session.started_at = time.time()
            self.session.expires_at = self.session.started_at + 3600  # 1 hour
            self.session.status = GpuStatus(data.get("status", "ready"))

        except Exception as e:
            self.session.status = GpuStatus.ERROR
            self.session.error = str(e)

        return self.session

    def stop(self) -> str:
        """Stop the active GPU session."""
        if self.session is None:
            return "No active GPU session."

        summary = (
            f"GPU session ended: {self.session.model.name}\n"
            f"  Duration:  {self.session.elapsed_minutes:.1f} min\n"
            f"  Tokens:    {self.session.tokens_generated:,}\n"
            f"  Requests:  {self.session.requests_made}\n"
            f"  Cost:      ${RENTAL_PRICE_PER_HOUR:.2f}"
        )

        # Notify server
        if self.session.session_id:
            try:
                self._api_post(f"/sessions/{self.session.session_id}/stop", {})
            except Exception:
                pass

        self.session = None
        return summary

    def status(self) -> Optional[GpuSession]:
        """Get current session status from server."""
        if self.session is None or not self.session.session_id:
            return self.session

        try:
            data = self._api_get(f"/sessions/{self.session.session_id}")
            self.session.status = GpuStatus(data.get("status", self.session.status.value))
            self.session.endpoint_url = data.get("endpoint_url", self.session.endpoint_url)
            self.session.tokens_generated = data.get("tokens_generated", self.session.tokens_generated)
            self.session.requests_made = data.get("requests_made", self.session.requests_made)
        except Exception:
            pass

        return self.session

    def track_tokens(self, count: int):
        """Track tokens generated in the current session."""
        if self.session:
            self.session.tokens_generated += count
            self.session.requests_made += 1

    # ── API helpers ──────────────────────────────────────────

    def _api_post(self, path: str, payload: dict) -> dict:
        """POST to our GPU server API."""
        import urllib.request
        url = f"{self.api_base}{path}"
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode(),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}",
            },
            method="POST",
        )
        resp = urllib.request.urlopen(req, timeout=30)
        return json.loads(resp.read())

    def _api_get(self, path: str) -> dict:
        """GET from our GPU server API."""
        import urllib.request
        url = f"{self.api_base}{path}"
        req = urllib.request.Request(
            url,
            headers={"Authorization": f"Bearer {self.api_key}"},
        )
        resp = urllib.request.urlopen(req, timeout=15)
        return json.loads(resp.read())
