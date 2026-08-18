"""Settings for the AI service.

Every value is read from `ai-service/.env` (see `.env.example`). The service is
never public-facing — Node proxies to it — so there is no CORS config here on
purpose: the only caller is the API, and it authenticates with a shared token.
"""

from functools import lru_cache
from typing import Literal
from urllib.parse import urlsplit

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # --- Runtime -----------------------------------------------------------
    env: Literal["development", "production"] = "development"
    log_level: str = "INFO"
    # Bind address for `python main.py`. Keep it on loopback (or a private
    # network) — this service must never be reachable from the internet.
    ai_host: str = "127.0.0.1"
    ai_port: int = 8000

    # --- Auth: the shared secret Node sends on every call ------------------
    ai_service_token: str = ""

    # --- Database: the same cluster/DB the Node API uses -------------------
    mongodb_uri: str
    mongodb_db: str = ""
    embeddings_collection: str = "embeddings"

    # --- Vector search -----------------------------------------------------
    # auto   → use Atlas $vectorSearch when the index answers, else cosine in memory
    # atlas  → require Atlas $vectorSearch (fail loudly if the index is missing)
    # memory → always brute-force cosine (fine for a few thousand chunks)
    vector_search_mode: Literal["auto", "atlas", "memory"] = "auto"
    vector_index_name: str = "blogforge_vector_index"
    # Ceiling on the brute-force fallback: how many chunks to pull into memory.
    memory_scan_limit: int = 5_000

    # --- Models ------------------------------------------------------------
    embedding_provider: Literal["openai", "huggingface"] = "openai"
    openai_api_key: str = ""
    # Point this at any OpenAI-compatible server (Ollama, LM Studio, vLLM) to
    # run the whole pipeline locally.
    openai_base_url: str = ""

    embedding_model: str = "text-embedding-3-small"
    embedding_dim: int = 1536
    embedding_batch_size: int = 64

    chat_model: str = "gpt-4o-mini"
    chat_temperature: float = 0.2
    chat_max_tokens: int = 1200

    # --- Chunking (LangChain RecursiveCharacterTextSplitter) ---------------
    chunk_size: int = 1000
    chunk_overlap: int = 200

    # --- Retrieval / prompt budget -----------------------------------------
    retrieval_top_k: int = 6
    retrieval_max_k: int = 20
    retrieval_min_score: float = 0.0
    max_context_chars: int = 12_000
    max_question_chars: int = 1_000
    max_history_turns: int = 6

    # --- Guardrail: refuse off-topic questions before they cost a call ------
    # Top-k always returns *something*, so "we got results" proves nothing. A
    # question whose best chunk scores below this floor, and which uses none of
    # the blog vocabulary in guardrails.py, is refused without calling the model.
    # Both search paths report the same 0-1 scale, where 0.5 means unrelated.
    # Every refusal logs the score it saw, so this is tunable from real traffic.
    guardrail_enabled: bool = True
    relevance_floor: float = 0.62

    @property
    def is_production(self) -> bool:
        return self.env == "production"

    @property
    def database_name(self) -> str:
        """`MONGODB_DB`, else the database in the URI, else `blogforge`.

        One cluster, one database — the same `blogforge` the Node API writes to.
        """
        if self.mongodb_db:
            return self.mongodb_db
        path = urlsplit(self.mongodb_uri.replace("mongodb+srv://", "mongodb://", 1)).path
        return path.lstrip("/").split("?")[0] or "blogforge"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
