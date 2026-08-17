"""BlogForge AI service - FastAPI + LangChain RAG microservice.

    uvicorn main:app --reload

This process is **not** public-facing. The Node API is the single auth boundary
for the whole product: it verifies the JWT, applies RBAC, then proxies here with
a shared service token. Consequently there is no CORS middleware and no user
model in this codebase - a browser is never supposed to reach this port. Bind it
to localhost in development, and to a private network in production.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app import __version__, db
from app.config import get_settings
from app.routers import assist, health, ingest, reports
from app.security import verify_startup_config

settings = get_settings()

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger("blogforge.ai")


@asynccontextmanager
async def lifespan(_: FastAPI):
    verify_startup_config()
    await db.connect()
    log.info(
        "AI service ready - embeddings=%s:%s chat=%s search=%s",
        settings.embedding_provider,
        settings.embedding_model,
        settings.chat_model,
        settings.vector_search_mode,
    )
    yield
    await db.disconnect()
    log.info("AI service stopped")


app = FastAPI(
    title="BlogForge AI Service",
    description=(
        "RAG over the blog's own published posts and analytics. Internal only - "
        "reached through the Node API, never directly by a client."
    ),
    version=__version__,
    lifespan=lifespan,
    docs_url="/docs" if not settings.is_production else None,
    redoc_url=None,
)

app.include_router(health.router)
app.include_router(ingest.router)
app.include_router(reports.router)
app.include_router(assist.router)


@app.exception_handler(Exception)
async def unhandled_exception(request: Request, err: Exception) -> JSONResponse:
    """Mask internals, log the truth - the same contract the Node API keeps."""
    log.exception("unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal error in the AI service"})


if __name__ == "__main__":  # pragma: no cover
    import uvicorn

    uvicorn.run("main:app", host=settings.ai_host, port=settings.ai_port, reload=True)
