import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import styles from './Prose.module.css'

/**
 * Renders post content. Markdown is the authoring format (the API stores
 * `content` as a plain string, and derives the excerpt and reading time from
 * it — so we keep it free of markup).
 *
 * react-markdown does not evaluate raw HTML unless `rehype-raw` is added, so
 * post bodies cannot inject script. Keep it that way.
 */
export function Prose({ content, compact }: { content: string; compact?: boolean }) {
  return (
    <div className={`${styles.prose} ${compact ? styles.compact : ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Wide tables scroll inside their own container — §13.
          table: ({ children }) => (
            <div className={styles.tableWrap}>
              <table>{children}</table>
            </div>
          ),
          a: ({ href, children }) => {
            const external = href?.startsWith('http')
            return (
              <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}>
                {children}
              </a>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
