"""Request/response contracts.

Everything serialises as camelCase so the payloads drop straight into the Node
envelope and reach React in the same shape as every other BlogForge resource —
one naming convention across three languages, no mapping layer to drift.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

Role = Literal["admin", "editor", "author"]
AssistTask = Literal["summary", "seo", "topics", "improve"]


class Schema(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


# ---------------------------------------------------------------------------
# Shared
# ---------------------------------------------------------------------------


class Scope(Schema):
    """Who is asking, as Node resolved it from the JWT.

    The service never sees a token — it trusts this block precisely because
    nothing but the API can reach the port (see security.py).
    """

    role: Role = "author"
    user_id: str | None = None


class Turn(Schema):
    """One prior exchange, so follow-ups keep the thread."""

    question: str = Field(max_length=2000)
    answer: str = Field(max_length=8000)


class Source(Schema):
    post_id: str
    title: str
    slug: str
    published_at: datetime | None = None
    score: float
    excerpt: str
    chunks: list[int] = []


class RetrievalInfo(Schema):
    strategy: Literal["atlas", "memory", "none"]
    top_k: int
    chunks: int


# ---------------------------------------------------------------------------
# /reports
# ---------------------------------------------------------------------------


class ReportRequest(Schema):
    question: str = Field(min_length=3, max_length=1000)
    scope: Scope = Scope()
    top_k: int | None = Field(default=None, ge=1, le=20)
    include_analytics: bool = True
    days: int = Field(default=30, ge=1, le=365)
    history: list[Turn] = []


class ReportResponse(Schema):
    answer: str
    sources: list[Source]
    grounded: bool
    used_analytics: bool
    analytics: dict[str, Any] | None = None
    retrieval: RetrievalInfo
    model: str
    latency_ms: int


# ---------------------------------------------------------------------------
# /assist
# ---------------------------------------------------------------------------


class TopicIdea(Schema):
    title: str
    angle: str
    why_now: str


class AssistRequest(Schema):
    task: AssistTask
    title: str = Field(default="", max_length=300)
    content: str = Field(default="", max_length=60_000)
    post_id: str | None = None
    scope: Scope = Scope()


class AssistResponse(Schema):
    task: AssistTask
    # summary
    summary: str | None = None
    excerpt: str | None = None
    # seo — the limits mirror the Post model's `seo` sub-document
    meta_title: str | None = None
    meta_description: str | None = None
    keywords: list[str] = []
    # topics
    topics: list[TopicIdea] = []
    # improve
    notes: list[str] = []
    sources: list[Source] = []
    model: str


# ---------------------------------------------------------------------------
# /ingest
# ---------------------------------------------------------------------------


class IngestResponse(Schema):
    post_id: str
    action: str
    chunks: int = 0
    title: str = ""


class BackfillRequest(Schema):
    force: bool = False


class BackfillResponse(Schema):
    posts_seen: int
    indexed: int
    unchanged: int
    removed: int
    failed: int
    chunks_written: int
    pruned_orphans: int


# ---------------------------------------------------------------------------
# /health
# ---------------------------------------------------------------------------


class VectorIndexInfo(Schema):
    available: bool
    status: str
    name: str


class HealthResponse(Schema):
    service: str = "blogforge-ai"
    version: str
    ready: bool
    database: str
    database_up: bool
    models_ready: bool
    model_error: str | None = None
    embedding_provider: str
    embedding_model: str
    chat_model: str
    search_mode: str
    vector_index: VectorIndexInfo
    indexed_posts: int = 0
    indexed_chunks: int = 0
    published_posts: int = 0
    last_indexed_at: datetime | None = None
