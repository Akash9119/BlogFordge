"""The AI Reports endpoint - the product's differentiator.

Node has already verified the JWT and resolved the caller's role before this is
reached; the `scope` block on the request carries that decision through so
retrieval and analytics stay inside the same RBAC boundary the REST API
enforces.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from .. import rag
from ..llm import ModelConfigError
from ..schemas import ReportRequest, ReportResponse
from ..security import require_service_token

log = logging.getLogger("blogforge.ai.reports")

router = APIRouter(
    prefix="/reports",
    tags=["reports"],
    dependencies=[Depends(require_service_token)],
)


@router.post("", response_model=ReportResponse)
async def create_report(request: ReportRequest) -> ReportResponse:
    try:
        return await rag.answer(request)
    except ModelConfigError as err:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(err)) from err
    except Exception as err:  # noqa: BLE001
        log.exception("report generation failed")
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            "The language model did not return an answer. Try again.",
        ) from err
