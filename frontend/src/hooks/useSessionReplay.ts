import { useEffect, useRef } from 'react'

const API_URL = import.meta.env.VITE_API_URL || ''
const FLUSH_INTERVAL = 2000
const MOUSE_THROTTLE = 50

interface ReplayEvent {
  type: 'mouse' | 'click' | 'key' | 'scroll'
  data: Record<string, unknown>
  ts: number
}

function getVisitorId(): string {
  return localStorage.getItem('proposal_visitor_id') || 'unknown'
}

export function useSessionReplay() {
  const buffer = useRef<ReplayEvent[]>([])
  const startTime = useRef(Date.now())
  const lastMouse = useRef(0)
  const flushTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const addEvent = (type: ReplayEvent['type'], data: Record<string, unknown>) => {
    buffer.current.push({
      type,
      data,
      ts: Date.now() - startTime.current,
    })
  }

  const flush = async () => {
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
  }

  useEffect(() => {
    startTime.current = Date.now()

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now()
      if (now - lastMouse.current < MOUSE_THROTTLE) return
      lastMouse.current = now
      addEvent('mouse', { x: e.clientX, y: e.clientY, vw: window.innerWidth, vh: window.innerHeight })
    }

    const handleClick = (e: MouseEvent) => {
      addEvent('click', { x: e.clientX, y: e.clientY, tag: (e.target as HTMLElement)?.tagName, vw: window.innerWidth, vh: window.innerHeight })
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') return
      addEvent('key', { key: e.key, code: e.code })
    }

    const handleScroll = () => {
      addEvent('scroll', { scrollY: window.scrollY, scrollX: window.scrollX })
    }

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
  }, [])
}
