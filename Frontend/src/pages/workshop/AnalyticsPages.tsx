import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { analyticsApi } from '@/api/analytics'
import { postsApi } from '@/api/posts'
import { useAuth } from '@/context/auth-context'
import { isStaff } from '@/lib/permissions'
import { daysAgo, formatCount, formatDate, toIsoDate } from '@/lib/format'
import { PageHeader } from '@/components/workshop/PageHeader'
import { LineChart, StatTile, StatTiles } from '@/components/workshop/LineChart'
import { LinkButton } from '@/components/ui/Button'
import { BareSelect } from '@/components/ui/Field'
import { Panel, Toolbar, ToolbarSpacer } from '@/components/ui/Panel'
import { StatusBadge } from '@/components/ui/Badge'
import { Cell, IconAction, PrimaryCell, RowActions, Table, TableSkeleton } from '@/components/ui/Table'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { Icon } from '@/components/ui/Icon'

const RANGES = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
]

/**
 * Per-post analytics index. `GET /analytics/posts/:postId` is the only
 * per-post endpoint, so this page lists posts by lifetime views and links
 * into each one's daily series.
 */
export function AnalyticsPage() {
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const staff = isStaff(user)

  const posts = useQuery({
    queryKey: ['posts', 'analytics-index', page, staff],
    queryFn: ({ signal }) =>
      postsApi.list({ page, limit: 15, sort: '-viewCount', ...(staff ? {} : { author: 'me' }) }, signal),
    placeholderData: keepPreviousData,
  })

  const items = posts.data?.items ?? []

  return (
    <>
      <PageHeader
        eyebrow="Workshop"
        title="Analytics"
        subtitle={
          staff
            ? 'Every post by lifetime views. Open one for its daily series.'
            : 'Your posts by lifetime views. Open one for its daily series.'
        }
      />

      {posts.isError ? (
        <ErrorState error={posts.error} onRetry={() => posts.refetch()} />
      ) : !posts.isPending && items.length === 0 ? (
        <EmptyState
          icon="chart"
          title="No posts to measure yet."
          body="Views start accumulating the moment a post is published."
          action={
            <LinkButton to="/workshop/posts/new" variant="primary">
              New post
            </LinkButton>
          }
        />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <th>Post</th>
                <th>Status</th>
                {staff && <th>Author</th>}
                <th>Published</th>
                <th style={{ textAlign: 'right' }}>Views</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>

            {posts.isPending ? (
              <TableSkeleton rows={8} columns={staff ? 6 : 5} />
            ) : (
              <tbody>
                {items.map((post) => (
                  <tr key={post._id}>
                    <PrimaryCell
                      title={post.title}
                      meta={`/${post.slug}`}
                      to={`/workshop/analytics/${post._id}`}
                      label="Post"
                    />
                    <Cell label="Status">
                      <StatusBadge status={post.status} />
                    </Cell>
                    {staff && <Cell label="Author">{post.author?.name ?? '—'}</Cell>}
                    <Cell label="Published" numeric style={{ textAlign: 'left' }}>
                      {formatDate(post.publishedAt)}
                    </Cell>
                    <Cell label="Views" numeric>
                      {formatCount(post.viewCount)}
                    </Cell>
                    <Cell label="" actions>
                      <RowActions>
                        <IconAction icon="chart" label="View analytics" to={`/workshop/analytics/${post._id}`} />
                        <IconAction icon="edit" label="Edit post" to={`/workshop/posts/${post._id}`} />
                      </RowActions>
                    </Cell>
                  </tr>
                ))}
              </tbody>
            )}
          </Table>

          {posts.data && <Pagination meta={posts.data.meta} onPageChange={setPage} noun="post" />}
        </>
      )}
    </>
  )
}

/** GET /analytics/posts/:postId — staff, or the post's own author. */
export function PostAnalyticsPage() {
  const { postId = '' } = useParams()
  const [days, setDays] = useState('30')

  const range = { from: toIsoDate(daysAgo(Number(days))), to: toIsoDate(new Date()) }

  const analytics = useQuery({
    queryKey: ['analytics', 'post', postId, range],
    queryFn: ({ signal }) => analyticsApi.forPost(postId, range, signal),
    placeholderData: keepPreviousData,
  })

  const data = analytics.data
  const rangeViews = data?.daily.reduce((sum, point) => sum + point.views, 0) ?? 0
  const busiest = data?.daily.reduce<{ date: string; views: number } | null>(
    (best, point) => (!best || point.views > best.views ? point : best),
    null,
  )

  return (
    <>
      <PageHeader
        eyebrow="Analytics"
        title={data?.post.title ?? 'Post analytics'}
        subtitle={data ? `/${data.post.slug}` : undefined}
        documentTitle="Post analytics"
        actions={
          data && (
            <>
              <LinkButton to={`/workshop/posts/${data.post._id}`} variant="secondary" size="sm">
                Edit post
              </LinkButton>
              {data.post.status === 'published' && (
                <LinkButton
                  to={`/posts/${data.post.slug}`}
                  variant="ghost"
                  size="sm"
                  icon={<Icon name="eye" size={16} />}
                >
                  View
                </LinkButton>
              )}
            </>
          )
        }
      />

      <Link
        to="/workshop/analytics"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-4)',
          fontSize: 'var(--text-small)',
          color: 'var(--steel)',
          textDecoration: 'none',
        }}
      >
        <Icon name="arrowLeft" size={16} />
        All analytics
      </Link>

      <Toolbar>
        <BareSelect
          value={days}
          onChange={(event) => setDays(event.target.value)}
          aria-label="Date range"
          options={RANGES}
        />
        <ToolbarSpacer />
      </Toolbar>

      {analytics.isError ? (
        <ErrorState error={analytics.error} onRetry={() => analytics.refetch()} />
      ) : analytics.isPending || !data ? (
        <>
          <StatTiles>
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} height={112} radius="var(--radius-card)" />
            ))}
          </StatTiles>
          <Skeleton height={320} radius="var(--radius-card)" />
        </>
      ) : (
        <>
          <StatTiles>
            <StatTile label="Views, all time" value={data.post.viewCount} icon="eye" />
            <StatTile label="Views in range" value={rangeViews} foot={`${days} days`} icon="chart" />
            <StatTile
              label="Busiest day"
              value={busiest ? formatCount(busiest.views) : '—'}
              foot={busiest ? formatDate(busiest.date) : 'No views in this range.'}
              icon="flame"
            />
          </StatTiles>

          <Panel>
            <LineChart
              data={data.daily}
              title="Daily views"
              subtitle={`${formatDate(range.from)} — ${formatDate(range.to)}`}
              stale={analytics.isFetching}
              emptyMessage={
                data.post.status === 'published'
                  ? 'No views recorded in this range yet.'
                  : 'This post is not published, so it collects no views.'
              }
            />
          </Panel>
        </>
      )}
    </>
  )
}
