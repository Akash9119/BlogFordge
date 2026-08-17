"""AI assistance for the editor: summaries, SEO, topic ideas, editorial notes.

The third capability of the AI layer. Summary/SEO/improve work on the draft in
front of the author, so they need no retrieval. Topic ideas *do* - a suggestion
is only useful if it knows what this blog has already covered - so that task
runs the same retrieval path as a report and returns its sources.

Every field limit here mirrors the Mongoose schema in Backend/src/models/Post.js
(excerpt 300, seo.metaTitle 70, seo.metaDescription 160). A suggestion the
editor cannot save is not a suggestion.
"""

from __future__ import annotations

import logging
from typing import TypeVar

from pydantic import BaseModel, Field

from . import retrieval
from .config import get_settings
from .llm import get_chat_model
from .schemas import AssistRequest, AssistResponse, TopicIdea

log = logging.getLogger("blogforge.ai.assist")

T = TypeVar("T", bound=BaseModel)

EXCERPT_LIMIT = 300
META_TITLE_LIMIT = 70
META_DESCRIPTION_LIMIT = 160
MAX_SOURCE_CONTENT = 24_000

BASE_SYSTEM = (
    "You are an editorial assistant inside BlogForge, a blogging CMS. You work "
    "on the author's own draft. Never invent facts the draft does not contain, "
    "never pad, and never use emoji. Write in the draft's own voice."
)


# ---------------------------------------------------------------------------
# Structured outputs - one schema per task, so the model cannot drift
# ---------------------------------------------------------------------------


class SummaryOut(BaseModel):
    summary: str = Field(description="3-5 sentence summary of what the post actually says.")
    excerpt: str = Field(
        description=f"A standalone teaser for listing cards, at most {EXCERPT_LIMIT} characters."
    )


class SeoOut(BaseModel):
    meta_title: str = Field(description=f"Search title, at most {META_TITLE_LIMIT} characters.")
    meta_description: str = Field(
        description=f"Search snippet, at most {META_DESCRIPTION_LIMIT} characters."
    )
    keywords: list[str] = Field(default_factory=list, description="3-8 lowercase search terms.")


class ImproveOut(BaseModel):
    notes: list[str] = Field(
        description="3-6 specific, actionable edits. Each names the problem and the fix."
    )


class TopicsOut(BaseModel):
    topics: list[TopicIdea] = Field(description="3-5 post ideas.")


async def run(request: AssistRequest) -> AssistResponse:
    task = request.task
    model_name = get_settings().chat_model

    if task == "topics":
        return await _topics(request, model_name)

    content = request.content.strip()[:MAX_SOURCE_CONTENT]
    if not content:
        raise ValueError("This task needs the draft's content.")

    draft = f"TITLE: {request.title.strip() or '(untitled)'}\n\nCONTENT:\n{content}"

    if task == "summary":
        result = await _structured(
            SummaryOut,
            f"{BASE_SYSTEM} Summarise the draft below.",
            draft,
        )
        return AssistResponse(
            task=task,
            summary=result.summary.strip(),
            excerpt=_clip(result.excerpt, EXCERPT_LIMIT),
            model=model_name,
        )

    if task == "seo":
        result = await _structured(
            SeoOut,
            (
                f"{BASE_SYSTEM} Write search metadata for the draft below. Lead the "
                "title with the term a reader would actually search for. The "
                "description must read as a promise the post keeps, not a summary "
                "of the summary."
            ),
            draft,
        )
        return AssistResponse(
            task=task,
            meta_title=_clip(result.meta_title, META_TITLE_LIMIT),
            meta_description=_clip(result.meta_description, META_DESCRIPTION_LIMIT),
            keywords=[k.strip().lower() for k in result.keywords if k.strip()][:8],
            model=model_name,
        )

    result = await _structured(
        ImproveOut,
        (
            f"{BASE_SYSTEM} Review the draft below as a line editor. Point at real "
            "weaknesses - a claim with no support, a buried lead, a section that "
            "repeats another. Skip generic writing advice."
        ),
        draft,
    )
    return AssistResponse(
        task=task,
        notes=[note.strip() for note in result.notes if note.strip()],
        model=model_name,
    )


async def _topics(request: AssistRequest, model_name: str) -> AssistResponse:
    """Topic ideas grounded in what this blog has already published."""
    seed = (request.title.strip() or request.content.strip()[:500]) or "what should we publish next"
    retrieved = await retrieval.retrieve(seed, top_k=None)

    context = retrieved.context or "(nothing published on this topic yet)"
    result = await _structured(
        TopicsOut,
        (
            f"{BASE_SYSTEM} Propose the next posts for this blog. You are shown "
            "excerpts of what it has ALREADY published. Do not propose a post that "
            "duplicates one of them - propose the follow-up, the gap, or the "
            "counter-argument. Each idea needs a concrete angle, not a topic label."
        ),
        f"ALREADY PUBLISHED\n{context}\n\nTHE AUTHOR IS THINKING ABOUT\n{seed}",
    )

    return AssistResponse(
        task="topics",
        topics=result.topics[:5],
        sources=retrieved.sources,
        model=model_name,
    )


async def _structured(schema: type[T], system: str, user: str) -> T:
    model = get_chat_model().with_structured_output(schema)
    return await model.ainvoke(
        [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ]
    )


def _clip(text: str, limit: int) -> str:
    """The model is asked for a limit and usually respects it. Usually is not enough."""
    condensed = " ".join(text.split())
    if len(condensed) <= limit:
        return condensed
    cut = condensed[:limit]
    boundary = cut.rfind(" ")
    return (cut[:boundary] if boundary > limit * 0.6 else cut).rstrip(" ,;:-")
