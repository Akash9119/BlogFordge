import { useEffect, type RefObject } from 'react'
import { useLocation } from 'react-router-dom'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Scroll reveal for everything under `root` marked `data-reveal`. Content
 * arrives asynchronously (queries, pagination), so a MutationObserver keeps
 * picking up new nodes. "In view" is a data attribute, not a class, so React
 * re-rendering className can never hide an element again.
 */
export function useReveal(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const container = root.current
    if (!container) return

    const pending = () => container.querySelectorAll<HTMLElement>('[data-reveal]:not([data-in])')

    if (reducedMotion() || !('IntersectionObserver' in window)) {
      const showAll = () => pending().forEach((node) => node.setAttribute('data-in', ''))
      showAll()
      const mutations = new MutationObserver(showAll)
      mutations.observe(container, { childList: true, subtree: true })
      return () => mutations.disconnect()
    }

    // A wipe starts fully clipped by its own clip-path, which Chrome counts as
    // "not intersecting" — so watch its parent and reveal the wipe from that.
    const targets = new Map<Element, HTMLElement>()
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const node = targets.get(entry.target)
          node?.setAttribute('data-in', '')
          targets.delete(entry.target)
          io.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
    )
    const scan = () =>
      pending().forEach((node) => {
        const watched = node.dataset.reveal === 'wipe' && node.parentElement ? node.parentElement : node
        if (targets.has(watched)) return
        targets.set(watched, node)
        io.observe(watched)
      })
    scan()
    const mutations = new MutationObserver(scan)
    mutations.observe(container, { childList: true, subtree: true })
    return () => {
      io.disconnect()
      mutations.disconnect()
    }
  }, [root])
}

/**
 * Inertial scrolling for the Reader (Lenis). Skipped entirely under reduced
 * motion. Also returns to the top on every page change — a new page should
 * start at its beginning.
 */
export function useSmoothScroll() {
  const { pathname } = useLocation()

  useEffect(() => {
    if (reducedMotion()) return
    const lenis = new Lenis({ autoRaf: true, lerp: 0.11 })
    return () => lenis.destroy()
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
}
