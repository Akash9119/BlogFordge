# BlogForge API (Backend)

Production-ready Phase 1 backend: Express 5 + Mongoose 9, JWT auth with rotating refresh tokens, RBAC (`admin` / `editor` / `author`), posts with draft→publish workflow, taxonomy, threaded moderated comments, Cloudinary media, and daily-rollup analytics.

## Setup

```bash
cd Backend
npm install
cp .env.example .env      # fill in MONGODB_URI, JWT secrets, Cloudinary keys
npm run seed:admin        # creates the first admin (uses ADMIN_* vars from .env)
npm run dev               # nodemon dev server
npm start                 # production
```

Public registration always creates `author` accounts — admins are seeded or promoted by another admin.

## Response envelope

Every endpoint returns:

```json
{ "success": true, "message": "OK", "data": {}, "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 } }
```

Errors: `{ "success": false, "message": "...", "errors": [{ "field": "...", "message": "..." }] }`

## Endpoints (base: `/api/v1`)

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/health` *(root, not under /api)* | public | liveness + DB state |
| POST | `/auth/register` | public | always role `author`; returns token pair |
| POST | `/auth/login` | public | returns `accessToken` + `refreshToken` |
| POST | `/auth/refresh` | public | rotates the refresh token; reuse revokes all sessions |
| POST | `/auth/logout` | public | revokes the given refresh token |
| GET | `/auth/me` | auth | current user |
| PATCH | `/users/me` | auth | name / bio / avatar |
| PATCH | `/users/me/password` | auth | revokes all sessions on success |
| GET | `/users`, `/users/:id` | admin | `?role=&isActive=&q=&page=&limit=&sort=` |
| PATCH | `/users/:id/role`, `/users/:id/status` | admin | deactivation kills sessions |
| GET | `/posts` | public* | `?page=&limit=&sort=&status=&category=&tag=&author=(id\|me)&q=` |
| GET | `/posts/:idOrSlug` | public* | drafts visible to owner/staff only |
| POST | `/posts` | auth | always created as `draft` |
| PATCH | `/posts/:id` | owner/staff | slug regenerates when title changes |
| DELETE | `/posts/:id` | staff, or owner (draft only) | cascades comments |
| PATCH | `/posts/:id/publish` · `/archive` | editor/admin | sets `publishedAt` once |
| POST | `/posts/:postId/views` | public (rate-limited) | atomic daily analytics rollup |
| GET | `/posts/:postId/comments` | public* | approved only; staff filter with `?status=` |
| POST | `/posts/:postId/comments` | auth | `pending` unless staff; `parent` for threading |
| PATCH | `/comments/:id/moderate` | editor/admin | `approved` / `rejected` / `pending` |
| DELETE | `/comments/:id` | owner/staff | replies detach, not deleted |
| POST | `/media` | auth | multipart field `file` (images ≤ 5 MB) → Cloudinary |
| GET | `/media` | auth | own uploads; staff see all |
| DELETE | `/media/:id` | owner/admin | also removes the Cloudinary asset |
| GET | `/analytics/overview` | editor/admin | totals, posts by status, top posts, daily views (`?from=&to=`) |
| GET | `/analytics/posts/:postId` | staff or post author | daily view series |

\* anonymous requests see published content only; authenticated authors additionally see their own drafts/archived posts.

## Production notes

- **Security:** helmet, CORS allowlist (`CORS_ORIGINS`), global + auth + view rate limits, bcrypt cost 12, JWT secrets validated ≥ 32 chars in production, 1 MB body limit.
- **Refresh tokens** are stored hashed (SHA-256) with a Mongo TTL index; rotation with reuse detection revokes the whole session family.
- **Behind a proxy** (nginx / Render / Railway): set `TRUST_PROXY=1` so rate limiting sees real client IPs.
- **Graceful shutdown** on SIGTERM/SIGINT: stops accepting connections, drains, closes Mongo, 10 s hard limit.
- 5xx messages are masked in production; details are logged server-side.
