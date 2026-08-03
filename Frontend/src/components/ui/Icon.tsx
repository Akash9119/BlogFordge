import type { SVGProps } from 'react'

/**
 * One inline stroke-icon set. Currency: 1.5px strokes on a 24 grid, inheriting
 * `currentColor` so icons take the colour of whatever they sit in.
 */
export type IconName =
  | 'search'
  | 'plus'
  | 'close'
  | 'check'
  | 'menu'
  | 'chevronLeft'
  | 'chevronRight'
  | 'chevronDown'
  | 'arrowLeft'
  | 'arrowUpRight'
  | 'dots'
  | 'edit'
  | 'trash'
  | 'eye'
  | 'image'
  | 'upload'
  | 'file'
  | 'folder'
  | 'tag'
  | 'comment'
  | 'chart'
  | 'users'
  | 'user'
  | 'gauge'
  | 'spark'
  | 'settings'
  | 'logout'
  | 'archive'
  | 'flame'
  | 'droplet'
  | 'clock'
  | 'alert'
  | 'info'
  | 'filter'
  | 'link'

const PATHS: Record<IconName, string> = {
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM20 20l-4-4',
  plus: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M4 12.5l5 5L20 6.5',
  menu: 'M4 7h16M4 12h16M4 17h16',
  chevronLeft: 'M15 5l-7 7 7 7',
  chevronRight: 'M9 5l7 7-7 7',
  chevronDown: 'M5 9l7 7 7-7',
  arrowLeft: 'M19 12H5m0 0 6-6m-6 6 6 6',
  arrowUpRight: 'M7 17 17 7M8 7h9v9',
  dots: 'M12 6h.01M12 12h.01M12 18h.01',
  edit: 'M4 20h4L19 9a2.5 2.5 0 0 0-4-3L4 17v3ZM14.5 6.5l3 3',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6',
  eye: 'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  image: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6',
  upload: 'M12 16V4m0 0L7 9m5-5 5 5M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2',
  file: 'M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7l-4-4ZM14 3v4h4M9 13h6M9 17h4',
  folder: 'M3 7a1 1 0 0 1 1-1h5l2 2h8a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7Z',
  tag: 'M3 3h7l11 11-7 7L3 10V3ZM7.5 7.5h.01',
  comment: 'M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5Z',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  users: 'M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 20v-2a4 4 0 0 0-3-3.9M16 2.1a4 4 0 0 1 0 7.8',
  user: 'M20 21v-2a5 5 0 0 0-5-5H9a5 5 0 0 0-5 5v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  gauge: 'M12 21a9 9 0 1 0-9-9M12 21a9 9 0 0 0 9-9M12 12l4.5-4.5',
  spark: 'M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4L12 3ZM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-2.8-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H3.9a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.1-2.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1V3.9a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 2.8 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.3a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.5 1.1Z',
  logout: 'M9 20H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h4M16 17l5-5-5-5M21 12H9',
  archive: 'M3 5h18v4H3zM5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4',
  // The forge marks: a flame for hot work, a droplet for the quench.
  flame: 'M12 2s5 5 5 9a5 5 0 0 1-10 0c0-1.5.7-2.8 1.5-3.8C9.2 8.4 10 9.5 10 11c0-3 2-5.5 2-9Z',
  droplet: 'M12 3s6 6.4 6 10.2A6 6 0 0 1 6 13.2C6 9.4 12 3 12 3Z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3.5 2',
  alert: 'M12 3 2 20h20L12 3ZM12 10v4M12 17.5h.01',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 11v5M12 8h.01',
  filter: 'M3 5h18l-7 8v6l-4 2v-8L3 5Z',
  link: 'M10 13a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7L11.5 5.8M14 11a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 19.7l1.5-1.5',
}

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
  size?: number
  /** Give a label only when the icon is the sole content of a control. */
  label?: string
}

export function Icon({ name, size = 18, label, ...rest }: IconProps) {
  return (
    <svg
      {...rest}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      style={{ flexShrink: 0, ...rest.style }}
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
