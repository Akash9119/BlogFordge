# BlogForge — Frontend

React 19 + TypeScript + Vite SPA for the BlogForge CMS. Built to `design_guide.md`,
which is the source of truth for tokens, type, states, and copy — read it before
changing anything visual.

Two surfaces, one codebase, one set of tokens:

- **The Reader** (`/`) — the public blog. Calm, editorial, reading-first.
- **The Workshop** (`/workshop`) — the authenticated dashboard. Dense, tool-like.

## Setup

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc -b && vite build
npm run lint
```

The dev server proxies `/api` and `/health` to `http://127.0.0.1:5050` (the API's
dev port — 5000 is reserved on Windows). Override with `VITE_API_TARGET`. For a
deployed API on another origin, set `VITE_API_URL` to its full `/api/v1` base.

Start the API first (`cd ../Backend && npm run dev`), or every screen shows its
error state.

## Stack

| Concern | Choice |
|---|---|
| Routing | React Router v7 |
| Server state | TanStack Query |
| Styling | CSS custom properties + CSS Modules |
| Post content | Markdown (`react-markdown` + `remark-gfm`) |
| Charts | Hand-rolled inline SVG — no chart library |

## Layout

```
src/
  styles/          tokens.css (§2–§4 of the guide) + base.css reset
  lib/             api client, token store, types, formatters, RBAC capabilities
  api/             one typed module per API resource
  context/         AuthProvider; *-context.ts holds the hooks (fast refresh)
  components/ui/   shared library: Button, Field, Badge, Table, Modal, Toast, States…
  components/reader/    Reader layout, PostCard, Prose, Comments
  components/workshop/  Workshop shell, PageHeader, MediaBrowser, LineChart
  pages/           one folder per surface
```

## Things worth knowing

**The Temperature Lifecycle** (`components/ui/Badge.tsx`) is the signature element.
Post and comment status is expressed as heat — draft is ember, published is quench,
archived is cold steel. Every place status appears uses `StatusBadge`. The publish
button fires a one-off ignite flash and the badge morphs ember → quench; that is the
only glow effect in the product. Don't add more.

**Auth.** Access + refresh tokens live in `lib/tokens.ts`. A 401 triggers a
single-flight refresh (`lib/api.ts`) so a page-load burst of requests can't race
itself into the API's reuse detection. A failed refresh dispatches
`blogforge:session-ended`, which `AuthProvider` turns into a hard logout.

**RBAC.** Render by capability from `lib/permissions.ts`, never by role name inline.
The API is the real boundary; the UI just never offers a control a role can't use.

**Response envelope.** `errors[]` maps to inline field messages, the top-level
`message` drives the toast or banner, and `meta` drives the one shared pager.
5xx text is masked before it can reach a screen.

**Markdown, not HTML.** The API stores `content` as a plain string and derives the
excerpt and reading time from it, so keeping the body free of markup keeps both
correct. `react-markdown` runs without `rehype-raw`, so post bodies cannot inject
script — keep it that way.

**AI Reports** (`/workshop/reports`) is wired to `POST /ai/reports`, which the API
proxies to the FastAPI RAG service. Answers are a thread: each question replays
the previous turns, so a follow-up is answered against the same conversation.
The `[n]` markers in an answer index into the source list below it — the service
drops uncited sources and renumbers what is left, so the two can never disagree.
The page reads `GET /ai/status` first and explains itself when the service is
off or the corpus is empty, rather than failing.

## Not wired yet

- **Password reset** (`/forgot-password`, `/reset-password`) — screens exist and are
  disabled, with a notice. The API has no reset endpoints yet.
