# BlogForge — Frontend Design & Build Guide

> A single source of truth for the AI agent building the BlogForge frontend.
> Follow this exactly. Where it gives tokens, use those tokens. Where it names a
> screen, wire it to the listed API endpoint. Do not substitute your own
> "modern SaaS" defaults — this document *is* the direction.

---

## 0. What you are building

BlogForge is a blogging CMS. There are **two surfaces**, one codebase, one brand:

1. **The Reader** — the public blog. Unauthenticated visitors and logged-in authors read finished, published work. Calm, editorial, reading-first.
2. **The Workshop** — the authenticated admin dashboard. Authors, editors, and admins write, moderate, and measure. Dense, tool-like, functional.

The frontend is a **React SPA** that consumes an existing REST API. The API is done; you are not changing it. Base URL: `/api/v1`. Health check lives at `/health` (root, not under `/api`).

### The concept: The Forge
The product is named for a forge — where raw material is heated and hammered into a finished tool. A **draft** is raw and hot. **Publishing** is the forge moment: the piece is worked, then *quenched* — cooled and set. An **archived** post has gone cold.

This is not a logo gimmick. It is the organizing metaphor for the entire status system (see §5, "The Temperature Lifecycle" — this is the signature element of the whole product). Use it with restraint: it lives in the color of status, in a handful of empty-state lines, and in the publish interaction. It does **not** belong in every label.

---

## 1. Design principles (read before touching CSS)

- **Two temperatures, one brand.** The Reader is cool, spacious, and typographic. The Workshop is warmer and denser — but they share the exact same tokens. The difference is *rhythm and density*, not a different palette.
- **Hairlines over shadows.** Steel doesn't float. Separate things with 1px borders (`--filing`), not drop shadows. Shadows appear only on true overlays (modals, dropdowns, toasts).
- **The accent is a scarce resource.** Ember (the hot orange) marks exactly one thing per screen: the primary action, or the "this is hot / in progress" status. If everything is ember, nothing is. Most of the UI is steel and paper.
- **Data wears mono.** Every number, timestamp, slug, ID, tag, and code block is set in the monospace face. It reads like instrumentation in a workshop and instantly separates "measured facts" from prose.
- **States are first-class.** Loading, empty, and error are not afterthoughts. The API's response envelope hands you everything you need to build them well (see §11). Design them before you design the happy path.

---

## 2. Color — "Blued Steel & Ember"

A cool, blue-tinted steel base with a single molten accent. **Do not warm the neutrals toward cream** — the base is deliberately blue-grey, not beige.

### Neutrals (blued steel)
| Token | Hex | Use |
|---|---|---|
| `--anvil` | `#14181D` | Highest-contrast ink; headings on light, Workshop sidebar bg |
| `--iron` | `#1E252C` | Body text on light surfaces |
| `--slate` | `#384049` | Secondary text |
| `--steel` | `#64707B` | Muted/tertiary text, icon default |
| `--steel-soft` | `#8A96A1` | Placeholder text, disabled |
| `--filing` | `#D3DBE1` | **Primary divider / border color** (hairlines everywhere) |
| `--mist` | `#E9EEF2` | Raised/inset surface, hover row, skeleton base |
| `--paper` | `#F4F7F9` | App background (cool paper) |
| `--surface` | `#FFFFFF` | Cards, panels, reading column |

### Ember (the hot accent — molten metal, NOT terracotta)
| Token | Hex | Use |
|---|---|---|
| `--ember-tint` | `#FCE9DA` | Hot-status badge background, glow washes |
| `--ember` | `#F26419` | Bright decorative ember; the "ignite" state, focus glow of hot elements |
| `--ember-btn` | `#D9530E` | **Primary button base** (white label sits here) |
| `--ember-strong` | `#B5420A` | Ember *text/links on white* (passes AA), hover/pressed button |

> **Contrast rule:** never put small ember text on white using `--ember` — it fails AA. For text links use `--ember-strong`. For primary buttons, white label on `--ember-btn` at ≥15px semibold; verify AA and darken to `--ember-strong` on hover.

### Quench (the cooled / published steel-blue)
| Token | Hex | Use |
|---|---|---|
| `--quench-tint` | `#E4F0F5` | Published/approved badge bg, info banners |
| `--quench` | `#2C7A9E` | Cooled-status accent, charts, secondary highlights |
| `--quench-strong` | `#16506B` | Quench text on white (AA), links in the Workshop |

### Semantic
| Token | Hex | Meaning |
|---|---|---|
| `--danger` | `#D23A2A` | Destroy, reject, deactivate (overheated metal / spark) |
| `--danger-strong` | `#B22F22` | Danger text on white |
| `--pending` | `#E0912A` | Warning / needs attention / still hot but not an action |

**Palette discipline:** the whole product runs on steel + ember + quench + three semantic hues. No purple, no gradient meshes, no second decorative accent. If you feel the urge to add a color, add whitespace instead.

---

## 3. Typography

Three roles, each doing one job. Load from Google Fonts (or self-host).

| Role | Face | Where |
|---|---|---|
| **Display** | **Fraunces** (variable; use optical/soft settings at large sizes) | Public post titles, Reader hero, section headers |
| **UI sans** | **Geist Sans** (fallback: Inter Tight) | All chrome: nav, buttons, forms, tables, labels, Workshop everything |
| **Reading serif** | **Newsreader** (fallback: Source Serif 4) | The article *reading column body only* — long-form prose |
| **Mono / data** | **JetBrains Mono** | Numbers, timestamps, slugs, IDs, tag chips, code, analytics figures |

Why this split: the Reader gets a warm serif reading experience (Fraunces titles → Newsreader body) so long articles feel like something crafted. The Workshop gets crisp Geist Sans because it's an instrument, with JetBrains Mono for all measured data. That mapping — *serif to read, sans to work, mono to measure* — is intentional; keep it.

### Type scale (1.25 ratio)
| Name | Size / line-height | Face | Notes |
|---|---|---|---|
| Display XL | 56 / 60 | Fraunces | Reader hero post title only |
| Display L | 40 / 46 | Fraunces | Post detail title |
| H1 | 32 / 40 | Fraunces (public) / Geist (workshop) | |
| H2 | 24 / 32 | " | |
| H3 | 20 / 28 | Geist | |
| Reading | 19 / 32 | **Newsreader** | Article body, ~72ch max width, lh 1.7 |
| Body | 16 / 24 | Geist | Default UI text |
| Small | 14 / 20 | Geist | Secondary UI |
| Label / eyebrow | 12 / 16 | JetBrains Mono | UPPERCASE, letter-spacing +0.06em |

Eyebrows, tag chips, statuses, dates, view counts, and section kickers all use the **mono label** style. That mono label is a recurring texture across the product — lean on it.

---

## 4. Space, radius, elevation, grid

- **Spacing scale (4px base):** 4, 8, 12, 16, 24, 32, 48, 64, 96. Use these only.
- **Radius:** controls/inputs `8px`, cards/panels `12px`, modals `16px`, chips/badges `6px`, avatars/thumbnails `8px`. Tool-like, not pill-shaped, not zero. (Zero-radius = the newspaper default we're avoiding.)
- **Elevation:** almost none. Reading and content surfaces are flat with `--filing` borders. Only overlays get shadow: `0 8px 24px rgba(20,24,29,.12)` for modals/dropdowns, lighter for toasts.
- **Focus ring:** 2px `--quench` outline with 2px offset on every interactive element. Always visible on keyboard focus.

### Reader grid
- Article reading column: max **72ch** for body, centered.
- Listing/index pages: content max **1200px**, responsive card grid (3 → 2 → 1).
- Generous vertical rhythm; let published work breathe.

### Workshop grid (app shell)
```
┌───────────┬──────────────────────────────────────────────┐
│           │  Top bar: search · New post · notifs · user   │
│  Sidebar  ├──────────────────────────────────────────────┤
│  (nav)    │                                              │
│  --anvil  │   Main content (max ~1280, padded 32)        │
│  collapse │   tables · cards · editor · charts           │
│           │                                              │
└───────────┴──────────────────────────────────────────────┘
```
- Sidebar background `--anvil`, collapsible to icon-rail, becomes a drawer on mobile.
- Top bar `--surface` with a bottom `--filing` hairline.

---

## 5. ★ Signature: The Temperature Lifecycle

**This is the one element BlogForge is remembered by. Implement it consistently everywhere status appears.**

Post and comment status is expressed as *heat*, using color + a mono label. It is not a random palette of badges — the temperature encodes where the work is in the forge.

| Status | Temperature | Token | Badge |
|---|---|---|---|
| **Draft** | Hot — on the anvil | `--ember` / `--ember-tint` | `● DRAFT` mono, ember |
| **Published** | Quenched — cooled & set | `--quench` / `--quench-tint` | `● PUBLISHED` mono, quench |
| **Archived** | Cold | `--steel` / `--mist` | `● ARCHIVED` mono, grey |
| Comment: pending | Warm | `--pending` | `PENDING` |
| Comment: approved | Quenched | `--quench` | `APPROVED` |
| Comment: rejected | Spark-out | `--danger` | `REJECTED` |

**The publish moment (the payoff):** the primary "Publish post" button is ember (`--ember-btn`). On click it fires a brief *ignite* micro-interaction (subtle warm glow + 1.02 scale, ~180ms), then on success the post's status identity **transitions ember → quench** (color morph over ~400ms) and the toast reads "Post published." One orchestrated moment — do not scatter glow effects elsewhere.

Respect `prefers-reduced-motion`: skip the morph/scale, just swap the color.

---

## 6. Motion

Restrained. 150–200ms `ease-out` for hovers and simple transitions. The only "orchestrated" moment is the publish ignite→quench (§5). Optional: a gentle staggered fade-up on the Reader index load (respect reduced motion). No parallax, no looping ambient animation, no scroll-jacking.

---

## 7. Components

Build these as a shared library used by both surfaces.

- **Buttons.** Primary = `--ember-btn`, white label, radius 8. Secondary = `--surface` with `--filing` border, `--iron` label. Ghost = transparent, `--slate` label. Danger = `--danger`. Label text says what happens: "Publish post", "Save draft", "Delete", "Approve" — never "Submit"/"OK".
- **Inputs / textarea / select.** `--surface`, 1px `--filing` border, radius 8, `--steel-soft` placeholder. Focus → `--quench` ring. Error → `--danger` border + inline message below (fed by API field errors, §11). Labels above, mono helper/counter text.
- **Cards.** `--surface`, `--filing` border, radius 12, no shadow. Post card: thumbnail, mono category kicker, Fraunces title, excerpt (Geist), author avatar + name, mono date + view count, temperature badge.
- **Badges / chips.** Mono, radius 6, tint background. Status badges follow §5. Tag chips are quiet steel until hovered.
- **Tables (Workshop).** Hairline rows (`--filing`), `--mist` on hover, mono for dates/counts/IDs, temperature badge in a status column, right-aligned row actions gated by role (§9). Sticky header. On mobile, collapse each row into a stacked card.
- **Modals.** Radius 16, overlay shadow, `rgba(20,24,29,.5)` scrim, focus-trapped, ESC to close. Used for: invite/confirm, delete confirmation, deactivate-user, media picker.
- **Toasts.** Bottom-right, mono-timestamped, driven by the API `message` field. Success = quench, error = danger, info = quench.
- **Empty / loading / error states.** See §11 — these are components, not inline afterthoughts.

---

## 8. Screen map → API

Wire each screen to these exact endpoints. Response shape is always the envelope in §11.

### The Reader (public)
| Screen | Endpoint(s) | Notes |
|---|---|---|
| Home / index | `GET /posts` | Published only for anon. Featured hero + card grid, category/tag filters, `q` search, pagination from `meta`. |
| Post detail | `GET /posts/:idOrSlug` · `POST /posts/:postId/views` (on load, rate-limited) | Reading column (Newsreader), byline w/ avatar+bio, category/tag chips, mono publish date + view count. |
| Comments (on detail) | `GET /posts/:postId/comments` (approved only) · `POST /posts/:postId/comments` (auth) | Threaded via `parent`. New comment from a non-staff author shows a "Pending review" state — set expectation clearly. |
| Category / tag archive | `GET /posts?category=` / `?tag=` | Same grid, filtered. |
| Author page | `GET /posts?author=:id` | |
| Login / Register | `POST /auth/login` · `POST /auth/register` | Register **always** creates an `author`; don't offer a role selector. Store token pair; silent refresh (§10). |
| Forgot / reset password | (password-reset flow) | Nodemailer-backed; design the request + reset-token screens. |

### The Workshop (authenticated)
| Screen | Endpoint(s) | Access |
|---|---|---|
| Overview / dashboard | `GET /analytics/overview` | editor/admin. KPI tiles (mono numerals), posts-by-status, top posts, daily-views line chart (`--quench` line). |
| Posts list | `GET /posts?author=me` (authors) / all (staff) | auth. Filters: status/category/tag/author/`q`; sort; pagination. Temperature badges. Row actions per role. |
| Post editor | `POST /posts` (→ always draft) · `PATCH /posts/:id` · `PATCH /posts/:id/publish`·`/archive` | Title (slug auto-regens on title change — show live slug in mono), content editor, category/tag pickers, featured image via media picker, status header (§5). "Save draft" for all; "Publish"/"Archive" for editor/admin only. |
| My analytics | `GET /analytics/posts/:postId` | staff or post author. Daily view series. |
| Comments moderation | `GET /posts/:postId/comments?status=` · `PATCH /comments/:id/moderate` · `DELETE /comments/:id` | editor/admin. Queue of pending (warm), approve/reject, threaded; deleting detaches replies (don't imply they vanish). |
| Media library | `GET /media` (own / all staff) · `POST /media` (field `file`, images ≤5MB) · `DELETE /media/:id` | auth. Drag-drop upload, Cloudinary thumbnails, doubles as the editor's image picker. |
| Users | `GET /users` (`?role=&isActive=&q=`) · `PATCH /users/:id/role`·`/status` | **admin only**. Role badges; deactivating a user kills their sessions — confirm in a modal and say so. |
| Account / profile | `PATCH /users/me` · `PATCH /users/me/password` | auth. Name/bio/avatar. **Changing password revokes all sessions** — warn the user they'll be signed out elsewhere. |

### Reserved: AI Reports
BlogForge's differentiator is an **AI Reports** feature (RAG-backed). The current Phase-1 API does **not** expose AI endpoints yet, so **do not invent them.** Instead, reserve a nav slot and a page shell in the Workshop ("AI Reports"), designed to hold a report-generation input and a results panel, with a clean "coming soon / not yet wired" empty state. Leave the layout ready so the endpoint can drop in later.

---

## 9. Roles & conditional UI (RBAC)

Roles: `admin` · `editor` · `author`. Render by capability — never show a control a role can't use.

- **Author:** create posts (always draft), edit/delete **own drafts**, upload/delete own media, edit own profile. No publish, no moderation, no user admin.
- **Editor:** all author powers + publish/archive any post, moderate comments, staff-wide post/media visibility.
- **Admin:** everything + `/users` management (role/status).
- The **Users** nav item and page appear for admins only. Publish/Archive buttons appear for editor/admin only. Delete on a post is owner-draft-only for authors, staff-any for editors/admins.
- Never rely on hiding alone for security — the API enforces it — but the UI must not dangle disabled admin controls in front of authors.

---

## 10. Auth & token handling

- On login/register, store the `accessToken` + `refreshToken` pair (per your app's storage strategy).
- On a `401`, silently call `POST /auth/refresh` once, retry the original request. Refresh **rotates** the token — replace the stored pair with the new one.
- If refresh fails / reuse is detected (the API revokes the whole session family), hard-logout and route to login with a clear "Your session ended — sign in again" message.
- A deactivated user (admin killed their session) → forced logout on next call.

---

## 11. States from the API envelope

Every response is:
```json
{ "success": true, "message": "OK", "data": {},
  "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 } }
```
Errors:
```json
{ "success": false, "message": "...",
  "errors": [{ "field": "title", "message": "Title is required" }] }
```

Design rules that fall out of this:
- **Pagination** reads straight from `meta` (page/limit/total/totalPages). Build one shared pager.
- **Field errors** (`errors[]`) map to inline messages under the matching input. The top-level `message` drives the toast/banner.
- **`5xx` messages are masked in production** → show a generic "Something failed on our end. Try again." error state, never a raw message.
- **Loading:** skeletons that match the target layout — post-card skeletons on the index, row skeletons in tables, a reading-column skeleton on post detail. Avoid full-page spinners for content.
- **Empty states** are invitations, written in the interface's voice (see §12). Every list needs one: no posts, no comments, no media, no search results, empty moderation queue.

---

## 12. Voice & copy

Copy is design material. Keep it plain, active, and specific; let the forge metaphor surface only in a few signature spots.

- **Actions name their outcome.** Button "Publish post" → toast "Post published." "Save draft" → "Draft saved." An action keeps its name through the whole flow.
- **Errors explain and fix, they don't apologize.** "Title is required." not "Oops! Something went wrong 😅". No emoji.
- **Empty screens invite action, in-voice.** A few forge-flavored lines are welcome here — use sparingly:
  - Posts (author, none yet): *"Nothing on the anvil yet. Forge your first post."* + New post button.
  - Moderation queue empty: *"Queue's clear. Nothing waiting to be worked."*
  - Media empty: *"No media yet. Drop images here to add them."*
  - Search no results: *"No posts match ‘{query}’. Try another term."*
- **Labels are for readers, not the system.** "Members", "Drafts", "Views" — never "CPT", "rollup", "webhook".
- **Don't over-forge it.** Outside empty states, the publish moment, and status names, write normal, clear product copy. The metaphor is seasoning, not the meal.

---

## 13. Quality floor (non-negotiable)

- **Responsive to mobile.** Sidebar → drawer; tables → stacked cards; reading column stays fluid at 72ch max; touch targets ≥44px.
- **WCAG AA contrast.** Body text on `--paper`/`--surface` uses `--iron`/`--anvil`. Ember/quench/danger *text on white* use the `-strong` variants. Verify every pairing.
- **Keyboard:** visible `--quench` focus rings, focus-trapped modals, ESC to close, logical tab order.
- **`prefers-reduced-motion`** respected — the publish morph and any fades degrade to instant.
- **No layout shift** from loading → loaded (skeletons reserve space).

---

## 14. Anti-generic guardrails (do / don't)

**Don't:**
- ✗ Cream/beige background (`#F4F1EA` family) or terracotta accent (`#D97757` family) — this is the #1 AI-default look; we are steel + molten-ember on purpose.
- ✗ Near-black background with a single acid-green/vermilion accent.
- ✗ Broadsheet hairlines with zero border-radius and dense newspaper columns.
- ✗ Hero built from a giant number + gradient + three stat pills.
- ✗ Purple SaaS gradients, glassmorphism, emoji in empty states, drop shadows on flat content.
- ✗ A second decorative accent color "to add interest."

**Do:**
- ✓ Cool blued-steel neutrals; ember as the *only* hot accent, used scarcely.
- ✓ The Temperature Lifecycle as the consistent status language (§5).
- ✓ Fraunces + Newsreader for reading, Geist for chrome, JetBrains Mono for all data.
- ✓ Hairline borders as the primary separation device; shadows only on overlays.
- ✓ Empty/loading/error states designed as carefully as the happy path.

---

## 15. Build order (suggested)

1. Tokens + type + base components (buttons, inputs, badges, card, table, modal, toast, states).
2. Auth flow + token/refresh handling + role context.
3. The Reader (index, post detail + comments, archives, author page).
4. Workshop shell (sidebar, top bar, role-gated nav).
5. Posts list + editor + the publish signature moment.
6. Comments moderation, media library.
7. Analytics dashboard.
8. Users admin.
9. Reserved AI Reports shell.
10. Responsive + a11y pass; screenshot-review against §14.

Build it as if this were the one client whose product could never be mistaken for anyone else's.