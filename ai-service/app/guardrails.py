"""The topical gate in front of generation.

The system prompt already tells the model to refuse anything the retrieved
context does not cover. That is a request, not a guarantee: a prompt can be
argued with, and either way the refusal costs a full chat completion. This
module makes the obvious case deterministic and free — a question that is
plainly not about this blog is turned away before a single token is bought.

There are two ways past the gate, because AI Reports answers two kinds of
question:

* **Content** — "what have we written about caching?" — clears the gate when
  retrieval found a chunk that actually resembles the question.
* **Metrics** — "which post earned the most reads last month?" — no paragraph in
  any post contains that answer, so retrieval legitimately comes back empty.
  Those clear the gate on vocabulary instead: the question is *about* the blog
  even when nothing in the corpus matches it.

The gate is deliberately permissive. A question that slips through costs one
cheap call and still meets the system prompt, which refuses it; a question
wrongly refused is a feature that looks broken. So this catches "how do I make
tea", not every edge case — it is the cheap first layer, not the only one.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass

log = logging.getLogger("blogforge.ai.guardrails")

_WORD = re.compile(r"[a-z][a-z'-]*")

# Vocabulary that means "this question is about a blog, its content, or its
# traffic". It is matched against the question alone, so each term has to carry
# the signal by itself — hence nouns from this product's own domain rather than
# general words like "best" or "most", which sit just as happily in "the best
# way to brew tea". Stemming is not worth a dependency here; the handful of
# forms people actually type are listed instead.
#
# A few entries are looser than the rest — "article", "author", "title", "write"
# all turn up in ordinary English, and "write" invites "write me a poem". They
# stay in: they are genuine signals for a real question about the blog, and a
# false pass costs one cheap call that the system prompt then refuses, while a
# false refusal costs the user a working feature.
BLOG_VOCABULARY = frozenset(
    """
    analytics archive archived article articles audience author authors blog
    blogs bounce byline bylines category categories cms comment commenter
    commenters comments content coverage covered draft drafts editor editorial
    editors engagement excerpt excerpts headline headlines impression impressions
    keyword keywords metric metrics pageview pageviews performance performing
    popular popularity post posts publish published publishing read reader
    readers readership reading reads seo series session sessions slug slugs stat
    stats statistic statistics subscriber subscribers tag tagged tags taxonomy
    title titles topic topics traffic trend trending trends unpublished view
    viewed views visitor visitors write writes writing written wrote
    """.split()
)

OFF_TOPIC_ANSWER = (
    "That question is outside what AI Reports can answer.\n\n"
    "This assistant only reports on **this blog** — the posts it has published "
    "and the traffic they earned. It has no general knowledge to draw on, so a "
    "question about anything else has nothing to ground an answer in.\n\n"
    "Try asking about your content or your numbers — for example, *what have we "
    "published about this topic*, or *which posts earned the most reads last "
    "month*."
)


@dataclass(frozen=True)
class Verdict:
    """Whether a question may reach the model, and why — the reason is logged."""

    on_topic: bool
    reason: str


def assess(question: str, top_score: float | None, floor: float) -> Verdict:
    """Decide whether `question` is about this blog at all.

    `top_score` is the best retrieval score, on the same 0–1 scale both search
    paths report (see `vectorstore._memory_search`), or None when nothing was
    retrieved. `floor` is the score below which a match is treated as noise —
    top-k always returns *something*, so a bare "we got results" proves nothing.
    """
    if top_score is not None and top_score >= floor:
        return Verdict(True, f"retrieval matched (score {top_score:.3f} >= {floor:.3f})")

    matched = sorted(_terms(question) & BLOG_VOCABULARY)
    if matched:
        return Verdict(True, f"blog vocabulary: {', '.join(matched[:5])}")

    best = "none" if top_score is None else f"{top_score:.3f}"
    return Verdict(False, f"no vocabulary match and best retrieval score {best} < {floor:.3f}")


def _terms(question: str) -> set[str]:
    return set(_WORD.findall(question.lower()))
