import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { analyticsApi } from '@/api/analytics'
import { useAuth } from '@/context/auth-context'
import { daysAgo, formatCount, formatDate, toIsoDate } from '@/lib/format'
import { PageHeader } from '@/components/workshop/PageHeader'
import { LineChart, StatTile, StatTiles } from '@/components/workshop/LineChart'
import { LinkButton } from '@/components/ui/Button'
import { BareSelect } from '@/components/ui/Field'
import { Panel, Toolbar, ToolbarSpacer } from '@/components/ui/Panel'
import { Cell, PrimaryCell, Table } from '@/components/ui/Table'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { Icon } from '@/components/ui/Icon'

const RANGES = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
]

export function OverviewPage() {
  const { user } = useAuth()
  const [days, setDays] = useState('30')

  const range = { from: toIsoDate(daysAgo(Number(days))), to: toIsoDate(new Date()) }

  const overview = useQuery({
    queryKey: ['analytics', 'overview', range],
    queryFn: ({ signal }) => analyticsApi.overview(range, signal),
    placeholderData: keepPreviousData,
  })

  const data = overview.data
  const byStatus = data?.postsByStatus ?? {}
  const totalPosts = (byStatus.draft ?? 0) + (byStatus.published ?? 0) + (byStatus.archived ?? 0)

  return (
    <>
      <PageHeader
        eyebrow="Workshop"
        title={`Welcome back, ${user?.name?.split(' ')[0] ?? 'there'}`}
        subtitle="How the forge is running: what's published, what's still hot, and what readers are actually reading."
        documentTitle="Overview"
      />

      {/* One filter row above everything it scopes — every panel below
          re-renders against the same slice. */}
      <Toolbar>
        <BareSelect
          value={days}
          onChange={(event) => setDays(event.target.value)}
          aria-label="Date range"
          options={RANGES}
        />
        <ToolbarSpacer />
        <LinkButton to="/workshop/posts/new" variant="primary" size="sm" icon={<Icon name="plus" size={16} />}>
          New post
        </LinkButton>
      </Toolbar>

      {overview.isError ? (
        <ErrorState error={overview.error} onRetry={() => overview.refetch()} />
      ) : overview.isPending || !data ? (
        <>
          <StatTiles>
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} height={112} radius="var(--radius-card)" />
            ))}
          </StatTiles>
          <Skeleton height={320} radius="var(--radius-card)" />
        </>
      ) : (
        <>
          <StatTiles>
            <StatTile
              label="Total views"
              value={data.totalViews}
              foot="Across every published post, all time."
              icon="eye"
            />
            <StatTile
              label="Published"
              value={byStatus.published ?? 0}
              foot={totalPosts > 0 ? `of ${formatCount(totalPosts)} posts` : 'Nothing published yet.'}
              icon="droplet"
            />
            <StatTile
              label="Drafts"
              value={byStatus.draft ?? 0}
              foot="Still hot on the anvil."
              icon="flame"
            />
            <StatTile
              label="Archived"
              value={byStatus.archived ?? 0}
              foot="Cold, and out of the public listing."
              icon="archive"
            />
          </StatTiles>

          <Panel>
            <LineChart
              data={data.dailyViews}
              title="Daily views"
              subtitle={`${formatDate(range.from)} — ${formatDate(range.to)}`}
              stale={overview.isFetching}
              emptyMessage="No views recorded in this range yet. They'll appear here once readers arrive."
            />
          </Panel>

          <div style={{ marginTop: 'var(--space-5)' }}>
            <Panel title="Top posts" subtitle="The five most-read published posts, all time." flush>
              {data.topPosts.length === 0 ? (
                <EmptyState
                  icon="flame"
                  title="Nothing published yet."
                  body="Once a post is quenched and readers find it, it shows up here."
                  inset
                />
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <th>Post</th>
                      <th>Author</th>
                      <th>Published</th>
                      <th style={{ textAlign: 'right' }}>Views</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topPosts.map((post) => (
                      <tr key={post._id}>
                        <PrimaryCell
                          title={post.title}
                          meta={`/${post.slug}`}
                          to={`/workshop/analytics/${post._id}`}
                          label="Post"
                        />
                        <Cell label="Author">{post.author?.name ?? '—'}</Cell>
                        <Cell label="Published" numeric style={{ textAlign: 'left' }}>
                          {formatDate(post.publishedAt)}
                        </Cell>
                        <Cell label="Views" numeric>
                          {formatCount(post.viewCount)}
                        </Cell>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Panel>
          </div>
        </>
      )}
    </>
  )
}
