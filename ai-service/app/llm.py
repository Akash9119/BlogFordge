"""LangChain model factories.

Two knobs, both from `.env`:

* `EMBEDDING_PROVIDER=openai` (default) uses `OpenAIEmbeddings`. Set
  `OPENAI_BASE_URL` to point the same code at any OpenAI-compatible server
  (Ollama, LM Studio, vLLM) and the whole pipeline runs locally.
* `EMBEDDING_PROVIDER=huggingface` embeds on this machine with
  sentence-transformers — an optional install, so it is imported lazily.
"""

from __future__ import annotations

import logging
from functools import lru_cache

from langchain_core.embeddings import Embeddings
from langchain_core.language_models.chat_models import BaseChatModel

from .config import get_settings

log = logging.getLogger("blogforge.ai.llm")


class ModelConfigError(RuntimeError):
    """Raised when the configured provider cannot be built — surfaced as a 503."""


@lru_cache(maxsize=1)
def get_embeddings() -> Embeddings:
    settings = get_settings()

    if settings.embedding_provider == "huggingface":
        try:
            from langchain_huggingface import HuggingFaceEmbeddings
        except ImportError as err:  # pragma: no cover - optional dependency
            raise ModelConfigError(
                "EMBEDDING_PROVIDER=huggingface needs the optional extras: "
                "pip install langchain-huggingface sentence-transformers"
            ) from err
        log.info("embeddings: huggingface %s", settings.embedding_model)
        return HuggingFaceEmbeddings(model_name=settings.embedding_model)

    if not settings.openai_api_key and not settings.openai_base_url:
        raise ModelConfigError(
            "OPENAI_API_KEY is not set. Add it to ai-service/.env, or point "
            "OPENAI_BASE_URL at a local OpenAI-compatible server."
        )

    from langchain_openai import OpenAIEmbeddings

    log.info("embeddings: openai %s (%d dims)", settings.embedding_model, settings.embedding_dim)
    return OpenAIEmbeddings(
        model=settings.embedding_model,
        api_key=settings.openai_api_key or "not-needed",
        base_url=settings.openai_base_url or None,
        chunk_size=settings.embedding_batch_size,
    )


@lru_cache(maxsize=1)
def get_chat_model() -> BaseChatModel:
    settings = get_settings()

    if not settings.openai_api_key and not settings.openai_base_url:
        raise ModelConfigError(
            "OPENAI_API_KEY is not set. Add it to ai-service/.env, or point "
            "OPENAI_BASE_URL at a local OpenAI-compatible server."
        )

    from langchain_openai import ChatOpenAI

    log.info("chat model: %s", settings.chat_model)
    return ChatOpenAI(
        model=settings.chat_model,
        api_key=settings.openai_api_key or "not-needed",
        base_url=settings.openai_base_url or None,
        temperature=settings.chat_temperature,
        max_tokens=settings.chat_max_tokens,
        timeout=90,
        max_retries=2,
    )


def models_ready() -> tuple[bool, str | None]:
    """Cheap config check for /health — does not call the provider."""
    try:
        get_embeddings()
        get_chat_model()
    except ModelConfigError as err:
        return False, str(err)
    except Exception as err:  # noqa: BLE001
        return False, f"Model initialisation failed: {err}"
    return True, None
