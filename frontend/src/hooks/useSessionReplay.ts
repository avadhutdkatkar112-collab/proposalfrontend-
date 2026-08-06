import { useEffect, useRef, useCallback } from 'react'

const API_URL = import.meta.env.VITE_API_URL || ''
const FLUSH_INTERVAL = 2000
const MOUSE_THROTTLE = 50

interface ReplayEvent {
  type: 'mouse' | 'click' | 'key' | 'scroll' | 'section'
  data: Record<string, unknown>
  ts: number
}

function getVisitorId(): string {
  return localStorage.getItem('proposal_visitor_id') || 'unknown'
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

function getVisibleSection(): string {
  let best = 'sec-landing'
  let bestRatio = 0
  for (const id of SECTION_IDS) {
    const el = document.getElementById(id)
    if (!el) continue
    const rect = el.getBoundingClientRect()
    const viewH = window.innerHeight
    const visibleTop = Math.max(rect.top, 0)
    const visibleBottom = Math.min(rect.bottom, viewH)
    const visible = Math.max(0, visibleBottom - visibleTop)
    const ratio = visible / Math.min(rect.height, viewH)
    if (ratio > bestRatio) {
      bestRatio = ratio
      best = id
    }
  }
  return best
}

export function useSessionReplay() {
  const buffer = useRef<ReplayEvent[]>([])
  const startTime = useRef(Date.now())
  const lastMouse = useRef(0)
  const lastSection = useRef('')
  const flushTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const addEvent = useCallback((type: ReplayEvent['type'], data: Record<string, unknown>) => {
    buffer.current.push({
      type,
      data,
      ts: Date.now() - startTime.current,
    })
  }, [])

  const flush = useCallback(async () => {
    if (buffer.current.length === 0) return
    const events = [...buffer.current]
    buffer.current = []

    try {
      await fetch(`${API_URL}/api/events/replay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId: getVisitorId(), events }),
      })
    } catch {}
  }, [])

  useEffect(() => {
    startTime.current = Date.now()

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now()
      if (now - lastMouse.current < MOUSE_THROTTLE) return
      lastMouse.current = now
      const section = getVisibleSection()
      addEvent('mouse', {
        x: e.clientX, y: e.clientY,
        vw: window.innerWidth, vh: window.innerHeight,
        scrollY: window.scrollY,
        section,
      })
    }

    const handleClick = (e: MouseEvent) => {
      const section = getVisibleSection()
      addEvent('click', {
        x: e.clientX, y: e.clientY,
        tag: (e.target as HTMLElement)?.tagName,
        vw: window.innerWidth, vh: window.innerHeight,
        scrollY: window.scrollY,
        section,
      })
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') return
      addEvent('key', { key: e.key, code: e.code })
    }

    const handleScroll = () => {
      const section = getVisibleSection()
      if (section !== lastSection.current) {
        lastSection.current = section
        addEvent('section', { section, label: SECTION_LABELS[section] || section })
      }
      addEvent('scroll', {
        scrollY: window.scrollY,
        scrollX: window.scrollX,
        docHeight: document.documentElement.scrollHeight,
        viewHeight: window.innerHeight,
        section,
      })
    }

    const section = getVisibleSection()
    lastSection.current = section
    addEvent('section', { section, label: SECTION_LABELS[section] || section })

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('click', handleClick)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('scroll', handleScroll)

    flushTimer.current = setInterval(flush, FLUSH_INTERVAL)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('click', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('scroll', handleScroll)
      if (flushTimer.current) clearInterval(flushTimer.current)
      flush()
    }
  }, [addEvent, flush])
}
