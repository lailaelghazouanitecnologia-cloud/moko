"""
LLM Provider abstraction — uniform interface over Groq, Anthropic, OpenAI.

Inspired by Cline's ApiHandler pattern: each provider implements createMessage()
returning an async stream. Here we use sync streaming for CLI simplicity.
"""

import os
import sys
import time
from dataclasses import dataclass, field
from typing import Iterator


@dataclass
class LLMMessage:
    role: str       # "system" | "user" | "assistant"
    content: str


@dataclass
class LLMUsage:
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    elapsed_s: float = 0.0
    tokens_per_sec: float = 0.0
    is_estimated: bool = True    # True if tokens are estimated, False if from API


@dataclass
class LLMResponse:
    content: str
    usage: LLMUsage
    model: str
    provider: str


# Default models per provider
_DEFAULT_MODELS = {
    "groq": "moonshotai/kimi-k2-instruct-0905",
    "anthropic": "claude-sonnet-4-20250514",
    "openai": "gpt-4o",
}

# Environment variable names per provider
_ENV_KEYS = {
    "groq": "GROQ_API_KEY",
    "anthropic": "ANTHROPIC_API_KEY",
    "openai": "OPENAI_API_KEY",
}

# Model capabilities — context window and max output per model
_MODEL_CAPS = {
    # Groq
    "moonshotai/kimi-k2-instruct-0905": {"context": 262144, "max_output": 16384},
    "moonshotai/kimi-k2-instruct": {"context": 131072, "max_output": 16384},
    "llama-3.3-70b-versatile": {"context": 131072, "max_output": 32768},
    "meta-llama/llama-4-scout-17b-16e-instruct": {"context": 131072, "max_output": 8192},
    "qwen/qwen3-32b": {"context": 131072, "max_output": 40960},
    "llama-3.1-8b-instant": {"context": 131072, "max_output": 131072},
    "openai/gpt-oss-120b": {"context": 131072, "max_output": 65536},
    # Anthropic
    "claude-sonnet-4-20250514": {"context": 200000, "max_output": 8192},
    "claude-opus-4-20250514": {"context": 200000, "max_output": 8192},
    # OpenAI
    "gpt-4o": {"context": 128000, "max_output": 16384},
    "gpt-4o-mini": {"context": 128000, "max_output": 16384},
}

# Default caps for unknown models
_DEFAULT_CAPS = {"context": 32000, "max_output": 4096}


class LLMProvider:
    """Uniform interface over Groq, Anthropic, OpenAI.

    Usage:
        llm = LLMProvider("groq")
        response = llm.complete([LLMMessage("user", "hello")])
        print(response.content)

        # Or stream:
        for chunk in llm.stream([LLMMessage("user", "hello")]):
            print(chunk, end="", flush=True)
    """

    def __init__(self, provider: str = "groq", model: str = None,
                 base_url: str = None):
        self.provider = provider
        self.model = model or _DEFAULT_MODELS.get(provider, "")
        self._client = None
        self._caps = _MODEL_CAPS.get(self.model, _DEFAULT_CAPS)
        self._base_url = base_url  # for local/GPU endpoints

    @property
    def context_window(self) -> int:
        """Total context window size in tokens."""
        return self._caps["context"]

    @property
    def max_output(self) -> int:
        """Maximum output tokens the model can generate."""
        return self._caps["max_output"]

    def safe_max_tokens(self, requested: int) -> int:
        """Clamp requested max_tokens to model's actual limit."""
        return min(requested, self.max_output)

    def _get_client(self):
        """Lazy init — only create client when first needed."""
        if self._client is not None:
            return self._client

        # Local provider doesn't need an API key
        if self.provider == "local":
            api_key = "not-needed"
        else:
            api_key = os.environ.get(_ENV_KEYS.get(self.provider, ""), "")
            if not api_key:
                raise ValueError(
                    f"Missing {_ENV_KEYS.get(self.provider, '???')} environment variable. "
                    f"Export it: export {_ENV_KEYS.get(self.provider, 'API_KEY')}=..."
                )

        if self.provider == "local":
            # Local vLLM/Ollama endpoint — OpenAI-compatible, no API key needed
            from openai import OpenAI
            base = self._base_url or "http://localhost:8000/v1"
            self._client = OpenAI(api_key="not-needed", base_url=base)
        elif self.provider == "groq":
            from groq import Groq
            self._client = Groq(api_key=api_key)
        elif self.provider == "anthropic":
            import anthropic
            self._client = anthropic.Anthropic(api_key=api_key)
        elif self.provider == "openai":
            from openai import OpenAI
            self._client = OpenAI(api_key=api_key)
        else:
            raise ValueError(f"Unknown provider: {self.provider}")

        return self._client

    def complete(self, messages: list[LLMMessage], temperature: float = 0.6,
                 max_tokens: int = 4096) -> LLMResponse:
        """Send messages and return complete response with real token usage."""
        # Use non-streaming for accurate token counts
        return self.complete_with_usage(messages, temperature, max_tokens)

    def complete_with_usage(self, messages: list[LLMMessage], temperature: float = 0.6,
                            max_tokens: int = 4096) -> LLMResponse:
        """Complete and capture real usage from API (non-streaming for accuracy)."""
        t0 = time.time()

        if self.provider in ("groq", "openai", "local"):
            return self._complete_openai_compat(messages, temperature, max_tokens, t0)
        elif self.provider == "anthropic":
            return self._complete_anthropic(messages, temperature, max_tokens, t0)
        else:
            # Fallback to streaming with estimated tokens
            return self._complete_streaming_fallback(messages, temperature, max_tokens, t0)

    def stream(self, messages: list[LLMMessage], temperature: float = 0.6,
               max_tokens: int = 4096) -> Iterator[str]:
        """Yield content chunks for live display."""
        if self.provider in ("groq", "openai", "local"):
            yield from self._stream_openai_compat(messages, temperature, max_tokens)
        elif self.provider == "anthropic":
            yield from self._stream_anthropic(messages, temperature, max_tokens)

    def _complete_streaming_fallback(self, messages, temperature, max_tokens, t0) -> LLMResponse:
        """Fallback: stream and estimate tokens."""
        chunks = list(self.stream(messages, temperature, max_tokens))
        content = "".join(chunks)
        elapsed = time.time() - t0
        usage = LLMUsage(
            elapsed_s=round(elapsed, 2),
            completion_tokens=len(content) // 4,
            prompt_tokens=sum(len(m.content) for m in messages) // 4,
            is_estimated=True,
        )
        usage.total_tokens = usage.prompt_tokens + usage.completion_tokens
        if elapsed > 0:
            usage.tokens_per_sec = round(usage.completion_tokens / elapsed, 1)
        return LLMResponse(content=content, usage=usage, model=self.model, provider=self.provider)

    # ── OpenAI-compatible streaming (Groq, OpenAI) ──────────────

    def _stream_openai_compat(self, messages, temperature, max_tokens) -> Iterator[str]:
        client = self._get_client()
        api_messages = [{"role": m.role, "content": m.content} for m in messages]

        # Retry with exponential backoff for transient errors
        last_error = None
        for attempt in range(4):
            try:
                completion = client.chat.completions.create(
                    model=self.model,
                    messages=api_messages,
                    temperature=temperature,
                    max_completion_tokens=max_tokens,
                    stream=True,
                )
                for chunk in completion:
                    if chunk.choices and chunk.choices[0].delta.content:
                        yield chunk.choices[0].delta.content
                return
            except Exception as e:
                last_error = e
                err_str = str(e)
                if any(s in err_str for s in ["503", "500", "over capacity", "overloaded", "DNS", "timeout", "rate"]):
                    wait = 2 ** (attempt + 1)
                    print(f"\n  [retry] Model overloaded, waiting {wait}s... (attempt {attempt+1}/4)", file=sys.stderr)
                    time.sleep(wait)
                else:
                    raise
        raise last_error

    def _complete_openai_compat(self, messages, temperature, max_tokens, t0) -> LLMResponse:
        client = self._get_client()
        api_messages = [{"role": m.role, "content": m.content} for m in messages]

        # Retry with exponential backoff
        last_error = None
        for attempt in range(4):
            try:
                completion = client.chat.completions.create(
                    model=self.model,
                    messages=api_messages,
                    temperature=temperature,
                    max_completion_tokens=max_tokens,
                    stream=False,
                )
                break
            except Exception as e:
                last_error = e
                err_str = str(e)
                if any(s in err_str for s in ["503", "500", "over capacity", "overloaded", "DNS", "timeout", "rate"]):
                    wait = 2 ** (attempt + 1)
                    print(f"\n  [retry] Model overloaded, waiting {wait}s... (attempt {attempt+1}/4)", file=sys.stderr)
                    time.sleep(wait)
                else:
                    raise
        else:
            raise last_error

        elapsed = time.time() - t0
        content = completion.choices[0].message.content or ""

        usage = LLMUsage(elapsed_s=round(elapsed, 2), is_estimated=False)
        if completion.usage:
            usage.prompt_tokens = completion.usage.prompt_tokens or 0
            usage.completion_tokens = completion.usage.completion_tokens or 0
            usage.total_tokens = completion.usage.total_tokens or 0
        else:
            # Fallback to estimate
            usage.prompt_tokens = sum(len(m.content) for m in messages) // 4
            usage.completion_tokens = len(content) // 4
            usage.total_tokens = usage.prompt_tokens + usage.completion_tokens
            usage.is_estimated = True

        if elapsed > 0 and usage.completion_tokens:
            usage.tokens_per_sec = round(usage.completion_tokens / elapsed, 1)

        return LLMResponse(content=content, usage=usage, model=self.model, provider=self.provider)

    # ── Anthropic streaming ─────────────────────────────────────

    def _stream_anthropic(self, messages, temperature, max_tokens) -> Iterator[str]:
        client = self._get_client()

        system = ""
        api_messages = []
        for m in messages:
            if m.role == "system":
                system = m.content
            else:
                api_messages.append({"role": m.role, "content": m.content})

        with client.messages.stream(
            model=self.model,
            system=system,
            messages=api_messages,
            temperature=temperature,
            max_tokens=max_tokens,
        ) as stream:
            for text in stream.text_stream:
                yield text

    def _complete_anthropic(self, messages, temperature, max_tokens, t0) -> LLMResponse:
        client = self._get_client()

        system = ""
        api_messages = []
        for m in messages:
            if m.role == "system":
                system = m.content
            else:
                api_messages.append({"role": m.role, "content": m.content})

        response = client.messages.create(
            model=self.model,
            system=system,
            messages=api_messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )

        elapsed = time.time() - t0
        content = response.content[0].text if response.content else ""

        usage = LLMUsage(
            elapsed_s=round(elapsed, 2),
            prompt_tokens=response.usage.input_tokens if response.usage else 0,
            completion_tokens=response.usage.output_tokens if response.usage else 0,
            is_estimated=False,
        )
        usage.total_tokens = usage.prompt_tokens + usage.completion_tokens
        if elapsed > 0 and usage.completion_tokens:
            usage.tokens_per_sec = round(usage.completion_tokens / elapsed, 1)

        return LLMResponse(content=content, usage=usage, model=self.model, provider=self.provider)
