# BlogForge AI Service (Phase 3 — GenAI)

FastAPI + LangChain microservice providing the RAG layer: **AI Reports**
(natural-language questions answered over your own posts and analytics),
the **ingest pipeline** (chunk → embed → store vectors), and **AI assistance**
(summaries, SEO metadata, topic ideas, editorial notes).

> **This service is never public-facing.** It has no CORS, no user model, and no
> JWT verification, because it is never reached by a browser. The Node API is the
> single auth boundary: it verifies the token, applies RBAC, then proxies here
> with a shared secret. Bind it to loopback in development and to a private
> network in production.

## Setup

```bash
cd ai-service
python -m venv .venv
.venv/Scripts/activate          # Windows;  source .venv/bin/activate on macOS/Linux
pip install -r requirements.txt

cp .env.example .env            # fill in MONGODB_URI, AI_SERVICE_TOKEN, OPENAI_API_KEY
python main.py                  # or: uvicorn main:app --reload
```

Requires Python 3.11+. Interactive API docs at `/docs` (disabled when `ENV=production`).

`MONGODB_URI` must point at the **same cluster and database** as the Node API —
one cluster, one `blogforge` DB. `AI_SERVICE_TOKEN` must match the value in
`Backend/.env`.

## Endpoints

All of them except `/health` require the `X-AI-Service-Token` header.

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness, model config, vector-index state, corpus counts |
| POST | `/reports` | The RAG question → grounded answer + source citations |
| POST | `/assist` | `summary` · `seo` · `topics` · `improve` |
| POST | `/ingest/posts/{id}` | Index one post (the publish hook). Idempotent |
| DELETE | `/ingest/posts/{id}` | Drop one post's vectors |
| POST | `/ingest/backfill` | Index every published post, prune orphans |

Payloads serialise as **camelCase**, so they pass through the Node envelope to
React unchanged. Schemas live in `app/schemas.py`.

## How a report is produced

```
question ──> embed ──> top-k chunks ─┐
                                     ├──> prompt ──> LLM ──> answer + [n] citations
analytics aggregations (RBAC-scoped) ┘
```

1. **Retrieve** — the question is embedded and matched against chunks of the
   blog's published posts. Chunks are grouped back into posts before numbering,
   so a citation `[2]` always points at something a reader can open.
2. **Augment** — retrieved excerpts are paired with a compact block of measured
   facts from the same aggregations the analytics dashboard runs. "Summarise
   engagement trends" is not a retrieval question; no paragraph contains that
   answer, so the numbers have to come from the rollups.
3. **Generate** — the system prompt allows exactly two sources of truth and makes
   refusal the cheap option. If the context does not cover the question, saying
   so is the correct answer.
4. **Cite** — citations are parsed out of the answer, uncited sources are
   dropped, and the rest are renumbered so `[n]` and the source list can never
   disagree.

**Only published posts are indexed.** A draft is not something a grounded answer
should quote, and it keeps the corpus equal to what every role may already read.
Archiving, unpublishing, or deleting a post removes its vectors.

## RBAC

The service has no user model — it trusts the `scope` block Node sends, because
nothing but Node can reach the port. Retrieval is over published content, which
is readable by everyone; `scope` decides whose **analytics** an answer may draw
on, along exactly the line `GET /analytics/overview` already draws:

| Role | Analytics in scope |
|---|---|
| `admin`, `editor` | The whole blog |
| `author` | Their own posts only |

## Vector store

Vectors live in the `embeddings` collection of the shared `blogforge` database —
one document per (post, chunk), with the source post, slug, title, and a content
hash so re-ingesting an unchanged post is a no-op.

Retrieval prefers **Atlas Vector Search** and falls back to brute-force cosine
similarity in Python. The service creates the Atlas index itself on startup when
the deployment supports it; if it does not (a local `mongod`, a tier without
Search), the fallback keeps the feature working rather than dark.

`VECTOR_SEARCH_MODE` controls this:

| Value | Behaviour |
|---|---|
| `auto` *(default)* | Atlas when its index answers, cosine scan otherwise — including when Atlas returns **nothing**, which is what a still-building index does |
| `atlas` | Require the Atlas index; fail loudly if it is missing |
| `memory` | Always brute-force. Fine for a few thousand chunks |

## Models

| Setting | Default | Notes |
|---|---|---|
| `EMBEDDING_PROVIDER` | `openai` | or `huggingface` for local embeddings (optional extras) |
| `EMBEDDING_MODEL` | `text-embedding-3-small` | 1536 dims — keep `EMBEDDING_DIM` in step |
| `CHAT_MODEL` | `gpt-4o-mini` | any chat model the provider serves |
| `OPENAI_BASE_URL` | *(unset)* | point at Ollama / LM Studio / vLLM to run entirely locally |

Changing the embedding model changes the vector space: re-embed everything with
`npm run ai:reindex -- --force` from `Backend/`, and update the Atlas index's
`numDimensions` if the size changed.

## Operations

```bash
# From Backend/ — repairs anything the publish hook missed
npm run ai:reindex
npm run ai:reindex -- --force     # re-embed everything (costs tokens)
```

Ingest normally happens on publish. A backfill is needed when the blog already
had published posts before this service existed, or when the service was down
while something was published.

## Layout

```
main.py                 FastAPI app + lifespan (uvicorn main:app)
app/
  config.py             settings from .env
  security.py           the shared-token guard — the only gate here
  db.py                 Mongo connection, index creation, vector-index status
  llm.py                LangChain embedding/chat factories (provider switch)
  chunking.py           RecursiveCharacterTextSplitter + content hashing
  vectorstore.py        the `embeddings` collection: write, delete, search
  ingest.py             post -> chunks -> embeddings -> vectors
  retrieval.py          question -> top-k chunks -> citable context block
  analytics.py          RBAC-scoped metrics, rendered for the prompt
  rag.py                retrieve -> augment -> generate -> resolve citations
  assist.py             summaries, SEO, topic ideas, editorial notes
  schemas.py            request/response contracts (camelCase)
  routers/              health, ingest, reports, assist
```
