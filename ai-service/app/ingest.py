"""The ingest pipeline: post -> chunks -> embeddings -> vectors.

Node calls this on the publish moment (and again whenever a published post is
edited). Only **published** posts are indexed — a draft is not something a
reader-facing answer should ever be grounded in, and it keeps the corpus equal
to what every role is already allowed to read. Unpublishing or deleting a post
drops its vectors on the same call.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import asdict, dataclass
from typing import Any

from bson import ObjectId
from langchain_core.embeddings import Embeddings
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from . import db, vectorstore
from .chunking import chunk_post, content_hash
from .llm import get_embeddings

log = logging.getLogger("blogforge.ai.ingest")

POST_FIELDS = {"title": 1, "slug": 1, "content": 1, "excerpt": 1, "status": 1, "publishedAt": 1}
_INGEST_CONCURRENCY = 4


@dataclass
class IngestResult:
    post_id: str
    action: str  # indexed | unchanged | removed | not_found
    chunks: int = 0
    title: str = ""

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


@retry(
    reraise=True,
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    retry=retry_if_exception_type(Exception),
)
async def _embed(embedder: Embeddings, texts: list[str]) -> list[list[float]]:
    """Provider calls fail transiently (429s, timeouts); three tries, backing off.

    The embedder is resolved by the caller so a *configuration* error — a missing
    API key — fails on the first attempt instead of being retried three times
    with backoff for a problem no retry can fix.
    """
    return await embedder.aembed_documents(texts)


async def ingest_post(post_id: ObjectId, *, force: bool = False) -> IngestResult:
    # Resolved first: a missing API key should fail before any DB work, and
    # as a ModelConfigError the router can turn into an actionable 503.
    embedder = get_embeddings()

    post = await db.posts().find_one({"_id": post_id}, projection=POST_FIELDS)

    if post is None:
        removed = await vectorstore.delete_post(post_id)
        log.info("post %s is gone — dropped %d chunks", post_id, removed)
        return IngestResult(post_id=str(post_id), action="not_found", chunks=removed)

    if post.get("status") != "published":
        removed = await vectorstore.delete_post(post_id)
        return IngestResult(
            post_id=str(post_id),
            action="removed",
            chunks=removed,
            title=post.get("title", ""),
        )

    digest = content_hash(post.get("title", ""), post.get("content", ""))
    if not force:
        existing = await db.embeddings().find_one({"post": post_id}, projection={"contentHash": 1})
        if existing and existing.get("contentHash") == digest:
            return IngestResult(post_id=str(post_id), action="unchanged", title=post.get("title", ""))

    chunks = chunk_post(post.get("title", ""), post.get("content", ""), post.get("excerpt", ""))
    if not chunks:
        removed = await vectorstore.delete_post(post_id)
        log.warning("post %s produced no chunks — nothing to index", post_id)
        return IngestResult(post_id=str(post_id), action="removed", chunks=removed, title=post.get("title", ""))

    vectors = await _embed(embedder, [chunk.embed_text for chunk in chunks])
    post["contentHash"] = digest
    written = await vectorstore.replace_post_chunks(post, chunks, vectors)

    log.info("indexed post %s (%r) as %d chunks", post_id, post.get("title", ""), written)
    return IngestResult(post_id=str(post_id), action="indexed", chunks=written, title=post.get("title", ""))


async def remove_post(post_id: ObjectId) -> IngestResult:
    removed = await vectorstore.delete_post(post_id)
    return IngestResult(post_id=str(post_id), action="removed", chunks=removed)


async def backfill(*, force: bool = False) -> dict[str, Any]:
    """Index every published post, then drop vectors for anything no longer published.

    This is what makes RAG work on a blog that already had content before the AI
    service existed — and the repair tool when an ingest call was missed because
    the service was down.
    """
    # Fail before the loop: with no API key every post would "fail" identically
    # and the summary would report a hundred errors for one missing setting.
    get_embeddings()

    cursor = db.posts().find({"status": "published"}, projection={"_id": 1})
    post_ids = [doc["_id"] async for doc in cursor]

    semaphore = asyncio.Semaphore(_INGEST_CONCURRENCY)

    async def one(post_id: ObjectId) -> IngestResult:
        async with semaphore:
            try:
                return await ingest_post(post_id, force=force)
            except Exception as err:  # noqa: BLE001 — one bad post must not stop the run
                log.exception("failed to ingest post %s", post_id)
                return IngestResult(post_id=str(post_id), action=f"failed: {err}")

    results = await asyncio.gather(*(one(post_id) for post_id in post_ids))
    pruned = await vectorstore.prune(post_ids)

    summary = {
        "posts_seen": len(post_ids),
        "indexed": sum(1 for r in results if r.action == "indexed"),
        "unchanged": sum(1 for r in results if r.action == "unchanged"),
        "removed": sum(1 for r in results if r.action == "removed"),
        "failed": sum(1 for r in results if r.action.startswith("failed")),
        "chunks_written": sum(r.chunks for r in results if r.action == "indexed"),
        "pruned_orphans": pruned,
    }
    log.info("backfill complete: %s", summary)
    return summary
