"""MongoDB access.

The AI service talks to the *same* cluster and database as the Node API — one
cluster, one `blogforge` DB. It reads `posts`/`analytics`/`users` and owns the
`embeddings` collection (the vector store).
"""

from __future__ import annotations

import inspect
import logging
from typing import Any

from pymongo import AsyncMongoClient
from pymongo.asynchronous.collection import AsyncCollection
from pymongo.asynchronous.database import AsyncDatabase

from .config import get_settings

log = logging.getLogger("blogforge.ai.db")

_client: AsyncMongoClient | None = None
_database: AsyncDatabase | None = None


async def connect() -> AsyncDatabase:
    """Open the pool and make sure our own indexes exist."""
    global _client, _database
    settings = get_settings()

    if _database is not None:
        return _database

    _client = AsyncMongoClient(
        settings.mongodb_uri,
        serverSelectionTimeoutMS=10_000,
        appname="blogforge-ai",
    )
    await _client.admin.command("ping")
    _database = _client[settings.database_name]
    log.info("connected to MongoDB database %r", settings.database_name)

    await _ensure_indexes(_database)
    return _database


async def disconnect() -> None:
    global _client, _database
    if _client is not None:
        # PyMongo renamed the async closer to `aclose()`; keep both working.
        closer = getattr(_client, "aclose", None) or _client.close
        result = closer()
        if inspect.isawaitable(result):
            await result
    _client, _database = None, None


def get_database() -> AsyncDatabase:
    if _database is None:
        raise RuntimeError("Database not connected — call connect() during startup")
    return _database


def embeddings() -> AsyncCollection:
    return get_database()[get_settings().embeddings_collection]


def posts() -> AsyncCollection:
    return get_database()["posts"]


def analytics() -> AsyncCollection:
    return get_database()["analytics"]


def users() -> AsyncCollection:
    return get_database()["users"]


async def _ensure_indexes(database: AsyncDatabase) -> None:
    settings = get_settings()
    collection = database[settings.embeddings_collection]

    # One document per (post, chunk) — re-ingesting a post replaces its chunks.
    await collection.create_index([("post", 1), ("chunkIndex", 1)], unique=True, name="post_chunk_unique")
    await collection.create_index([("post", 1)], name="post_idx")
    await collection.create_index([("contentHash", 1)], name="content_hash_idx")

    if settings.vector_search_mode != "memory":
        await ensure_vector_index(collection)


async def ensure_vector_index(collection: AsyncCollection) -> bool:
    """Create the Atlas Vector Search index if the deployment supports it.

    Non-fatal by design: a local mongod (or a tier without Search) simply has no
    such index, and retrieval falls back to in-memory cosine similarity.
    """
    settings = get_settings()
    try:
        existing = [index async for index in await collection.list_search_indexes()]
        if any(index.get("name") == settings.vector_index_name for index in existing):
            return True

        await collection.create_search_index(
            {
                "name": settings.vector_index_name,
                "type": "vectorSearch",
                "definition": {
                    "fields": [
                        {
                            "type": "vector",
                            "path": "embedding",
                            "numDimensions": settings.embedding_dim,
                            "similarity": "cosine",
                        },
                        {"type": "filter", "path": "post"},
                    ]
                },
            }
        )
        log.info(
            "requested Atlas vector index %r (it builds in the background)",
            settings.vector_index_name,
        )
        return True
    except Exception as err:  # noqa: BLE001 — any failure just means "no Atlas index"
        log.warning(
            "could not ensure Atlas vector index %r (%s) — retrieval will use "
            "in-memory cosine similarity",
            settings.vector_index_name,
            err,
        )
        return False


async def vector_index_status() -> dict[str, Any]:
    """What the /health endpoint reports about the vector index."""
    settings = get_settings()
    try:
        indexes = [index async for index in await embeddings().list_search_indexes()]
        match = next((i for i in indexes if i.get("name") == settings.vector_index_name), None)
        if match is None:
            return {"available": False, "status": "missing", "name": settings.vector_index_name}
        return {
            "available": match.get("status") == "READY" and bool(match.get("queryable", True)),
            "status": match.get("status", "UNKNOWN"),
            "name": settings.vector_index_name,
        }
    except Exception:  # noqa: BLE001
        return {"available": False, "status": "unsupported", "name": settings.vector_index_name}
