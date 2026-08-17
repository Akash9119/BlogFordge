<div align="center">

# 🔨 BlogForge

### An AI-powered blogging CMS built on the MERN stack with a GenAI (RAG) layer.

*Not a toy CRUD app — a system that mirrors real production patterns: API design, unified auth, role-based access, scalable aggregation, and applied Retrieval-Augmented Generation grounded in your own content.*

<br>

![Stack](https://img.shields.io/badge/stack-MERN-61DAFB?style=for-the-badge)
![AI](https://img.shields.io/badge/AI-LangChain%20%2B%20RAG-1C3C3C?style=for-the-badge)
![Backend](https://img.shields.io/badge/backend-Node%20%2B%20FastAPI-339933?style=for-the-badge)
![Status](https://img.shields.io/badge/status-in%20development-yellow?style=for-the-badge)

</div>

---

## 📖 Overview

**BlogForge** is a content management system with **three frontends** backed by **one core API** and a **dedicated AI microservice**:

- 🖥️ **Admin Dashboard** — content management, the draft/publish workflow, and analytics.
- 🌐 **Public Site** — where published blogs are read.
- 🔌 **WordPress Plugin** — lets external WordPress sites pull content from the same CMS over REST (headless pattern).

A single **unified JWT authentication system** secures access across all three. The standout feature is **AI Reports**: a RAG pipeline that answers natural-language questions about *your own* blog data — *"summarize engagement trends"* or *"suggest topics based on top-performing posts"* — grounded in retrieval over your content, not generic LLM output.

---

## ✨ Features

### Core CMS
- 📝 **Blog post CRUD** with a rich-text / markdown editor
- 🗂️ **Categories & tags** taxonomy
- 🖼️ **Media uploads** via Cloudinary
- 📋 **Draft / publish / archive** workflow
- 🔐 **Role-based access control** — `admin` / `editor` / `author`
- 💬 **Comments** with threading and moderation
- 📄 **Pagination, search & filtering**
- 📊 **Analytics** — engagement tracking with daily rollups
- 📦 **Standardized API response envelope** across every endpoint

### Authentication
- 🎟️ **Unified JWT auth** — single login, shared across dashboard, public site, and WP plugin
- ♻️ **Access + refresh tokens** — short-lived access, revocable refresh
- 🛡️ **Role-aware permissions** enforced consistently server-side

### 🤖 AI Layer — *the differentiator*
- 🧠 **AI Reports** — natural-language insights over your blog content & analytics
- 🔍 **RAG pipeline** — vector embeddings + retrieval, so answers are *grounded in your own data*
- ✍️ **AI assistance** — content suggestions, summaries, and SEO recommendations
- 🐍 Built with **FastAPI + LangChain** as an independently deployable microservice

---

## 🏗️ Architecture

```
                          ┌─────────────────────┐
                          │   Admin Dashboard    │   React
                          │  (CRUD + analytics)  │
                          └──────────┬───────────┘
                                     │
   ┌──────────────────┐   ┌──────────▼───────────┐   ┌─────────────────────┐
   │   Public Site    │──▶│   Node/Express API   │◀──│  WordPress Plugin    │
   │   (read blogs)   │   │   (REST — the core)  │   │  (React in WP admin) │
   └──────────────────┘   └──────────┬───────────┘   └─────────────────────┘
                                     │
                ┌────────────────────┼────────────────────┐
                │                    │                     │
        ┌───────▼──────┐    ┌────────▼────────┐   ┌────────▼─────────┐
        │   MongoDB    │    │   Cloudinary    │   │  FastAPI + Lang  │
        │   (Atlas)    │    │  (media files)  │   │  Chain (AI svc)  │
        └──────────────┘    └─────────────────┘   └────────┬─────────┘
                                                           │
                                                  ┌────────▼─────────┐
                                                  │   Vector store    │
                                                  │ (Atlas Vector     │
                                                  │  Search / Chroma) │
                                                  └───────────────────┘
```

**Why two backends?** The CMS is transactional CRUD — Node/Express is the right tool. The AI layer needs the Python ecosystem (LangChain, embeddings, tokenizers), so it lives in a separate FastAPI microservice that scales independently. Node always sits in front of the AI service, so there's **one auth boundary** and the AI service is never public-facing.

---

## 🧰 Tech Stack

| Layer            | Technology                                          |
|------------------|-----------------------------------------------------|
| **Frontend**     | React (Admin Dashboard, Public Site, WP Plugin)     |
| **Core Backend** | Node.js, Express                                    |
| **Database**     | MongoDB (Atlas) — one cluster, one DB               |
| **AI Service**   | FastAPI, LangChain                                  |
| **Vector Store** | Atlas Vector Search *(or Chroma / Qdrant)*          |
| **Media**        | Cloudinary                                          |
| **Auth**         | JWT (access + refresh), bcrypt/argon2               |

---

## 🗄️ Data Model

One cluster, one database (`blogforge`), these collections:

| Collection        | Purpose                                  |
|-------------------|------------------------------------------|
| `users`           | Accounts + roles (RBAC)                  |
| `posts`           | Blog posts (drafts + published)          |
| `categories`      | Category taxonomy                        |
| `tags`            | Tag taxonomy                             |
| `comments`        | Reader comments (referenced, threaded)   |
| `media`           | Cloudinary upload records                |
| `analytics`       | Per-post engagement (daily rollups)      |
| `embeddings`      | Vector chunks for RAG                     |
| `refresh_tokens`  | Revocable refresh-token store (optional) |

> **One cluster, one DB** — a cluster is a scaling/isolation boundary, and this project has no isolation need, so more would be pure overhead. Comments are **referenced, not embedded** (unbounded growth + the 16 MB document limit). Full reasoning lives in the design doc.

---

## 🛣️ Development Roadmap

This project is built in three phases — **backend first, then frontend, then GenAI** — so each layer rests on a tested foundation before the next is added.

### 🟦 Phase 1 — Backend (the spine)
> *A working, authenticated API before any UI exists.*
- [x] Project setup, Express server, MongoDB Atlas connection
- [x] Mongoose models: `users`, `posts`, `categories`, `tags`
- [x] Password hashing + JWT auth (register / login / refresh)
- [x] Auth middleware + RBAC middleware
- [x] Standardized response envelope + global error handler
- [x] Posts CRUD + slug generation + draft→publish workflow
- [x] Listing: pagination, filtering, text search
- [x] Media (Cloudinary), comments, analytics endpoints

### 🟩 Phase 2 — Frontend (make it usable)
> *Everything the backend can do, now through a real UI.*
- [x] Admin Dashboard — auth, post editor, publish workflow, media upload
- [x] Category / tag management + analytics views
- [x] Public Site — published post listing + single-post pages (SEO slugs)
- [x] Shared JWT auth wired across both clients

### 🟪 Phase 3 — GenAI (the differentiator)
> *The RAG layer that makes this more than a CRUD app — built last, on top of real content.*
- [x] FastAPI service skeleton + Node proxy route
- [x] Ingest pipeline — chunk posts, generate embeddings, store vectors
- [x] Retrieval — embed query, fetch top-k relevant chunks
- [x] RAG end-to-end — retrieve → augment → generate grounded answers + sources
- [x] "AI Reports" dashboard UI

### 🔌 Phase 4 — Cross-platform & polish
- [ ] WordPress plugin consuming the public REST API
- [ ] AI content suggestions / SEO recommendations
- [ ] Bug fixes, edge-case validation, deployment

> **Why backend → frontend → GenAI?** Auth and the data model are the foundation everything else depends on, so they come first. The UI can't be built against an API that doesn't exist. And RAG is built *last* because it ingests real blog content — it needs posts to embed before it has anything to retrieve.

---

## 🔄 How the AI Reports Work (RAG)

**Ingest (on publish):** each post is split into chunks → each chunk is embedded → vectors are stored with a reference back to the source post.

**Query (on demand):**
1. The user's question is embedded.
2. The top-k most similar chunks are retrieved from the vector store.
3. Those chunks + the question are assembled into a prompt.
4. The LLM answers using *only* the retrieved context — grounded in the user's own data.
5. The answer is returned along with the source posts it drew from.

> **Why RAG instead of a bare LLM call?** A plain LLM knows nothing about *your* posts and will hallucinate. RAG grounds every answer in your actual content and analytics — which is the entire value of the feature.

---

## 🚀 Getting Started

> Setup instructions will be added as each phase lands.

```bash
# Clone
git clone https://github.com/<you>/blogforge.git
cd blogforge

# 1. Backend — the REST API (Node 20+)
cd Backend && npm install
cp .env.example .env          # MONGODB_URI, JWT secrets, Cloudinary keys
npm run seed:admin            # creates the first admin from the ADMIN_* vars
npm run dev

# 2. AI service — the RAG microservice (Python 3.11+)
cd ../ai-service && python -m venv .venv && .venv/Scripts/activate
pip install -r requirements.txt
cp .env.example .env          # same MONGODB_URI, matching AI_SERVICE_TOKEN, OPENAI_API_KEY
python main.py

# 3. Frontend — the SPA
cd ../Frontend && npm install && npm run dev

# Index existing posts for RAG (only needed once, for posts published
# before the AI service was connected)
cd ../Backend && npm run ai:reindex
```

**Environment variables** — every service ships a tracked `.env.example`:

| Service | Keys |
|---|---|
| `Backend/` | `MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CLOUDINARY_*`, `AI_SERVICE_URL`, `AI_SERVICE_TOKEN` |
| `ai-service/` | `MONGODB_URI` *(same DB)*, `AI_SERVICE_TOKEN` *(same value)*, `OPENAI_API_KEY`, `EMBEDDING_MODEL`, `CHAT_MODEL` |
| `Frontend/` | none required — Vite proxies `/api` to the backend in dev |

Leaving `AI_SERVICE_URL` empty disables the `/ai/*` routes; the rest of the API is
unaffected. `OPENAI_API_KEY` can be swapped for `OPENAI_BASE_URL` pointed at a
local OpenAI-compatible server (Ollama, LM Studio, vLLM) to run the AI layer
entirely on your own machine. Full detail: [`ai-service/README.md`](ai-service/README.md).

---

## 📌 Project Status

**Phases 1–3 are complete** — the API, both frontends, and the RAG layer are built and wired end to end.
Phase 4 (WordPress plugin, AI suggestions in the editor, deployment) is what remains.

---

<div align="center">

*Built to demonstrate full-stack range — frontend, backend, plugin development, and applied GenAI — in one cohesive product.*

</div># BlogFordge
