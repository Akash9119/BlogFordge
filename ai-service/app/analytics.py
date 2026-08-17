"""Analytics facts for the prompt.

"Summarise engagement trends" is not a retrieval question — no paragraph in any
post contains the answer. So a report gets two kinds of grounding: retrieved
*content* chunks, and a compact block of *measured* facts read straight from
the same aggregations the dashboard uses, so the numbers in an answer match the
numbers on the Overview screen.

Scope follows the API's RBAC: editors and admins see the whole blog, an author
sees only their own posts — the same boundary `GET /analytics/overview`
enforces.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from bson import ObjectId

from . import db

DEFAULT_WINDOW_DAYS = 30
TOP_POSTS = 8


def _utc_day(moment: datetime | None = None) -> datetime:
    moment = moment or datetime.now(timezone.utc)
    return datetime(moment.year, moment.month, moment.day, tzinfo=timezone.utc)


async def collect(
    *,
    author_id: ObjectId | None,
    days: int = DEFAULT_WINDOW_DAYS,
) -> dict[str, Any]:
    """Aggregate the blog's numbers. `author_id` restricts everything to one author."""
    to = _utc_day()
    frm = to - timedelta(days=days)

    post_filter: dict[str, Any] = {}
    if author_id is not None:
        post_filter["author"] = author_id

    posts = db.posts()

    by_status_cursor = await posts.aggregate(
        [{"$match": post_filter}, {"$group": {"_id": "$status", "count": {"$sum": 1}}}]
    )
    by_status_docs = await by_status_cursor.to_list(length=None)
    by_status = {doc["_id"]: doc["count"] for doc in by_status_docs}

    totals_cursor = await posts.aggregate(
        [{"$match": post_filter}, {"$group": {"_id": None, "views": {"$sum": "$viewCount"}}}]
    )
    totals = await totals_cursor.to_list(length=1)

    top_docs = await posts.find(
        {**post_filter, "status": "published"},
        projection={"title": 1, "slug": 1, "viewCount": 1, "publishedAt": 1},
        sort=[("viewCount", -1)],
        limit=TOP_POSTS,
    ).to_list(length=TOP_POSTS)

    recent_docs = await posts.find(
        {**post_filter, "status": "published", "publishedAt": {"$gte": frm}},
        projection={"title": 1, "slug": 1, "viewCount": 1, "publishedAt": 1},
        sort=[("publishedAt", -1)],
        limit=TOP_POSTS,
    ).to_list(length=TOP_POSTS)

    # Daily rollups, restricted to this author's posts when scoped.
    match: dict[str, Any] = {"date": {"$gte": frm, "$lte": to}}
    if author_id is not None:
        scoped_ids = [doc["_id"] async for doc in posts.find(post_filter, projection={"_id": 1})]
        match["post"] = {"$in": scoped_ids}

    daily_cursor = await db.analytics().aggregate(
        [
            {"$match": match},
            {"$group": {"_id": "$date", "views": {"$sum": "$views"}}},
            {"$sort": {"_id": 1}},
            {"$project": {"_id": 0, "date": "$_id", "views": 1}},
        ]
    )
    daily_docs = await daily_cursor.to_list(length=None)

    daily = [{"date": doc["date"], "views": doc["views"]} for doc in daily_docs]

    return {
        "range": {"from": frm, "to": to, "days": days},
        "scope": "own posts" if author_id is not None else "the whole blog",
        "posts_by_status": by_status,
        "total_views_all_time": (totals[0]["views"] if totals else 0) or 0,
        "top_posts": [_post_row(doc) for doc in top_docs],
        "recent_posts": [_post_row(doc) for doc in recent_docs],
        "daily_views": daily,
        "window": _summarise_window(daily),
    }


def _post_row(doc: dict[str, Any]) -> dict[str, Any]:
    return {
        "title": doc.get("title", ""),
        "slug": doc.get("slug", ""),
        "views": doc.get("viewCount", 0),
        "published_at": doc.get("publishedAt"),
    }


def _summarise_window(daily: list[dict[str, Any]]) -> dict[str, Any]:
    """Totals and direction — the shape of "are we going up or down"."""
    if not daily:
        return {"views": 0, "average_per_day": 0.0, "best_day": None, "trend": "no data"}

    views = [row["views"] for row in daily]
    total = sum(views)
    best = max(daily, key=lambda row: row["views"])

    midpoint = len(views) // 2
    first, second = sum(views[:midpoint]), sum(views[midpoint:])
    if midpoint == 0 or first == 0:
        trend = "flat" if second == 0 else "rising"
    else:
        change = (second - first) / first
        trend = "rising" if change > 0.1 else "falling" if change < -0.1 else "flat"

    return {
        "views": total,
        "average_per_day": round(total / len(views), 1),
        "best_day": {"date": best["date"], "views": best["views"]},
        "trend": trend,
    }


def to_prompt_block(facts: dict[str, Any]) -> str:
    """Render the facts as terse lines — cheaper and clearer to a model than JSON."""
    date = lambda value: value.strftime("%Y-%m-%d") if isinstance(value, datetime) else "unknown"  # noqa: E731

    window = facts["window"]
    lines = [
        f"Scope: {facts['scope']}.",
        f"Window: {date(facts['range']['from'])} to {date(facts['range']['to'])} "
        f"({facts['range']['days']} days).",
        "Posts by status: "
        + (", ".join(f"{status} {count}" for status, count in sorted(facts["posts_by_status"].items())) or "none"),
        f"All-time views: {facts['total_views_all_time']}.",
        f"Views in window: {window['views']} "
        f"(avg {window['average_per_day']}/day, trend {window['trend']}).",
    ]
    if window["best_day"]:
        lines.append(f"Best day in window: {date(window['best_day']['date'])} with {window['best_day']['views']} views.")

    if facts["top_posts"]:
        lines.append("Most-read posts (all time):")
        lines += [
            f"  - {row['title']} — {row['views']} views, published {date(row['published_at'])}"
            for row in facts["top_posts"]
        ]
    if facts["recent_posts"]:
        lines.append("Published in this window:")
        lines += [f"  - {row['title']} — {row['views']} views" for row in facts["recent_posts"]]

    return "\n".join(lines)
