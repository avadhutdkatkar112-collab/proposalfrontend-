import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { getReplayEvents } from '../api'

interface ReplayEvent {
  type: string
  data: Record<string, unknown>
  ts: number
}

interface Props {
  visitorId: string
  onClose: () => void
}

export default function ReplayView({ visitorId, onClose }: Props) {
  const [events, setEvents] = useState<ReplayEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [iframeReady, setIframeReady] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const animRef = useRef<number | null>(null)
  const startTimeRef = useRef(0)
  const pauseTimeRef = useRef(0)
  const cursorRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef({
    scrollPct: 0,
    mouseX: 0.5,
    mouseY: 0.5,
    clicks: [] as { x: number; y: number; el: HTMLDivElement }[],
    keys: [] as { key: string; el: HTMLDivElement }[],
  })

  useEffect(() => {
    async function load() {
      try {
        const data = await getReplayEvents(visitorId)
        setEvents(data)
      } catch {}
      finally { setLoading(false) }
    }
    load()
  }, [visitorId])

  const totalDuration = events.length > 0 ? events[events.length - 1].ts : 0

  const scrollIframe = useCallback((pct: number) => {
    const iframe = iframeRef.current
    if (!iframe?.contentWindow) return
    try {
      iframe.contentWindow.postMessage({ type: 'replay-scroll', scrollPct: pct }, '*')
    } catch {}
  }, [])

  const processEventsUpTo = useCallback((time: number) => {
    const state = stateRef.current
    for (const ev of events) {
      if (ev.ts > time) break

      if (ev.type === 'mouse') {
        const vw = (ev.data.vw as number) || 1920
        const vh = (ev.data.vh as number) || 1080
        state.mouseX = (ev.data.x as number) / vw
        state.mouseY = (ev.data.y as number) / vh
      }

      if (ev.type === 'click') {
        const vw = (ev.data.vw as number) || 1920
        const vh = (ev.data.vh as number) || 1080
        const x = (ev.data.x as number) / vw
        const y = (ev.data.y as number) / vh

        if (overlayRef.current) {
          const ripple = document.createElement('div')
          ripple.className = 'absolute pointer-events-none'
          ripple.style.cssText = `
            left: ${x * 100}%; top: ${y * 100}%;
            transform: translate(-50%, -50%);
          `
          ripple.innerHTML = `
            <div style="width:40px;height:40px;border-radius:50%;border:2px solid rgba(212,175,55,0.6);
              animation: clickRipple 0.8s ease-out forwards;"></div>
            <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
              <div style="width:6px;height:6px;border-radius:50%;background:rgba(212,175,55,0.8);
                animation: clickFade 0.8s ease-out forwards;"></div>
            </div>
          `
          overlayRef.current.appendChild(ripple)
          setTimeout(() => ripple.remove(), 900)
        }
      }

      if (ev.type === 'scroll') {
        state.scrollPct = (ev.data.scrollPct as number) || 0
      }

      if (ev.type === 'key') {
        if (overlayRef.current) {
          const k = ev.data.key as string
          const badge = document.createElement('div')
          badge.className = 'absolute pointer-events-none'
          badge.style.cssText = `
            left: 12px; bottom: 12px;
            background: rgba(232,160,191,0.2); border: 1px solid rgba(232,160,191,0.3);
            border-radius: 4px; padding: 2px 8px;
            font-size: 11px; color: rgba(255,255,255,0.8); font-family: monospace;
            animation: keyFade 1.5s ease-out forwards;
          `
          badge.textContent = k.length > 1 ? k : k
          overlayRef.current.appendChild(badge)
          setTimeout(() => badge.remove(), 1600)
        }
      }
    }
  }, [events])

  useEffect(() => {
    if (!playing || events.length === 0 || !iframeReady) return

    startTimeRef.current = performance.now() - pauseTimeRef.current

    const tick = () => {
      const elapsed = (performance.now() - startTimeRef.current) * speed

      if (elapsed >= totalDuration) {
        setPlaying(false)
        setCurrentTime(totalDuration)
        processEventsUpTo(totalDuration)
        scrollIframe(stateRef.current.scrollPct)
        return
      }

      setCurrentTime(elapsed)
      processEventsUpTo(elapsed)
      scrollIframe(stateRef.current.scrollPct)

      if (cursorRef.current) {
        cursorRef.current.style.left = `${stateRef.current.mouseX * 100}%`
        cursorRef.current.style.top = `${stateRef.current.mouseY * 100}%`
      }

      animRef.current = requestAnimationFrame(tick)
    }

    animRef.current = requestAnimationFrame(tick)

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [playing, speed, totalDuration, iframeReady, processEventsUpTo, scrollIframe])

  const handlePlay = () => {
    if (currentTime >= totalDuration) {
      setCurrentTime(0)
      pauseTimeRef.current = 0
      stateRef.current = { scrollPct: 0, mouseX: 0.5, mouseY: 0.5, clicks: [], keys: [] }
      scrollIframe(0)
      if (overlayRef.current) overlayRef.current.innerHTML = ''
    }
    setPlaying(true)
  }

  const handlePause = () => {
    setPlaying(false)
    pauseTimeRef.current = currentTime / speed
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const newTime = pct * totalDuration

    setCurrentTime(newTime)
    pauseTimeRef.current = newTime / speed
    setPlaying(false)

    stateRef.current.mouseX = 0.5
    stateRef.current.mouseY = 0.5
    stateRef.current.scrollPct = 0
    stateRef.current.clicks = []
    stateRef.current.keys = []
    if (overlayRef.current) overlayRef.current.innerHTML = ''

    processEventsUpTo(newTime)
    scrollIframe(stateRef.current.scrollPct)

    if (cursorRef.current) {
      cursorRef.current.style.left = `${stateRef.current.mouseX * 100}%`
      cursorRef.current.style.top = `${stateRef.current.mouseY * 100}%`
    }
  }

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000)
    const m = Math.floor(s / 60)
    return `${m}:${String(s % 60).padStart(2, '0')}`
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(5,2,8,0.95)', backdropFilter: 'blur(12px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <style>{`
        @keyframes clickRipple {
          0% { transform: scale(0.3); opacity: 0.8; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes clickFade {
          0% { opacity: 0.8; }
          100% { opacity: 0; }
        }
        @keyframes keyFade {
          0% { opacity: 0.8; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-10px); }
        }
      `}</style>

      <motion.div
        initial={{ scale: 0.9, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-6xl rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: 'linear-gradient(135deg, rgba(26,16,48,0.95), rgba(13,8,24,0.98))',
          border: '1px solid rgba(232,160,191,0.15)',
          height: '85vh',
        }}
      >
        <div className="flex items-center justify-between px-6 py-3 shrink-0">
          <div>
            <h3 className="text-white/80 text-sm" style={{ fontFamily: 'var(--font-serif)' }}>
              Session Replay
            </h3>
            <p className="text-white/30 text-[10px]">{visitorId} · {events.length} events · {formatTime(totalDuration)}</p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors text-lg cursor-pointer">✕</button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-white/30 text-sm">Loading replay...</div>
        ) : events.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-white/30 text-sm">No replay data recorded for this session.</div>
        ) : (
          <>
            <div className="flex-1 mx-4 mb-2 rounded-xl overflow-hidden relative" style={{ minHeight: 0 }}>
              {playing && (
                <div className="absolute top-2 left-2 z-30 px-2 py-0.5 rounded text-[10px] text-white/60 flex items-center gap-1.5"
                  style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  REC
                </div>
              )}

              <iframe
                ref={iframeRef}
                src="https://proposalfrontend.vercel.app"
                className="w-full h-full border-0"
                style={{ pointerEvents: 'none' }}
                onLoad={() => setIframeReady(true)}
                sandbox="allow-same-origin allow-scripts"
                title="Proposal Replay"
              />

              <div ref={overlayRef} className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
                <div
                  ref={cursorRef}
                  className="absolute pointer-events-none"
                  style={{
                    left: '50%', top: '50%',
                    transform: 'translate(-50%, -50%)',
                    transition: 'left 0.05s linear, top 0.05s linear',
                    zIndex: 25,
                  }}
                >
                  <div className="w-5 h-5 rounded-full" style={{
                    background: 'radial-gradient(circle, rgba(232,160,191,0.4) 0%, transparent 70%)',
                    filter: 'blur(2px)',
                  }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full" style={{ background: '#E8A0BF', boxShadow: '0 0 6px rgba(232,160,191,0.6)' }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-4 pb-3 flex items-center gap-4 shrink-0">
              <button
                onClick={playing ? handlePause : handlePlay}
                className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, rgba(232,160,191,0.2), rgba(212,175,55,0.15))',
                  border: '1px solid rgba(232,160,191,0.3)',
                }}
              >
                <span className="text-white/80 text-sm">{playing ? '⏸' : '▶'}</span>
              </button>

              <div className="flex-1 relative h-6 flex items-center cursor-pointer" onClick={handleSeek}>
                <div className="w-full h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }} />
                <div className="absolute h-1 rounded-full" style={{
                  width: totalDuration > 0 ? `${(currentTime / totalDuration) * 100}%` : '0%',
                  background: 'linear-gradient(90deg, rgba(232,160,191,0.4), rgba(212,175,55,0.6))',
                }} />
                <div className="absolute w-3 h-3 rounded-full" style={{
                  left: totalDuration > 0 ? `${(currentTime / totalDuration) * 100}%` : '0%',
                  background: '#E8A0BF',
                  boxShadow: '0 0 8px rgba(232,160,191,0.5)',
                  transform: 'translateX(-50%)',
                }} />
              </div>

              <span className="text-white/40 text-xs font-mono min-w-[80px]">
                {formatTime(currentTime)} / {formatTime(totalDuration)}
              </span>

              <select
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="text-white/50 text-xs bg-transparent border border-white/10 rounded px-2 py-1 cursor-pointer"
              >
                <option value={0.5}>0.5x</option>
                <option value={1}>1x</option>
                <option value={2}>2x</option>
                <option value={4}>4x</option>
              </select>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}
