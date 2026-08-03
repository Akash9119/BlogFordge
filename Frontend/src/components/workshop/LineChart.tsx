import { useId, useMemo, useState, type PointerEvent, type ReactNode } from 'react'
import type { DailyViews } from '@/lib/types'
import { formatCount, formatDate } from '@/lib/format'
import { useElementWidth } from '@/lib/useElementWidth'
import { Icon, type IconName } from '@/components/ui/Icon'
import styles from './Chart.module.css'

/*
 * Single-series daily-views line.
 *
 * Deliberate choices: one series means no legend (the title names it); the
 * line is 2px --quench with a ~10% wash beneath; grid and axes are solid
 * hairlines one step off the surface; only the endpoint is directly labelled
 * — the axis and the tooltip carry the rest. A table view holds every value,
 * so nothing is reachable only by hovering.
 *
 * The chart is drawn in real pixel coordinates against the measured container
 * width; stretching a fixed viewBox would distort strokes and text.
 */

const HEIGHT = 240
const PAD = { top: 16, right: 56, bottom: 28, left: 48 }

/** Round the axis top to a clean number so ticks read 0 / 500 / 1,000. */
function niceCeiling(max: number): number {
  if (max <= 5) return 5
  const magnitude = 10 ** Math.floor(Math.log10(max))
  for (const step of [1, 2, 2.5, 5, 10]) {
    const candidate = step * magnitude
    if (candidate >= max) return candidate
  }
  return 10 * magnitude
}

interface LineChartProps {
  data: DailyViews[]
  title: string
  subtitle?: string
  /** Held at reduced opacity during a refetch instead of flashing a skeleton. */
  stale?: boolean
  emptyMessage?: string
  action?: ReactNode
}

export function LineChart({ data, title, subtitle, stale, emptyMessage, action }: LineChartProps) {
  const [showTable, setShowTable] = useState(false)
  const [hover, setHover] = useState<number | null>(null)
  const { ref, width } = useElementWidth<HTMLDivElement>()
  const tableId = useId()

  const maxY = useMemo(() => niceCeiling(Math.max(...data.map((point) => point.views), 1)), [data])

  const points = useMemo(() => {
    if (data.length === 0) return []

    const plotW = Math.max(120, width - PAD.left - PAD.right)
    const plotH = HEIGHT - PAD.top - PAD.bottom
    const stepX = data.length === 1 ? 0 : plotW / (data.length - 1)

    return data.map((point, index) => ({
      ...point,
      // A single day sits centred rather than pinned to the left edge.
      x: data.length === 1 ? PAD.left + plotW / 2 : PAD.left + index * stepX,
      y: PAD.top + plotH - (point.views / maxY) * plotH,
    }))
  }, [data, width, maxY])

  const total = data.reduce((sum, point) => sum + point.views, 0)
  const baseline = HEIGHT - PAD.bottom

  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`).join(' ')
  const areaPath =
    points.length > 0
      ? `${linePath} L${points[points.length - 1].x},${baseline} L${points[0].x},${baseline} Z`
      : ''

  const last = points[points.length - 1]
  const ticks = [0, maxY / 2, maxY]

  // X labels only at the ends and the middle — one per day would collide.
  const xLabelIndices =
    points.length <= 1
      ? [0]
      : points.length < 6
        ? points.map((_, index) => index)
        : [0, Math.floor(points.length / 2), points.length - 1]

  function onPointerMove(event: PointerEvent<SVGSVGElement>) {
    if (points.length === 0) return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left

    // Nearest point, so the whole plot is the hit target rather than each dot.
    let nearest = 0
    let best = Infinity
    points.forEach((point, index) => {
      const distance = Math.abs(point.x - x)
      if (distance < best) {
        best = distance
        nearest = index
      }
    })
    setHover(nearest)
  }

  const hovered = hover !== null ? points[hover] : undefined

  return (
    <div>
      <header className={styles.head}>
        <div className={styles.headText}>
          <h3 className={styles.title}>{title}</h3>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          {action}
          {data.length > 0 && (
            <button
              type="button"
              className={styles.toggle}
              onClick={() => setShowTable((open) => !open)}
              aria-expanded={showTable}
              aria-controls={tableId}
            >
              {showTable ? 'Show chart' : 'Show table'}
            </button>
          )}
        </div>
      </header>

      {/* The measured element stays mounted in every branch so the width
          survives a switch to the table view and back. */}
      <div className={`${styles.chart} ${stale ? styles.stale : ''}`} ref={ref}>
        {data.length === 0 ? (
          <p className={styles.empty}>{emptyMessage ?? 'No views recorded in this range yet.'}</p>
        ) : showTable ? (
          <div className={styles.tableWrap} id={tableId}>
            <table className={styles.table}>
              <caption className="visually-hidden">{title}</caption>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Views</th>
                </tr>
              </thead>
              <tbody>
                {[...data].reverse().map((point) => (
                  <tr key={point.date}>
                    <td>{formatDate(point.date)}</td>
                    <td>{point.views.toLocaleString('en-GB')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <>
            <svg
              className={styles.svg}
              width={width}
              height={HEIGHT}
              viewBox={`0 0 ${width} ${HEIGHT}`}
              role="img"
              aria-label={`${title}. ${formatCount(total)} views across ${data.length} ${data.length === 1 ? 'day' : 'days'}. Full values are in the table view.`}
              onPointerMove={onPointerMove}
              onPointerLeave={() => setHover(null)}
              style={{ touchAction: 'pan-y' }}
            >
              {/* Recessive hairline grid + y ticks */}
              {ticks.map((tick) => {
                const y = PAD.top + (HEIGHT - PAD.top - PAD.bottom) * (1 - tick / maxY)
                return (
                  <g key={tick}>
                    <line className={styles.grid} x1={PAD.left} y1={y} x2={width - PAD.right} y2={y} />
                    <text className={styles.axisText} x={PAD.left - 8} y={y + 3} textAnchor="end">
                      {Math.round(tick).toLocaleString('en-GB')}
                    </text>
                  </g>
                )
              })}

              <path className={styles.area} d={areaPath} />
              <path className={styles.line} d={linePath} />

              {/* Endpoint marker + its direct label — the only labelled point. */}
              {last && (
                <>
                  <circle className={styles.endDot} cx={last.x} cy={last.y} r={4} />
                  <text className={styles.endLabel} x={last.x + 10} y={last.y + 4}>
                    {formatCount(last.views)}
                  </text>
                </>
              )}

              {hovered && (
                <>
                  <line className={styles.crosshair} x1={hovered.x} y1={PAD.top} x2={hovered.x} y2={baseline} />
                  <circle className={styles.hoverDot} cx={hovered.x} cy={hovered.y} r={5} />
                </>
              )}

              {xLabelIndices.map((index) => (
                <text
                  key={index}
                  className={styles.axisText}
                  x={points[index].x}
                  y={baseline + 16}
                  textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'}
                >
                  {formatDate(points[index].date).slice(0, 6)}
                </text>
              ))}
            </svg>

            {hovered && (
              <div
                className={styles.tooltip}
                style={{ left: `${hovered.x}px`, top: `${hovered.y - 12}px` }}
              >
                <span className={styles.tooltipDate}>{formatDate(hovered.date)}</span>
                <span className={styles.tooltipValue}>
                  <span className={styles.tooltipKey} />
                  {hovered.views.toLocaleString('en-GB')} views
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

interface StatTileProps {
  label: string
  value: string | number
  foot?: string
  icon?: IconName
}

export function StatTile({ label, value, foot, icon }: StatTileProps) {
  return (
    <div className={styles.tile}>
      <span className={styles.tileLabel}>
        {icon && <Icon name={icon} size={14} />}
        {label}
      </span>
      <span className={styles.tileValue}>{typeof value === 'number' ? formatCount(value) : value}</span>
      {foot && <span className={styles.tileFoot}>{foot}</span>}
    </div>
  )
}

export function StatTiles({ children }: { children: ReactNode }) {
  return <div className={styles.tiles}>{children}</div>
}
