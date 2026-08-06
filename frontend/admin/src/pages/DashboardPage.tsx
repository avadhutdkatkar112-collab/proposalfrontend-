import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getSessions, getSession, resetSession, resetAllSessions, connectSSE, clearToken } from '../api'
import ReplayView from '../components/ReplayView'

interface Session {
  id: string
  visitor_id: string
  is_online: boolean
  current_section: string | null
  progress: number
  response: string | null
  responses: string[] | null
  responded_at: string | null
  ip_address: string | null
  ip_city: string | null
  ip_region: string | null
  ip_country: string | null
  ip_org: string | null
  user_agent: string | null
  started_at: string
  last_active_at: string
  event_count: string
}

interface SessionDetail extends Session {
  events: {
    id: number
    type: string
    label: string
    section: string | null
    progress: number | null
    ip_address: string | null
    created_at: string
  }[]
}

const allSections = [
  { id: 'sec-landing', label: 'Home', icon: '🏠' },
  { id: 'sec-timeline', label: 'Messages', icon: '💌' },
  { id: 'sec-reveal', label: 'Reveal', icon: '💡' },
  { id: 'sec-gallery', label: 'Moments', icon: '📸' },
  { id: 'sec-truth', label: 'Truth', icon: '💛' },
  { id: 'sec-cute', label: 'Cute', icon: '🧸' },
  { id: 'sec-reasons', label: 'Reasons', icon: '✨' },
  { id: 'sec-letter', label: 'Letter', icon: '📝' },
  { id: 'sec-proposal', label: 'Proposal', icon: '❤️' },
  { id: 'sec-ending', label: 'Response', icon: '🎉' },
]

function getSectionStatus(session: Session, events: { section: string | null }[]) {
  const visitedSections = new Set(events.filter((e) => e.section).map((e) => e.section))
  const currentIdx = allSections.findIndex((s) => s.id === session.current_section)
  const hasResponse = !!(session.responses && session.responses.length > 0)

  return allSections.map((sec, i) => {
    const visited = visitedSections.has(sec.id)
    const isCurrent = sec.id === session.current_section
    const isAfterCurrent = currentIdx >= 0 && i > currentIdx

    let status: 'visited' | 'current' | 'skipped' | 'future' | 'completed'
    if (visited && isCurrent) status = 'current'
    else if (visited) status = 'visited'
    else if (isAfterCurrent) status = 'future'
    else if (hasResponse) status = 'completed'
    else status = 'skipped'

    return { ...sec, status }
  })
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return `${h}h ago`
}

function getDuration(events: { created_at: string }[]) {
  if (!events || events.length < 2) return '—'
  const first = new Date(events[0].created_at).getTime()
  const last = new Date(events[events.length - 1].created_at).getTime()
  const ms = last - first
  if (ms < 0) return '—'
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  return `${m}m ${s % 60}s`
}

export default function DashboardPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [selected, setSelected] = useState<SessionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [replayVisitorId, setReplayVisitorId] = useState<string | null>(null)
  const selectedRef = useRef<string | null>(null)

  useEffect(() => {
    selectedRef.current = selected?.visitor_id || null
  }, [selected?.visitor_id])

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const data = await getSessions()
        if (active) setSessions(data)
      } catch {}
      finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [refreshKey])

  // SSE — real-time updates from PostgreSQL LISTEN/NOTIFY
  useEffect(() => {
    const sse = connectSSE({
      onSessionUpdated: (data) => {
        setSessions((prev) => {
          const idx = prev.findIndex((s) => s.visitor_id === data.visitorId)
          if (idx >= 0) {
            const updated = [...prev]
            updated[idx] = { ...updated[idx], ...data.session }
            return updated
          }
          setRefreshKey((k) => k + 1)
          return prev
        })

        if (selectedRef.current === data.visitorId) {
          setSelected((prev) => prev ? { ...prev, ...data.session } : prev)
        }
      },
      onEventCreated: (data) => {
        if (selectedRef.current === data.visitorId && data.event) {
          setSelected((prev) => prev ? {
            ...prev,
            events: [...prev.events, {
              id: Date.now(),
              type: data.event.type,
              label: data.event.label,
              section: data.event.section,
              progress: data.event.progress,
              ip_address: null,
              created_at: data.event.created_at,
            }],
          } : prev)
        }

        if (data.event?.type === 'response') {
          setRefreshKey((k) => k + 1)
        }
      },
      onOpen: () => {
        setRefreshKey((k) => k + 1)
      },
      onError: () => {},
    })

    return () => sse.close()
  }, [])

  // REST polling fallback — refresh every 10s for reliability
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const data = await getSessions()
        setSessions(data)
      } catch {}
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  const handleViewDetail = async (visitorId: string) => {
    try {
      const data = await getSession(visitorId)
      setSelected(data)
    } catch {}
  }

  const handleReset = async (visitorId: string) => {
    if (!confirm('Archive and reset this session?')) return
    await resetSession(visitorId)
    setRefreshKey((k) => k + 1)
    setSelected(null)
  }

  const handleResetAll = async () => {
    if (!confirm('Archive and reset ALL sessions? This cannot be undone.')) return
    await resetAllSessions()
    setRefreshKey((k) => k + 1)
    setSelected(null)
  }

  const onlineCount = sessions.filter((s) => s.is_online).length
  const respondedCount = sessions.filter((s) => s.response).length
  const totalResponses = sessions.reduce((sum, s) => sum + ((s.responses?.length) || 0), 0)

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl md:text-2xl text-white/85 mb-1" style={{ fontFamily: 'var(--font-serif)' }}>
            Proposal Dashboard
          </h1>
          <div className="flex items-center gap-4 text-xs text-white/30">
            <span>{sessions.length} sessions</span>
            <span>·</span>
            <span className="text-green-400/60">{onlineCount} online</span>
            <span>·</span>
            <span className="text-rose-300/50">{respondedCount} responded</span>
            <span>·</span>
            <span className="text-amber-300/50">{totalResponses} responses</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setRefreshKey((k) => k + 1)} className="px-4 py-2 rounded-lg text-xs cursor-pointer transition-all hover:scale-[1.02]"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
            Refresh
          </button>
          <button onClick={handleResetAll} className="px-4 py-2 rounded-lg text-xs cursor-pointer transition-all hover:scale-[1.02]"
            style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)', color: 'rgba(239,68,68,0.5)' }}>
            Reset All
          </button>
          <button onClick={() => { clearToken(); window.location.reload() }} className="px-4 py-2 rounded-lg text-xs cursor-pointer transition-all hover:scale-[1.02]"
            style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)', color: 'rgba(239,68,68,0.5)' }}>
            Sign Out
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Session List */}
        <div className={`${selected ? 'md:w-[320px] shrink-0' : 'w-full'}`}>
          {loading ? (
            <div className="text-center py-12 text-white/20 text-sm">Loading...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 text-white/20 text-sm">No sessions yet.</div>
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => {
                const isComplete = s.progress >= 100
                const droppedOff = !s.is_online && s.progress > 0 && s.progress < 100
                return (
                  <motion.button key={s.visitor_id} layout onClick={() => handleViewDetail(s.visitor_id)}
                    className={`w-full text-left rounded-xl p-4 cursor-pointer transition-all duration-200 ${selected?.visitor_id === s.visitor_id ? 'ring-1' : ''}`}
                    style={{
                      background: selected?.visitor_id === s.visitor_id ? 'rgba(232,160,191,0.08)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${selected?.visitor_id === s.visitor_id ? 'rgba(232,160,191,0.2)' : 'rgba(255,255,255,0.05)'}`,
                    }}
                    whileHover={{ scale: 1.01 }}>

                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{
                        background: s.is_online ? '#4ADE80' : isComplete ? '#E8A0BF' : droppedOff ? '#F59E0B' : '#6B7280',
                        boxShadow: s.is_online ? '0 0 8px rgba(74,222,128,0.4)' : 'none',
                      }} />
                      <span className="text-white/60 text-sm font-medium truncate">
                        {s.ip_city || s.ip_address || s.visitor_id.slice(0, 12)}
                      </span>
                      {s.ip_country && <span className="text-white/25 text-[10px] ml-auto shrink-0">{s.ip_country}</span>}
                    </div>

                    {/* Progress bar */}
                    <div className="h-1 rounded-full overflow-hidden mb-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <div className="h-full rounded-full transition-all duration-500" style={{
                        width: `${s.progress}%`,
                        background: isComplete
                          ? 'linear-gradient(90deg, #E8A0BF, #D4AF37)'
                          : droppedOff
                          ? 'linear-gradient(90deg, #F59E0B, #F97316)'
                          : 'linear-gradient(90deg, rgba(232,160,191,0.4), rgba(200,162,200,0.4))',
                      }} />
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-white/30">
                      <span className="truncate">
                        {isComplete ? '✅ Completed' : droppedOff ? `⚠️ Left at ${s.current_section?.replace('sec-', '')}` : `${s.current_section?.replace('sec-', '') || 'landing'}`}
                      </span>
                      <span className="ml-auto shrink-0">{s.progress}%</span>
                      <span>·</span>
                      <span className="shrink-0">{timeAgo(s.last_active_at)}</span>
                    </div>
                  </motion.button>
                )
              })}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <AnimatePresence>
          {selected && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              className="flex-1 rounded-2xl p-6 overflow-y-auto" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>

              {/* Detail Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full" style={{
                    background: selected.is_online ? '#4ADE80' : '#6B7280',
                    boxShadow: selected.is_online ? '0 0 10px rgba(74,222,128,0.5)' : 'none',
                  }} />
                  <span className="text-white/70 text-sm">{selected.ip_city || 'Unknown location'}</span>
                  <span className="text-white/20 text-[10px]">{selected.ip_address}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setReplayVisitorId(selected.visitor_id)} className="px-3 py-1.5 rounded-lg text-[10px] cursor-pointer transition-all hover:scale-[1.02]"
                    style={{ background: 'rgba(232,160,191,0.08)', border: '1px solid rgba(232,160,191,0.15)', color: 'rgba(232,160,191,0.7)' }}>
                    ▶ Replay
                  </button>
                  <button onClick={() => handleReset(selected.visitor_id)} className="px-3 py-1.5 rounded-lg text-[10px] cursor-pointer transition-all hover:scale-[1.02]"
                    style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)', color: 'rgba(239,68,68,0.5)' }}>
                    Reset
                  </button>
                  <button onClick={() => setSelected(null)} className="px-3 py-1.5 rounded-lg text-[10px] cursor-pointer transition-all hover:scale-[1.02]"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
                    Close
                  </button>
                </div>
              </div>

              {/* Section Journey Map */}
              <div className="mb-6">
                <h3 className="text-white/30 text-[10px] tracking-wider uppercase mb-3">Journey Progress</h3>
                <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                  {getSectionStatus(selected, selected.events).map((sec) => (
                    <div key={sec.id} className="flex flex-col items-center gap-1">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm relative" style={{
                        background: sec.status === 'current' ? 'rgba(232,160,191,0.2)' : sec.status === 'visited' ? 'rgba(74,222,128,0.1)' : sec.status === 'completed' ? 'rgba(212,175,55,0.15)' : sec.status === 'skipped' ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${sec.status === 'current' ? 'rgba(232,160,191,0.3)' : sec.status === 'visited' ? 'rgba(74,222,128,0.15)' : sec.status === 'completed' ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.05)'}`,
                      }}>
                        <span className="opacity-80">{sec.icon}</span>
                        {sec.status === 'current' && (
                          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-400" style={{ boxShadow: '0 0 6px rgba(74,222,128,0.6)' }} />
                        )}
                      </div>
                      <span className="text-[8px] text-white/25 text-center leading-tight">{sec.label}</span>
                    </div>
                  ))}
                </div>

                {/* Status Legend */}
                <div className="flex flex-wrap gap-4 mt-3 text-[9px] text-white/25">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-green-400/30" /> Current</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded" style={{ background: 'rgba(74,222,128,0.2)' }} /> Visited</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded" style={{ background: 'rgba(245,158,11,0.15)' }} /> Dropped Off</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-white/5" /> Not Reached</span>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {[
                  { label: 'Status', value: selected.is_online ? '🟢 Online' : selected.response ? '✅ Completed' : selected.progress > 0 ? '⚠️ Left incomplete' : '🔴 Offline' },
                  { label: 'Last Section', value: selected.current_section?.replace('sec-', '').replace(/\b\w/g, (c) => c.toUpperCase()) || '—' },
                  { label: 'Progress', value: `${selected.progress}%` },
                  { label: 'Location', value: [selected.ip_city, selected.ip_country].filter(Boolean).join(', ') || '—' },
                  { label: 'ISP', value: selected.ip_org || '—' },
                  { label: 'Duration', value: getDuration(selected.events) },
                  { label: 'Started', value: formatTime(selected.started_at) },
                  { label: 'Last Active', value: formatTime(selected.last_active_at) },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <span className="text-white/25 text-[9px] tracking-wider uppercase block mb-1">{item.label}</span>
                    <span className="text-white/60 text-xs">{item.value}</span>
                  </div>
                ))}
              </div>

              {/* Responses */}
              {selected.responses && selected.responses.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-white/30 text-[10px] tracking-wider uppercase mb-3">Responses ({selected.responses.length})</h3>
                  <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div className="space-y-2">
                      {selected.responses!.map((r, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-white/15 text-[9px] font-mono whitespace-nowrap">#{i + 1}</span>
                          <span className="text-lg">
                            {r.includes('Love') ? '❤️' : r.includes('Know') ? '🌸' : r.includes('Feel') ? '🤍' : '💬'}
                          </span>
                          <span className="text-white/60 text-xs">{r}</span>
                          {i === selected.responses!.length - 1 && (
                            <span className="ml-auto text-amber-400/40 text-[9px]">latest</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Event Timeline */}
              <div>
                <h3 className="text-white/30 text-[10px] tracking-wider uppercase mb-3">Event Timeline</h3>
                <div className="rounded-xl p-3 max-h-72 overflow-y-auto space-y-1.5" style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  {selected.events.length === 0 ? (
                    <p className="text-white/15 text-xs text-center py-4">No events</p>
                  ) : (
                    selected.events.map((ev) => (
                      <div key={ev.id} className="flex items-start gap-3 py-1">
                        <span className="text-white/15 text-[9px] font-mono whitespace-nowrap mt-0.5">{formatTime(ev.created_at)}</span>
                        <span className={`text-xs ${
                          ev.type === 'response' ? 'text-rose-300/70 font-medium' : ev.type === 'open' ? 'text-white/40' : 'text-white/30'
                        }`}>
                          {ev.label}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {replayVisitorId && (
          <ReplayView visitorId={replayVisitorId} onClose={() => setReplayVisitorId(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}
