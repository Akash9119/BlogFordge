"""Retrieval: question -> embedding -> top-k chunks -> a citable context block.

Chunks are grouped back into *posts* before numbering, so a citation like [2]
points at something a reader can click. The prompt and the `sources` array the
UI renders therefore share one numbering — a citation can never refer to a post
that is missing from the source list.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

from . import vectorstore
from .config import get_settings
from .llm import get_embeddings
from .schemas import Source
from .vectorstore import Match

log = logging.getLogger("blogforge.ai.retrieval")

EXCERPT_CHARS = 220


@dataclass
class Retrieved:
    sources: list[Source] = field(default_factory=list)
    context: str = ""
    strategy: str = "none"
    chunk_count: int = 0
    # Best score seen, before the context budget dropped anything — the
    # guardrail asks "did anything here actually match", which is a question
    # about the search, not about what survived the prompt budget.
    top_score: float | None = None

    @property
    def is_empty(self) -> bool:
        return self.chunk_count == 0


async def retrieve(question: str, top_k: int | None = None) -> Retrieved:
    settings = get_settings()
    k = top_k or settings.retrieval_top_k

    query_vector = await get_embeddings().aembed_query(question)
    matches, strategy = await vectorstore.search(query_vector, k)

    matches = [m for m in matches if m.score >= settings.retrieval_min_score]
    if not matches:
        return Retrieved(strategy=strategy)

    top_score = max(m.score for m in matches)
    grouped = _group_by_post(matches)
    sources, blocks, used_chars, chunk_count = [], [], 0, 0

    for position, (post_id, post_matches) in enumerate(grouped.items(), start=1):
        best = post_matches[0]
        body = "\n\n".join(m.text for m in sorted(post_matches, key=lambda m: m.chunk_index))

        # Prompt budget: stop adding posts once the context is full rather than
        # truncating mid-sentence and citing a source the model never saw.
        if used_chars + len(body) > settings.max_context_chars and blocks:
            break

        published = best.published_at.strftime("%Y-%m-%d") if best.published_at else "unpublished"
        blocks.append(f'[{position}] "{best.title}" (slug: {best.slug}, published: {published})\n{body}')
        used_chars += len(body)
        chunk_count += len(post_matches)

        sources.append(
            Source(
                post_id=post_id,
                title=best.title,
                slug=best.slug,
                published_at=best.published_at,
                score=best.score,
                excerpt=_excerpt(best.text),
                chunks=sorted(m.chunk_index for m in post_matches),
            )
        )

    log.info(
        "retrieved %d chunks across %d posts via %s (top score %.3f)",
        chunk_count,
        len(sources),
        strategy,
        top_score,
    )
    return Retrieved(
        sources=sources,
        context="\n\n---\n\n".join(blocks),
        strategy=strategy,
        chunk_count=chunk_count,
        top_score=top_score,
    )


def _group_by_post(matches: list[Match]) -> dict[str, list[Match]]:
    """Preserve relevance order: posts appear in the order their best chunk did."""
    grouped: dict[str, list[Match]] = {}
    for match in matches:
        grouped.setdefault(match.post_id, []).append(match)
    for post_matches in grouped.values():
        post_matches.sort(key=lambda m: m.score, reverse=True)
    return grouped


def _excerpt(text: str) -> str:
    condensed = " ".join(text.split())
    if len(condensed) <= EXCERPT_CHARS:
        return condensed
    cut = condensed[:EXCERPT_CHARS]
    boundary = cut.rfind(" ")
    return f"{cut[:boundary] if boundary > 80 else cut}..."
