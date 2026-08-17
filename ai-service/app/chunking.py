"""Turning a post into embeddable chunks.

Chunking is the one place where retrieval quality is won or lost. Two details
matter here:

1. `RecursiveCharacterTextSplitter` splits on paragraph → line → sentence →
   word boundaries, so a chunk rarely cuts a sentence in half.
2. Each chunk is embedded *with its post title prepended*. A paragraph that
   says "this cut latency in half" is meaningless on its own; with the title
   attached it lands near questions about the thing it describes. Only the
   contextualised text is embedded — the stored `text` stays the raw chunk, so
   the prompt is never padded with repeated titles.
"""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass

from langchain_text_splitters import RecursiveCharacterTextSplitter

from .config import get_settings

_WHITESPACE = re.compile(r"[ \t]+")
_BLANK_LINES = re.compile(r"\n{3,}")


@dataclass(frozen=True)
class Chunk:
    index: int
    text: str
    embed_text: str


def content_hash(title: str, content: str) -> str:
    """Fingerprint of the source text — lets ingest skip unchanged posts."""
    digest = hashlib.sha256()
    digest.update(title.encode("utf-8"))
    digest.update(b"\0")
    digest.update(content.encode("utf-8"))
    return digest.hexdigest()


def normalise(text: str) -> str:
    return _BLANK_LINES.sub("\n\n", _WHITESPACE.sub(" ", text or "")).strip()


def _splitter() -> RecursiveCharacterTextSplitter:
    settings = get_settings()
    return RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        separators=["\n\n", "\n", ". ", "? ", "! ", "; ", ", ", " ", ""],
        keep_separator=True,
    )


def chunk_post(title: str, content: str, excerpt: str = "") -> list[Chunk]:
    """Split one post. The excerpt leads chunk 0 when the author wrote one."""
    body = normalise(content)
    if not body:
        return []

    lead = normalise(excerpt)
    source = f"{lead}\n\n{body}" if lead and lead[:60] not in body[:200] else body

    heading = normalise(title)
    chunks: list[Chunk] = []
    for piece in _splitter().split_text(source):
        text = piece.strip()
        if len(text) < 40:  # a stray heading or sign-off retrieves nothing useful
            continue
        chunks.append(
            Chunk(
                index=len(chunks),
                text=text,
                embed_text=f"{heading}\n\n{text}" if heading else text,
            )
        )
    return chunks
