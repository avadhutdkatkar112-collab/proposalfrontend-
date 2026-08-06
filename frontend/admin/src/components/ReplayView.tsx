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

const SECTION_LABELS: Record<string, string> = {
  'sec-landing': 'Home', 'sec-timeline': 'Messages', 'sec-reveal': 'The Reveal',
  'sec-gallery': 'Photo Gallery', 'sec-truth': 'The Truth', 'sec-cute': 'Cute Moment',
  'sec-reasons': 'Reasons', 'sec-letter': 'Final Letter', 'sec-proposal': 'Proposal',
  'sec-ending': 'Response',
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function binarySearchLastLE(events: ReplayEvent[], time: number): number {
  let lo = 0, hi = events.length
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (events[mid].ts <= time) lo = mid + 1
    else hi = mid
  }
  return lo
}

export default function ReplayView({ visitorId, onClose }: Props) {
  const [events, setEvents] = useState<ReplayEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [iframeReady, setIframeReady] = useState(false)
  const [currentSection, setCurrentSection] = useState('sec-landing')
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const animRef = useRef<number | null>(null)
  const startTimeRef = useRef(0)
  const pauseTimeRef = useRef(0)
  const cursorRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const eventIdxRef = useRef(0)
  const targetRef = useRef({ mx: 0.5, my: 0.5, scrollPct: 0 })
  const smoothRef = useRef({ mx: 0.5, my: 0.5 })

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

  const buildStateAt = useCallback((time: number) => {
    const t = targetRef.current
    t.mx = 0.5; t.my = 0.5; t.scrollPct = 0
    let section = 'sec-landing'

    const endIdx = binarySearchLastLE(events, time)
    for (let i = 0; i < endIdx; i++) {
      const ev = events[i]
      if (ev.type === 'mouse') {
        t.mx = (ev.data.x as number) / ((ev.data.vw as number) || 1920)
        t.my = (ev.data.y as number) / ((ev.data.vh as number) || 1080)
      }
      if (ev.type === 'scroll') {
        t.scrollPct = (ev.data.scrollPct as number) || 0
      }
      if (ev.type === 'section') {
        section = (ev.data.section as string) || section
      }
    }
    setCurrentSection(section)
    smoothRef.current = { mx: t.mx, my: t.my }
    eventIdxRef.current = endIdx
    return endIdx
  }, [events])

  const clearOverlay = () => {
    if (overlayRef.current) overlayRef.current.innerHTML = ''
  }

  const spawnClickRipple = useCallback((x: number, y: number) => {
    const overlay = overlayRef.current
    if (!overlay) return
    const el = document.createElement('div')
    el.className = 'replay-click-ripple'
    el.style.cssText = `left:${x * 100}%;top:${y * 100}%;position:absolute;transform:translate(-50%,-50%);pointer-events:none;`
    el.innerHTML = `<div style="width:36px;height:36px;border-radius:50%;border:2px solid rgba(212,175,55,0.7);box-sizing:border-box;animation:clickRing 0.7s ease-out forwards;"/>`
    overlay.appendChild(el)
    setTimeout(() => el.remove(), 750)
  }, [])

  const spawnKeyBadge = useCallback((key: string) => {
    const overlay = overlayRef.current
    if (!overlay) return
    const count = overlay.querySelectorAll('.replay-key-badge').length
    const el = document.createElement('div')
    el.className = 'replay-key-badge'
    el.style.cssText = `position:absolute;left:12px;bottom:${12 + count * 24}px;background:rgba(232,160,191,0.25);border:1px solid rgba(232,160,191,0.35);border-radius:5px;padding:3px 10px;font-size:11px;color:rgba(255,255,255,0.85);font-family:monospace;pointer-events:none;animation:replayKeyUp 1.2s ease-out forwards;`
    el.textContent = key.length > 1 ? key : key
    overlay.appendChild(el)
    setTimeout(() => el.remove(), 1300)
  }, [])

  useEffect(() => {
    if (!playing || events.length === 0 || !iframeReady) return

    startTimeRef.current = performance.now() - pauseTimeRef.current

    const tick = () => {
      const elapsed = (performance.now() - startTimeRef.current) * speed

      if (elapsed >= totalDuration) {
        setPlaying(false)
        setCurrentTime(totalDuration)
        buildStateAt(totalDuration)
        scrollIframe(targetRef.current.scrollPct)
        return
      }

      setCurrentTime(elapsed)

      const t = targetRef.current
      const idx = eventIdxRef.current
      let section = currentSection

      for (let i = idx; i < events.length; i++) {
        const ev = events[i]
        if (ev.ts > elapsed) { eventIdxRef.current = i; break }

        if (ev.type === 'mouse') {
          t.mx = (ev.data.x as number) / ((ev.data.vw as number) || 1920)
          t.my = (ev.data.y as number) / ((ev.data.vh as number) || 1080)
        }
        if (ev.type === 'scroll') {
          t.scrollPct = (ev.data.scrollPct as number) || 0
        }
        if (ev.type === 'section') {
          section = (ev.data.section as string) || section
        }
        if (ev.type === 'click') {
          const cx = (ev.data.x as number) / ((ev.data.vw as number) || 1920)
          const cy = (ev.data.y as number) / ((ev.data.vh as number) || 1080)
          spawnClickRipple(cx, cy)
        }
        if (ev.type === 'key') {
          spawnKeyBadge(ev.data.key as string)
        }

        if (i === events.length - 1) eventIdxRef.current = events.length
      }

      if (section !== currentSection) setCurrentSection(section)

      const lerpFactor = speed >= 2 ? 0.35 : 0.25
      smoothRef.current.mx = lerp(smoothRef.current.mx, t.mx, lerpFactor)
      smoothRef.current.my = lerp(smoothRef.current.my, t.my, lerpFactor)

      if (cursorRef.current) {
        cursorRef.current.style.left = `${smoothRef.current.mx * 100}%`
        cursorRef.current.style.top = `${smoothRef.current.my * 100}%`
      }

      scrollIframe(t.scrollPct)

      animRef.current = requestAnimationFrame(tick)
    }

    animRef.current = requestAnimationFrame(tick)

    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [playing, speed, totalDuration, iframeReady, events, currentSection, scrollIframe, buildStateAt, spawnClickRipple, spawnKeyBadge])

  const resetState = (time: number) => {
    clearOverlay()
    buildStateAt(time)
    scrollIframe(targetRef.current.scrollPct)
    if (cursorRef.current) {
      cursorRef.current.style.left = `${smoothRef.current.mx * 100}%`
      cursorRef.current.style.top = `${smoothRef.current.my * 100}%`
    }
  }

  const handlePlay = () => {
    if (currentTime >= totalDuration) {
      setCurrentTime(0)
      pauseTimeRef.current = 0
      resetState(0)
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
    resetState(newTime)
  }

  const handleRangeSeek = (val: number) => {
    setCurrentTime(val)
    pauseTimeRef.current = val / speed
    setPlaying(false)
    resetState(val)
  }

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000)
    const m = Math.floor(s / 60)
    return `${m}:${String(s % 60).padStart(2, '0')}`
  }

  const sectionEvents = events.filter((e) => e.type === 'section')
  const secLabel = SECTION_LABELS[currentSection] || currentSection

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(5,2,8,0.97)', backdropFilter: 'blur(16px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <style>{`
        @keyframes clickRing { 0%{transform:scale(0.2);opacity:0.9} 100%{transform:scale(1.8);opacity:0} }
        @keyframes replayKeyUp { 0%{opacity:0.9;transform:translateY(0)} 100%{opacity:0;transform:translateY(-12px)} }
      `}</style>

      <motion.div
        initial={{ scale: 0.92, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-6xl rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: 'linear-gradient(160deg, rgba(22,12,42,0.97), rgba(8,4,16,0.99))',
          border: '1px solid rgba(232,160,191,0.12)',
          boxShadow: '0 25px 80px rgba(0,0,0,0.6), 0 0 40px rgba(232,160,191,0.05)',
          height: '88vh',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="flex items-center gap-4">
            <h3 className="text-white/80 text-sm" style={{ fontFamily: 'var(--font-serif)' }}>
              Session Replay
            </h3>
            <span className="text-white/20 text-[10px]">{visitorId}</span>
            <span className="text-white/15 text-[10px]">·</span>
            <span className="text-white/25 text-[10px]">{events.length} events</span>
            <span className="text-white/15 text-[10px]">·</span>
            <span className="text-white/25 text-[10px]">{formatTime(totalDuration)}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{
              background: 'rgba(232,160,191,0.1)',
              color: 'rgba(232,160,191,0.6)',
              border: '1px solid rgba(232,160,191,0.15)',
            }}>
              {secLabel}
            </span>
            <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors text-lg cursor-pointer">✕</button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-white/30 text-sm">Loading replay...</div>
        ) : events.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-white/30 text-sm">No replay data recorded for this session.</div>
        ) : (
          <>
            {/* Main viewport */}
            <div className="flex-1 mx-4 mt-3 mb-1 rounded-xl overflow-hidden relative" style={{ minHeight: 0 }}>
              {/* REC badge */}
              {playing && (
                <div className="absolute top-3 left-3 z-30 px-2.5 py-1 rounded-md text-[10px] text-white/70 flex items-center gap-1.5 font-medium"
                  style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" style={{ animation: 'pulse 1.5s ease-in-out infinite' }} />
                  LIVE REPLAY
                </div>
              )}

              {/* Section badge top-right */}
              <div className="absolute top-3 right-3 z-30 px-2.5 py-1 rounded-md text-[10px] font-medium"
                style={{
                  background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(232,160,191,0.15)', color: 'rgba(232,160,191,0.7)',
                }}>
                {secLabel}
              </div>

              {/* Iframe */}
              <iframe
                ref={iframeRef}
                src="https://proposalfrontend.vercel.app?replay=1"
                className="w-full h-full border-0"
                style={{ pointerEvents: 'none' }}
                onLoad={() => setIframeReady(true)}
                sandbox="allow-same-origin allow-scripts"
                title="Proposal Replay"
              />

              {/* Loading overlay for iframe */}
              {!iframeReady && (
                <div className="absolute inset-0 z-25 flex items-center justify-center" style={{ background: 'rgba(8,4,16,0.95)' }}>
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-white/10 border-t-pink-400/60 rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-white/30 text-xs">Loading proposal site...</p>
                  </div>
                </div>
              )}

              {/* Overlay for cursor + click ripples + key badges */}
              <div ref={overlayRef} className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
                <div
                  ref={cursorRef}
                  className="absolute pointer-events-none"
                  style={{
                    left: '50%', top: '50%',
                    transform: 'translate(-50%, -50%)',
                    transition: 'left 0.06s linear, top 0.06s linear',
                    zIndex: 25,
                  }}
                >
                  <div className="w-6 h-6 rounded-full" style={{
                    background: 'radial-gradient(circle, rgba(232,160,191,0.35) 0%, transparent 70%)',
                    filter: 'blur(3px)',
                  }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full" style={{
                      background: '#E8A0BF',
                      boxShadow: '0 0 8px rgba(232,160,191,0.7), 0 0 20px rgba(232,160,191,0.2)',
                    }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="px-5 pb-4 pt-2 shrink-0">
              {/* Timeline */}
              <div className="relative h-8 flex items-center cursor-pointer mb-2 group" onClick={handleSeek}>
                {/* Background track */}
                <div className="w-full h-[3px] rounded-full group-hover:h-[5px] transition-all" style={{ background: 'rgba(255,255,255,0.07)' }} />

                {/* Section change markers */}
                {sectionEvents.map((ev, i) => {
                  const pct = totalDuration > 0 ? (ev.ts / totalDuration) * 100 : 0
                  return (
                    <div key={i} className="absolute w-[2px] h-3 rounded-full" style={{
                      left: `${pct}%`, top: '50%', transform: 'translate(-50%, -50%)',
                      background: 'rgba(255,255,255,0.12)',
                    }} />
                  )
                })}

                {/* Progress fill */}
                <div className="absolute h-[3px] group-hover:h-[5px] transition-all rounded-full" style={{
                  width: totalDuration > 0 ? `${(currentTime / totalDuration) * 100}%` : '0%',
                  background: 'linear-gradient(90deg, rgba(232,160,191,0.35), rgba(212,175,55,0.55))',
                }} />

                {/* Scrub handle */}
                <div className="absolute w-3.5 h-3.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" style={{
                  left: totalDuration > 0 ? `${(currentTime / totalDuration) * 100}%` : '0%',
                  background: '#E8A0BF',
                  boxShadow: '0 0 10px rgba(232,160,191,0.6)',
                  transform: 'translateX(-50%)',
                }} />
              </div>

              {/* Bottom controls row */}
              <div className="flex items-center gap-4">
                {/* Play/Pause */}
                <button
                  onClick={playing ? handlePause : handlePlay}
                  className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-105 shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, rgba(232,160,191,0.18), rgba(212,175,55,0.12))',
                    border: '1px solid rgba(232,160,191,0.25)',
                  }}
                >
                  <span className="text-white/80 text-xs">{playing ? '⏸' : '▶'}</span>
                </button>

                {/* Range slider */}
                <input
                  type="range"
                  min={0}
                  max={totalDuration}
                  value={currentTime}
                  onChange={(e) => handleRangeSeek(Number(e.target.value))}
                  className="flex-1 h-1 rounded-full appearance-none cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.08)', accentColor: '#E8A0BF' }}
                />

                {/* Time display */}
                <span className="text-white/35 text-[11px] font-mono min-w-[75px] text-right shrink-0">
                  {formatTime(currentTime)} / {formatTime(totalDuration)}
                </span>

                {/* Speed */}
                <select
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  className="text-white/40 text-[10px] bg-transparent border border-white/8 rounded px-1.5 py-1 cursor-pointer shrink-0"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={1}>1x</option>
                  <option value={2}>2x</option>
                  <option value={4}>4x</option>
                </select>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}
