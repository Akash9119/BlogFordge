"""Editor assistance: summaries, SEO metadata, topic ideas, editorial notes."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from .. import assist as assist_service
from ..llm import ModelConfigError
from ..schemas import AssistRequest, AssistResponse
from ..security import require_service_token

log = logging.getLogger("blogforge.ai.assist")

router = APIRouter(
    prefix="/assist",
    tags=["assist"],
    dependencies=[Depends(require_service_token)],
)


@router.post("", response_model=AssistResponse)
async def assist(request: AssistRequest) -> AssistResponse:
    try:
        return await assist_service.run(request)
    except ValueError as err:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(err)) from err
    except ModelConfigError as err:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(err)) from err
    except Exception as err:  # noqa: BLE001
        log.exception("assist task %r failed", request.task)
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            "The language model did not return a suggestion. Try again.",
        ) from err
