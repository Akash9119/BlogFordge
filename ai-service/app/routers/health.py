"""Liveness and readiness.

`/health` is unauthenticated so a load balancer can poll it; it reports only
whether the service can do its job, never a secret or a connection string.
Corpus counts live here too - they are what the AI Reports screen shows when
the index is empty, which is the difference between a useful message and a
blank panel.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter

from .. import __version__, db, llm, vectorstore
from ..config import get_settings
from ..schemas import HealthResponse, VectorIndexInfo

log = logging.getLogger("blogforge.ai.health")

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    settings = get_settings()
    models_ready, model_error = llm.models_ready()

    database_up = True
    stats: dict = {}
    published_posts = 0
    index_info = {"available": False, "status": "unknown", "name": settings.vector_index_name}

    try:
        await db.get_database().command("ping")
        stats = await vectorstore.stats()
        published_posts = await db.posts().count_documents({"status": "published"})
        index_info = await db.vector_index_status()
    except Exception as err:  # noqa: BLE001
        database_up = False
        log.warning("health check could not reach MongoDB: %s", err)

    return HealthResponse(
        version=__version__,
        ready=database_up and models_ready,
        database=settings.database_name,
        database_up=database_up,
        models_ready=models_ready,
        model_error=model_error,
        embedding_provider=settings.embedding_provider,
        embedding_model=settings.embedding_model,
        chat_model=settings.chat_model,
        search_mode=settings.vector_search_mode,
        vector_index=VectorIndexInfo(**index_info),
        indexed_posts=stats.get("indexed_posts", 0),
        indexed_chunks=stats.get("indexed_chunks", 0),
        published_posts=published_posts,
        last_indexed_at=stats.get("last_indexed_at"),
    )
