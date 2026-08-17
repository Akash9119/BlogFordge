"""Ingest routes - called by the Node API, never by a browser.

`POST /ingest/posts/{id}` is the publish hook: Node fires it after a post's
status becomes `published` (and after any edit to an already-published post).
It is idempotent - an unchanged post is a no-op, so a retry costs nothing.
"""

from __future__ import annotations

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, status

from .. import ingest as ingest_service
from ..llm import ModelConfigError
from ..schemas import BackfillRequest, BackfillResponse, IngestResponse
from ..security import require_service_token

router = APIRouter(
    prefix="/ingest",
    tags=["ingest"],
    dependencies=[Depends(require_service_token)],
)


def _object_id(raw: str) -> ObjectId:
    try:
        return ObjectId(raw)
    except (InvalidId, TypeError) as err:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid post id") from err


@router.post("/posts/{post_id}", response_model=IngestResponse)
async def ingest_post(post_id: str, force: bool = False) -> IngestResponse:
    try:
        result = await ingest_service.ingest_post(_object_id(post_id), force=force)
    except ModelConfigError as err:
        # Node logs this against the publish that triggered it, so the reason has
        # to be the real one — "OPENAI_API_KEY is not set", not "500".
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(err)) from err
    return IngestResponse(**result.as_dict())


@router.delete("/posts/{post_id}", response_model=IngestResponse)
async def remove_post(post_id: str) -> IngestResponse:
    result = await ingest_service.remove_post(_object_id(post_id))
    return IngestResponse(**result.as_dict())


@router.post("/backfill", response_model=BackfillResponse)
async def backfill(request: BackfillRequest | None = None) -> BackfillResponse:
    try:
        summary = await ingest_service.backfill(force=bool(request and request.force))
    except ModelConfigError as err:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(err)) from err
    return BackfillResponse(**summary)
