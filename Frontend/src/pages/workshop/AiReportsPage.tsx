import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { aiApi } from '@/api/ai'
import { useAuth } from '@/context/auth-context'
import { isAdmin } from '@/lib/permissions'
import { formatCount, formatDate } from '@/lib/format'
import type { AiReport, AiSource } from '@/lib/types'
import { PageHeader } from '@/components/workshop/PageHeader'
import { Prose } from '@/components/reader/Prose'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Icon } from '@/components/ui/Icon'
import { Panel } from '@/components/ui/Panel'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { useToast } from '@/components/ui/toast-context'
import styles from './AiReports.module.css'

/*
 * AI Reports — design_guide.md §8, no longer reserved.
 *
 * The shell this replaces promised a question input on top and a results panel
 * below, sized for an answer plus its citations. That structure is unchanged;
 * what moved is that the composer and the panel now talk to `POST /ai/reports`,
 * which Node proxies to the FastAPI RAG service.
 *
 * Answers are a thread, not a single shot: each turn replays the ones before it
 * so a follow-up ("and which of those was oldest?") is answered against the
 * same conversation rather than starting cold.
 */

const EXAMPLE_QUESTIONS = [
  'Which topics drove the most reads last month?',
  'Summarise what we published about performance.',
  'Which drafts overlap with something already published?',
  'What should I write about next, based on what readers open?',
]

interface ThreadEntry {
  id: number
  question: string
  report: AiReport
}

export function AiReportsPage() {
  const { user } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()

  const [question, setQuestion] = useState('')
  const [thread, setThread] = useState<ThreadEntry[]>([])
  const latestRef = useRef<HTMLDivElement>(null)

  const status = useQuery({
    queryKey: ['ai', 'status'],
    queryFn: ({ signal }) => aiApi.status(signal),
    staleTime: 60_000,
  })

  const report = useMutation({
    mutationFn: (asked: string) =>
      aiApi.report({
        question: asked,
        history: thread.map((entry) => ({ question: entry.question, answer: entry.report.answer })),
      }),
    onSuccess: (data, asked) => {
      setThread((entries) => [...entries, { id: Date.now(), question: asked, report: data }])
      setQuestion('')
    },
    onError: (error) => toast.error(error),
  })

  const reindex = useMutation({
    mutationFn: () => aiApi.reindex(false),
    onSuccess: (summary) => {
      toast.success(`Indexed ${summary.indexed} post${summary.indexed === 1 ? '' : 's'}.`)
      queryClient.invalidateQueries({ queryKey: ['ai', 'status'] })
    },
    onError: (error) => toast.error(error),
  })

  // Keep the newest answer in view without yanking the whole page around.
  useEffect(() => {
    if (thread.length > 0) latestRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [thread.length])

  const live = status.data?.available === true
  const canAsk = live && question.trim().length >= 3 && !report.isPending

  function ask() {
    if (!canAsk) return
    report.mutate(question.trim())
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter makes newlines — a question can be a paragraph. Modifier sends it.
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      ask()
    }
  }

  const unindexed = status.data ? status.data.publishedPosts - status.data.indexedPosts : 0

  return (
    <>
      <PageHeader
        eyebrow="Workshop"
        title="AI Reports"
        subtitle="Ask questions in plain language about your own posts and analytics, and get answers grounded in what you've actually published — with sources."
        documentTitle="AI Reports"
        actions={<StatusPill status={status.data} loading={status.isPending} />}
      />

      {status.data && !live && (
        <div className={styles.notice} role="status">
          <Icon name="alert" size={16} />
          <div>
            <p className={styles.noticeTitle}>The forge isn&rsquo;t lit for this one yet.</p>
            <p className={styles.noticeBody}>
              {status.data.reason ?? 'The AI service is not reachable from the API.'}
            </p>
          </div>
        </div>
      )}

      {live && unindexed > 0 && (
        <div className={styles.notice} role="status">
          <Icon name="info" size={16} />
          <div>
            <p className={styles.noticeTitle}>
              {formatCount(unindexed)} published post{unindexed === 1 ? ' is' : 's are'} not indexed yet
            </p>
            <p className={styles.noticeBody}>
              Posts are indexed when they&rsquo;re published. Anything published before the AI service was
              connected needs one backfill.
            </p>
          </div>
          {isAdmin(user) && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => reindex.mutate()}
              loading={reindex.isPending}
              icon={<Icon name="upload" size={14} />}
            >
              Index them
            </Button>
          )}
        </div>
      )}

      <Panel>
        <div className={styles.composer}>
          <label className={styles.label} htmlFor="ai-question">
            {thread.length > 0 ? 'Ask a follow-up' : 'Ask a question'}
          </label>

          <textarea
            id="ai-question"
            className={`${styles.input} ${live ? styles.inputLive : ''}`}
            rows={3}
            value={question}
            disabled={!live || report.isPending}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={onKeyDown}
            maxLength={1000}
            placeholder={
              thread.length > 0
                ? 'Ask about the answer above, or start somewhere new.'
                : 'e.g. Which posts brought in the most readers this quarter, and what do they have in common?'
            }
          />

          <div className={styles.composerFoot}>
            <div className={styles.examples}>
              <span className={styles.examplesLabel}>Try</span>
              {EXAMPLE_QUESTIONS.map((example) => (
                <Chip key={example} onClick={live ? () => setQuestion(example) : undefined}>
                  {example}
                </Chip>
              ))}
            </div>

            <div className={styles.composerActions}>
              <span className={styles.hint}>⌘↵ to send</span>
              <Button
                variant="primary"
                onClick={ask}
                disabled={!canAsk}
                loading={report.isPending}
                icon={<Icon name="spark" size={16} />}
              >
                {thread.length > 0 ? 'Ask' : 'Generate report'}
              </Button>
            </div>
          </div>
        </div>
      </Panel>

      <div className={styles.results}>
        <Panel
          title="Report"
          subtitle="Answers appear here, with the posts they were drawn from."
          action={
            thread.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setThread([])} icon={<Icon name="close" size={14} />}>
                New thread
              </Button>
            )
          }
        >
          {thread.map((entry, index) => (
            <div
              key={entry.id}
              ref={index === thread.length - 1 ? latestRef : undefined}
              className={index > 0 ? styles.turnDivider : undefined}
            >
              <Turn entry={entry} />
            </div>
          ))}

          {report.isPending && (
            <div className={thread.length > 0 ? styles.turnDivider : undefined}>
              <AnswerSkeleton question={question} />
            </div>
          )}

          {report.isError && !report.isPending && (
            <ErrorState error={report.error} onRetry={() => report.mutate(question.trim())} inset />
          )}

          {thread.length === 0 && !report.isPending && !report.isError && (
            <EmptyState
              icon="spark"
              title={live ? 'Nothing asked yet.' : "The forge isn't lit for this one yet."}
              body={
                live
                  ? 'Ask anything about what you have published, or how it performed. Every answer cites the posts it used.'
                  : 'AI Reports need the retrieval service running behind the API. Once it is connected, this page answers from your own posts.'
              }
              inset
            />
          )}
        </Panel>
      </div>
    </>
  )
}

/* ── Pieces ──────────────────────────────────────────────────────────── */

function StatusPill({ status, loading }: { status?: { available: boolean; indexedPosts: number }; loading: boolean }) {
  if (loading) return <Skeleton width={160} height={34} radius="var(--radius-chip)" />

  const live = status?.available === true
  return (
    <span className={`${styles.status} ${live ? styles.statusLive : ''}`}>
      <span className={`${styles.statusDot} ${live ? styles.statusDotLive : ''}`} />
      {live ? `Live · ${formatCount(status?.indexedPosts ?? 0)} indexed` : 'Not connected'}
    </span>
  )
}

function Turn({ entry }: { entry: ThreadEntry }) {
  const { report } = entry
  return (
    <article className={styles.turn}>
      <p className={styles.asked}>Asked</p>
      <p className={styles.question}>{entry.question}</p>

      <div className={styles.answer}>
        <Prose content={report.answer} compact />
      </div>

      {report.sources.length > 0 && (
        <div className={styles.sources}>
          <p className={styles.sourcesLabel}>Sources</p>
          <ol className={styles.sourceList}>
            {report.sources.map((source, index) => (
              <SourceCard key={source.postId} source={source} index={index + 1} />
            ))}
          </ol>
        </div>
      )}

      <p className={styles.meta}>
        {report.model}
        <span className={styles.metaDot} />
        {report.retrieval.chunks} chunk{report.retrieval.chunks === 1 ? '' : 's'}
        <span className={styles.metaDot} />
        {report.usedAnalytics ? 'with analytics' : 'content only'}
        <span className={styles.metaDot} />
        {(report.latencyMs / 1000).toFixed(1)}s
      </p>
    </article>
  )
}

function SourceCard({ source, index }: { source: AiSource; index: number }) {
  return (
    <li className={styles.source}>
      <span className={styles.sourceIndex}>{index}</span>
      <div className={styles.sourceBody}>
        <Link to={`/posts/${source.slug}`} className={styles.sourceTitle}>
          {source.title}
          <Icon name="arrowUpRight" size={13} />
        </Link>
        <p className={styles.sourceExcerpt}>{source.excerpt}</p>
        <p className={styles.sourceMeta}>
          {formatDate(source.publishedAt)}
          <span className={styles.metaDot} />
          {Math.round(source.score * 100)}% match
        </p>
      </div>
    </li>
  )
}

/** A skeleton shaped like the answer that is coming — §11, no layout shift. */
function AnswerSkeleton({ question }: { question: string }) {
  return (
    <article className={styles.turn} aria-busy="true">
      <p className={styles.asked}>Asked</p>
      <p className={styles.question}>{question}</p>
      <div className={styles.answer}>
        <Skeleton height={14} />
        <Skeleton height={14} width="94%" style={{ marginTop: 'var(--space-3)' }} />
        <Skeleton height={14} width="88%" style={{ marginTop: 'var(--space-3)' }} />
        <Skeleton height={14} width="60%" style={{ marginTop: 'var(--space-3)' }} />
      </div>
      <p className={styles.working}>
        <span className={styles.workingDot} />
        Reading your posts
      </p>
    </article>
  )
}
