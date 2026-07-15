# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

BlogForge has completed **Phase 1 (Backend)**: `Backend/` contains the full Express 5 + Mongoose 9 API (auth, RBAC, posts, taxonomy, comments, media, analytics — see `Backend/README.md` for endpoints and setup). `Frontend/` holds a Vite + React + TypeScript scaffold. The AI microservice (`ai-service/`) does not exist yet.

## Commands

```bash
# Node/Express API (JavaScript, CommonJS)
cd Backend && npm install && npm run dev   # nodemon dev server
npm run seed:admin                          # create/promote the first admin (ADMIN_* vars in .env)
npm start                                   # production

# React frontend (Vite + TS)
cd Frontend && npm install && npm run dev

# Python AI microservice (Phase 3 — not yet created)
cd ai-service && pip install -r requirements.txt && uvicorn main:app --reload
```

## Architecture

Three clients → one Node/Express API → MongoDB Atlas + Cloudinary + FastAPI AI service.

- **Admin Dashboard** (React) — content management, publish workflow, analytics UI
- **Public Site** (React) — read-only published posts, SEO-friendly slugs
- **WordPress Plugin** (React in WP admin) — pulls content from the same API over REST (headless pattern)
- **Node/Express API** — the single auth boundary; all three clients talk only to this
- **FastAPI + LangChain AI service** — never public-facing; Node proxies to it, so auth is enforced at one layer

**Why two backends:** the CMS is transactional CRUD (Node's strength); the AI layer needs the Python ecosystem (LangChain, embeddings, tokenizers) and scales independently.

## Data Model

Single MongoDB cluster, single database `blogforge`:

| Collection       | Key design notes                                        |
|------------------|---------------------------------------------------------|
| `users`          | RBAC roles: `admin` / `editor` / `author`              |
| `posts`          | Draft/publish/archive status + slug                    |
| `categories`     | Taxonomy for posts                                      |
| `tags`           | Taxonomy for posts                                      |
| `comments`       | **Referenced** (not embedded) — unbounded growth       |
| `media`          | Cloudinary upload records                               |
| `analytics`      | Per-post engagement with daily rollups                 |
| `embeddings`     | Vector chunks for RAG (Atlas Vector Search or Chroma)  |
| `refresh_tokens` | Revocable refresh-token store                          |

## Auth

Unified JWT system shared across all three clients: short-lived access token + revocable refresh token. Passwords hashed with bcrypt/argon2. Node enforces RBAC middleware; the AI service is never called directly by clients.

## AI / RAG Layer

Three capabilities, all served by the FastAPI microservice:

1. **AI Reports** — natural-language questions answered over your own blog content and analytics
2. **RAG pipeline** — on publish: chunk → embed → store vectors (Atlas Vector Search, Chroma, or Qdrant); on query: embed question → retrieve top-k chunks → assemble prompt → LLM answers grounded in retrieved context → return answer + source citations
3. **AI assistance** — content suggestions, post summaries, and SEO recommendations

## Environment Variables

Each service needs its own `.env`. Expected keys:
- `MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `OPENAI_API_KEY` (or local embedding model config)

## API Design

All endpoints return a standardized response envelope. Listing endpoints support pagination, filtering, and text search. The Node API proxies AI requests so the FastAPI service has no public route.

## Development Roadmap

Build order is **backend → frontend → GenAI** so each layer rests on a tested foundation.

**Phase 1 — Backend**
- Project setup, Express server, MongoDB Atlas connection
- Mongoose models: `users`, `posts`, `categories`, `tags`
- Password hashing + JWT auth (register / login / refresh)
- Auth middleware + RBAC middleware
- Standardized response envelope + global error handler
- Posts CRUD + slug generation + draft→publish workflow
- Listing: pagination, filtering, text search
- Media (Cloudinary), comments, analytics endpoints

**Phase 2 — Frontend**
- Admin Dashboard: auth, post editor, publish workflow, media upload
- Category/tag management + analytics views
- Public Site: published post listing + single-post pages (SEO slugs)
- Shared JWT auth wired across both clients

**Phase 3 — GenAI**
- FastAPI service skeleton + Node proxy route
- Ingest pipeline: chunk posts, generate embeddings, store vectors
- Retrieval: embed query, fetch top-k relevant chunks
- RAG end-to-end: retrieve → augment → generate grounded answers + sources
- "AI Reports" dashboard UI

**Phase 4 — Cross-platform & polish**
- WordPress plugin consuming the public REST API
- AI content suggestions / SEO recommendations
- Bug fixes, edge-case validation, deployment
