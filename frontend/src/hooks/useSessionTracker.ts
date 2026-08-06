import { useCallback, useEffect, useRef, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || ''

export interface SessionEvent {
  type: 'open' | 'section' | 'response' | 'reset' | 'heartbeat'
  label: string
  timestamp: number
  section?: string
  progress?: number
}

export interface SessionData {
  id: string
  startedAt: number
  events: SessionEvent[]
  response: string | null
  respondedAt: number | null
  currentSection: string
  progress: number
}

const STORAGE_KEY = 'proposal_visitor_id'

function getVisitorId(): string {
  let id = localStorage.getItem(STORAGE_KEY)
  if (!id) {
    id = Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
    localStorage.setItem(STORAGE_KEY, id)
  }
  return id
}

const sectionLabels: Record<string, string> = {
  'sec-landing': 'Landing Page',
  'sec-timeline': 'Deleted Messages',
  'sec-reveal': 'The Reveal',
  'sec-gallery': 'Photo Gallery',
  'sec-truth': 'The Truth',
  'sec-cute': 'Cute Moment',
  'sec-reasons': 'Reasons',
  'sec-letter': 'Final Letter',
  'sec-proposal': 'Proposal',
  'sec-ending': 'Response',
}

const sectionOrder = [
  'sec-landing',
  'sec-timeline',
  'sec-reveal',
  'sec-gallery',
  'sec-truth',
  'sec-cute',
  'sec-reasons',
  'sec-letter',
  'sec-proposal',
  'sec-ending',
]

async function postEvent(data: Record<string, unknown>) {
  try {
    await fetch(`${API_URL}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  } catch {
    // Silently fail — tracking is best-effort
  }
}

export function useSessionTracker() {
  const visitorId = useRef(getVisitorId())
  const [session, setSession] = useState<SessionData>({
    id: visitorId.current,
    startedAt: Date.now(),
    events: [],
    response: null,
    respondedAt: null,
    currentSection: 'sec-landing',
    progress: 0,
  })

  const lastSection = useRef<string>('sec-landing')

  const trackSection = useCallback(
    (sectionId: string) => {
      if (sectionId === lastSection.current) return
      lastSection.current = sectionId

      const idx = sectionOrder.indexOf(sectionId)
      const progress = idx >= 0 ? Math.round((idx / (sectionOrder.length - 1)) * 100) : 0
      const label = sectionLabels[sectionId] || sectionId

      setSession((prev) => ({
        ...prev,
        currentSection: sectionId,
        progress,
        events: [
          ...prev.events,
          {
            type: 'section' as const,
            label: `Viewing ${label}`,
            timestamp: Date.now(),
            section: sectionId,
            progress,
          },
        ],
      }))

      postEvent({
        visitorId: visitorId.current,
        type: 'section',
        label: `Viewing ${label}`,
        section: sectionId,
        progress,
      })
    },
    []
  )

  const trackResponse = useCallback(
    (response: string) => {
      setSession((prev) => ({
        ...prev,
        response,
        respondedAt: Date.now(),
        progress: 100,
        events: [
          ...prev.events,
          {
            type: 'response' as const,
            label: `Response Submitted: ${response}`,
            timestamp: Date.now(),
            progress: 100,
          },
        ],
      }))

      postEvent({
        visitorId: visitorId.current,
        type: 'response',
        label: `Response Submitted: ${response}`,
        progress: 100,
      })
    },
    []
  )

  const resetSession = useCallback(() => {
    // Archive via API
    postEvent({
      visitorId: visitorId.current,
      type: 'reset',
      label: 'Session Reset',
      progress: 0,
    })

    // Generate new visitor ID
    const newId = Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
    localStorage.setItem(STORAGE_KEY, newId)
    visitorId.current = newId

    setSession({
      id: newId,
      startedAt: Date.now(),
      events: [],
      response: null,
      respondedAt: null,
      currentSection: 'sec-landing',
      progress: 0,
    })
    lastSection.current = 'sec-landing'
  }, [])

  // Track initial open
  useEffect(() => {
    postEvent({
      visitorId: visitorId.current,
      type: 'open',
      label: 'Opened Proposal',
      progress: 0,
    })
  }, [])

  // Heartbeat every 15s
  useEffect(() => {
    const interval = setInterval(() => {
      postEvent({
        visitorId: visitorId.current,
        type: 'heartbeat',
        section: lastSection.current,
        progress: session.progress,
      })
    }, 15000)

    return () => clearInterval(interval)
  }, [session.progress])

  // Mark offline on page unload
  useEffect(() => {
    const handleUnload = () => {
      navigator.sendBeacon(
        `${API_URL}/api/events/offline`,
        JSON.stringify({ visitorId: visitorId.current })
      )
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [])

  return {
    session,
    trackSection,
    trackResponse,
    resetSession,
    sectionLabels,
  }
}
