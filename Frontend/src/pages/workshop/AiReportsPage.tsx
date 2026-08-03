import { PageHeader } from '@/components/workshop/PageHeader'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Icon } from '@/components/ui/Icon'
import { Panel } from '@/components/ui/Panel'
import { EmptyState } from '@/components/ui/States'
import styles from './AiReports.module.css'

/*
 * Reserved shell — design_guide.md §8.
 *
 * The Phase-1 API exposes no AI endpoints, so nothing here is wired and no
 * endpoint is invented. The layout is the real one: a question input on top, a
 * results panel below sized for an answer plus its source citations. When the
 * FastAPI service lands behind a Node proxy route, the composer and the panel
 * swap their disabled state for real handlers — the structure doesn't move.
 */

const EXAMPLE_QUESTIONS = [
  'Which topics drove the most reads last month?',
  'Summarise what we published about performance.',
  'Which drafts overlap with something already published?',
  'What should I write about next, based on what readers open?',
]

export function AiReportsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Workshop"
        title="AI Reports"
        subtitle="Ask questions in plain language about your own posts and analytics, and get answers grounded in what you've actually published — with sources."
        actions={
          <span className={styles.status}>
            <span className={styles.statusDot} />
            Not yet wired
          </span>
        }
      />

      <Panel>
        <div className={styles.composer}>
          <label className={styles.label} htmlFor="ai-question">
            Ask a question
          </label>

          <textarea
            id="ai-question"
            className={styles.input}
            rows={3}
            disabled
            placeholder="e.g. Which posts brought in the most readers this quarter, and what do they have in common?"
          />

          <div className={styles.composerFoot}>
            <div className={styles.examples}>
              <span className={styles.examplesLabel}>Try</span>
              {EXAMPLE_QUESTIONS.map((question) => (
                <Chip key={question}>{question}</Chip>
              ))}
            </div>

            <Button variant="primary" disabled icon={<Icon name="spark" size={16} />}>
              Generate report
            </Button>
          </div>
        </div>
      </Panel>

      <div className={styles.results}>
        <Panel title="Report" subtitle="Answers appear here, with the posts they were drawn from.">
          <EmptyState
            icon="spark"
            title="The forge isn't lit for this one yet."
            body="AI Reports arrive with the retrieval service in Phase 3. This page is built and waiting — nothing here talks to a live endpoint."
            inset
          />

          <div className={styles.plan}>
            <p className={styles.planTitle}>What lands here</p>
            <ul className={styles.planList}>
              <li>
                <Icon name="check" size={14} />
                An answer written from your published posts, not the open web
              </li>
              <li>
                <Icon name="check" size={14} />
                Source citations linking back to the exact posts used
              </li>
              <li>
                <Icon name="check" size={14} />
                Follow-up questions against the same retrieved context
              </li>
            </ul>
          </div>
        </Panel>
      </div>
    </>
  )
}
