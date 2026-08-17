"""The vector store: the `embeddings` collection in the shared `blogforge` DB.

Retrieval takes the Atlas `$vectorSearch` path when the deployment has the
index, and falls back to brute-force cosine similarity in Python when it does
not (a local mongod, a tier without Search, or an index still building). The
fallback is honest rather than clever — for a blog's worth of chunks it is
milliseconds, and it means the feature is never dark just because an index is
missing.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Iterable, Sequence

import numpy as np
from bson import ObjectId
from pymongo import DeleteMany, InsertOne

from . import db
from .chunking import Chunk
from .config import get_settings

log = logging.getLogger("blogforge.ai.vectorstore")


@dataclass
class Match:
    post_id: str
    title: str
    slug: str
    chunk_index: int
    text: str
    score: float
    published_at: datetime | None


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Writes
# ---------------------------------------------------------------------------


async def replace_post_chunks(
    post: dict[str, Any],
    chunks: Sequence[Chunk],
    vectors: Sequence[Sequence[float]],
) -> int:
    """Swap a post's vectors for a fresh set, atomically enough for our needs.

    Delete-then-insert in one bulk write: the unique (post, chunkIndex) index
    would reject a partial overwrite, and a re-ingest can produce a different
    number of chunks than last time.
    """
    settings = get_settings()
    stamp = _now()
    post_id = post["_id"]

    operations: list[Any] = [DeleteMany({"post": post_id})]
    for chunk, vector in zip(chunks, vectors, strict=True):
        operations.append(
            InsertOne(
                {
                    "post": post_id,
                    "postTitle": post.get("title", ""),
                    "postSlug": post.get("slug", ""),
                    "chunkIndex": chunk.index,
                    "text": chunk.text,
                    "embedding": [float(value) for value in vector],
                    "model": settings.embedding_model,
                    "dim": len(vector),
                    "contentHash": post["contentHash"],
                    "publishedAt": post.get("publishedAt"),
                    "createdAt": stamp,
                    "updatedAt": stamp,
                }
            )
        )

    await db.embeddings().bulk_write(operations, ordered=True)
    return len(chunks)


async def delete_post(post_id: ObjectId) -> int:
    result = await db.embeddings().delete_many({"post": post_id})
    return result.deleted_count


async def prune(keep_post_ids: Iterable[ObjectId]) -> int:
    """Drop vectors for posts that are gone or no longer published."""
    result = await db.embeddings().delete_many({"post": {"$nin": list(keep_post_ids)}})
    return result.deleted_count


# ---------------------------------------------------------------------------
# Reads
# ---------------------------------------------------------------------------


async def indexed_hashes() -> dict[ObjectId, str]:
    """post _id → the contentHash currently indexed, so ingest can skip no-ops."""
    cursor = await db.embeddings().aggregate(
        [{"$group": {"_id": "$post", "contentHash": {"$first": "$contentHash"}}}]
    )
    return {doc["_id"]: doc.get("contentHash", "") async for doc in cursor}


async def stats() -> dict[str, Any]:
    collection = db.embeddings()
    chunks = await collection.count_documents({})
    distinct_posts = await collection.distinct("post")
    newest = await collection.find_one({}, sort=[("updatedAt", -1)], projection={"updatedAt": 1})
    return {
        "indexed_posts": len(distinct_posts),
        "indexed_chunks": chunks,
        "last_indexed_at": newest.get("updatedAt") if newest else None,
        "embedding_model": get_settings().embedding_model,
    }


async def search(
    query_vector: Sequence[float],
    top_k: int,
    post_ids: Sequence[ObjectId] | None = None,
) -> tuple[list[Match], str]:
    """Top-k nearest chunks. Returns the matches and which strategy produced them.

    In `auto` mode an *empty* Atlas result falls through to the cosine scan, not
    just a failed one. An index that is still building answers successfully with
    zero rows — indistinguishable from "no match" at the call site, and the
    difference between a working feature and a silently dead one.
    """
    mode = get_settings().vector_search_mode

    if mode != "memory":
        try:
            matches = await _atlas_search(query_vector, top_k, post_ids)
            if matches or mode == "atlas":
                return matches, "atlas"
            log.info("Atlas $vectorSearch returned nothing — verifying with a cosine scan")
        except Exception as err:  # noqa: BLE001
            if mode == "atlas":
                raise
            log.warning("Atlas $vectorSearch unavailable (%s) — falling back to cosine scan", err)

    return await _memory_search(query_vector, top_k, post_ids), "memory"


async def _atlas_search(
    query_vector: Sequence[float],
    top_k: int,
    post_ids: Sequence[ObjectId] | None,
) -> list[Match]:
    settings = get_settings()
    stage: dict[str, Any] = {
        "index": settings.vector_index_name,
        "path": "embedding",
        "queryVector": [float(value) for value in query_vector],
        "numCandidates": max(top_k * 20, 150),
        "limit": top_k,
    }
    if post_ids:
        stage["filter"] = {"post": {"$in": list(post_ids)}}

    pipeline = [
        {"$vectorSearch": stage},
        {"$set": {"score": {"$meta": "vectorSearchScore"}}},
        {"$unset": ["embedding"]},
    ]
    cursor = await db.embeddings().aggregate(pipeline)
    return [_to_match(doc, doc.get("score", 0.0)) async for doc in cursor]


async def _memory_search(
    query_vector: Sequence[float],
    top_k: int,
    post_ids: Sequence[ObjectId] | None,
) -> list[Match]:
    settings = get_settings()
    query = np.asarray(query_vector, dtype=np.float32)
    query_norm = float(np.linalg.norm(query)) or 1.0

    selector: dict[str, Any] = {}
    if post_ids:
        selector["post"] = {"$in": list(post_ids)}

    cursor = db.embeddings().find(selector).limit(settings.memory_scan_limit)
    scored: list[tuple[float, dict[str, Any]]] = []
    async for doc in cursor:
        vector = doc.get("embedding")
        if not vector or len(vector) != query.size:
            continue  # a stale chunk from a different embedding model
        candidate = np.asarray(vector, dtype=np.float32)
        denominator = query_norm * (float(np.linalg.norm(candidate)) or 1.0)
        cosine = float(np.dot(query, candidate) / denominator)
        # Atlas reports cosine as (1 + cos) / 2 in [0, 1]; match it so a
        # score threshold means the same thing on either path.
        scored.append(((1.0 + cosine) / 2.0, doc))

    scored.sort(key=lambda pair: pair[0], reverse=True)
    return [_to_match(doc, score) for score, doc in scored[:top_k]]


def _to_match(doc: dict[str, Any], score: float) -> Match:
    return Match(
        post_id=str(doc["post"]),
        title=doc.get("postTitle", ""),
        slug=doc.get("postSlug", ""),
        chunk_index=int(doc.get("chunkIndex", 0)),
        text=doc.get("text", ""),
        score=round(float(score), 4),
        published_at=doc.get("publishedAt"),
    )
