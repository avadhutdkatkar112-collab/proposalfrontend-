import { useEffect, useRef, useCallback } from 'react'
import { getVisitorId } from '../lib/visitorId'

const API_URL = import.meta.env.VITE_API_URL || ''
const FLUSH_INTERVAL = 2000
const MOUSE_THROTTLE = 50
const SCROLL_THROTTLE = 100

interface ReplayEvent {
  type: 'mouse' | 'click' | 'key' | 'scroll' | 'section' | 'hash'
  data: Record<string, unknown>
  ts: number
}

const SECTION_IDS = [
  'sec-landing', 'sec-timeline', 'sec-reveal', 'sec-gallery',
  'sec-truth', 'sec-cute', 'sec-reasons', 'sec-letter',
  'sec-proposal', 'sec-ending',
]

const SECTION_LABELS: Record<string, string> = {
  'sec-landing': 'Home',
  'sec-timeline': 'Messages',
  'sec-reveal': 'The Reveal',
  'sec-gallery': 'Photo Gallery',
  'sec-truth': 'The Truth',
  'sec-cute': 'Cute Moment',
  'sec-reasons': 'Reasons',
  'sec-letter': 'Final Letter',
  'sec-proposal': 'Proposal',
  'sec-ending': 'Response',
}

// Cache section rects — refreshed on scroll/load only, not per mouse move
let cachedRects: { id: string; top: number; bottom: number; height: number }[] | null = null
let rectCacheTime = 0

function refreshRectCache() {
  cachedRects = SECTION_IDS
    .map((id) => {
      const el = document.getElementById(id)
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { id, top: r.top, bottom: r.bottom, height: r.height }
    })
    .filter((x): x is { id: string; top: number; bottom: number; height: number } => x !== null)
  rectCacheTime = Date.now()
}

function getVisibleSection(): string {
  // Refresh cache on scroll — rects change as we scroll
  if (!cachedRects || Date.now() - rectCacheTime > 200) {
    refreshRectCache()
  }
  if (!cachedRects) return 'sec-landing'
  let best = 'sec-landing'
  let bestRatio = 0
  const viewH = window.innerHeight
  for (const r of cachedRects) {
    const visibleTop = Math.max(r.top, 0)
    const visibleBottom = Math.min(r.bottom, viewH)
    const visible = Math.max(0, visibleBottom - visibleTop)
    const ratio = visible / Math.min(r.height, viewH)
    if (ratio > bestRatio) {
      bestRatio = ratio
      best = r.id
    }
  }
  return best
}

export function useSessionReplay() {
  const buffer = useRef<ReplayEvent[]>([])
  const startTime = useRef(Date.now())
  const lastMouse = useRef(0)
  const lastScroll = useRef(0)
  const lastSection = useRef('')
  const flushTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const addEvent = useCallback((type: ReplayEvent['type'], data: Record<string, unknown>) => {
    buffer.current.push({
      type,
      data,
      ts: Date.now() - startTime.current,
    })
  }, [])

  const flush = useCallback(async (retry = true) => {
    if (buffer.current.length === 0) return
    const events = [...buffer.current]
    buffer.current = []

    try {
      const res = await fetch(`${API_URL}/api/events/replay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId: getVisitorId(), events }),
      })
      if (!res.ok && retry) {
        // Retry once on failure — put events back if nothing else queued
        buffer.current = [...events, ...buffer.current]
        setTimeout(() => flush(false), 3000)
      }
    } catch (e) {
      if (retry) {
        buffer.current = [...events, ...buffer.current]
        setTimeout(() => flush(false), 3000)
      }
    }
  }, [])

  useEffect(() => {
    startTime.current = Date.now()
    refreshRectCache()

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now()
      if (now - lastMouse.current < MOUSE_THROTTLE) return
      lastMouse.current = now
      addEvent('mouse', {
        x: e.clientX,
        y: e.clientY,
        vw: window.innerWidth,
        vh: window.innerHeight,
      })
    }

    const handleClick = (e: MouseEvent) => {
      addEvent('click', {
        x: e.clientX, y: e.clientY,
        tag: (e.target as HTMLElement)?.tagName,
        vw: window.innerWidth, vh: window.innerHeight,
      })
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') return
      addEvent('key', { key: e.key, code: e.code })
    }

    const handleScroll = () => {
      const now = Date.now()
      if (now - lastScroll.current < SCROLL_THROTTLE) return
      lastScroll.current = now

      const scrollPct = document.documentElement.scrollHeight > window.innerHeight
        ? window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)
        : 0
      const section = getVisibleSection()
      if (section !== lastSection.current) {
        lastSection.current = section
        addEvent('section', { section, label: SECTION_LABELS[section] || section })
      }
      addEvent('scroll', {
        scrollY: window.scrollY,
        scrollPct,
        docHeight: document.documentElement.scrollHeight,
        viewHeight: window.innerHeight,
        section,
      })
    }

    const handleResize = () => {
      refreshRectCache()
    }

    const section = getVisibleSection()
    lastSection.current = section
    addEvent('section', { section, label: SECTION_LABELS[section] || section })

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('click', handleClick)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleResize)

    flushTimer.current = setInterval(() => flush(true), FLUSH_INTERVAL)

    const handleUnload = () => {
      if (buffer.current.length === 0) return
      const events = [...buffer.current]
      buffer.current = []
      const blob = new Blob([JSON.stringify({ visitorId: getVisitorId(), events })], { type: 'application/json' })
      navigator.sendBeacon(`${API_URL}/api/events/replay`, blob)
    }
    window.addEventListener('beforeunload', handleUnload)
    document.addEventListener('visibilitychange', handleUnload)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('click', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('beforeunload', handleUnload)
      document.removeEventListener('visibilitychange', handleUnload)
      if (flushTimer.current) clearInterval(flushTimer.current)
      flush(false)
    }
  }, [addEvent, flush])
}
