"""The single gate in front of this service.

Node is the auth boundary for the whole product: it verifies the JWT, applies
RBAC, and only then proxies here. This service therefore does not know about
users or tokens — it only checks that the caller is the API, using a shared
secret. In production the secret is mandatory; without it the service refuses
to start.
"""

import hmac
import logging

from fastapi import Header, HTTPException, status

from .config import get_settings

log = logging.getLogger("blogforge.ai.security")

SERVICE_TOKEN_HEADER = "X-AI-Service-Token"


def verify_startup_config() -> None:
    settings = get_settings()
    if settings.is_production and not settings.ai_service_token:
        raise RuntimeError(
            "AI_SERVICE_TOKEN must be set in production — it is the only thing "
            "standing between this service and anyone who can reach its port."
        )
    if not settings.ai_service_token:
        log.warning(
            "AI_SERVICE_TOKEN is empty — every caller is accepted. Fine on "
            "localhost, never anywhere else."
        )


async def require_service_token(
    x_ai_service_token: str | None = Header(default=None, alias=SERVICE_TOKEN_HEADER),
) -> None:
    expected = get_settings().ai_service_token
    if not expected:
        return  # dev-only: unset secret disables the check (warned about at startup)

    if not x_ai_service_token or not hmac.compare_digest(x_ai_service_token, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing service token",
        )
