import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
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
  const [skipIdle, setSkipIdle] = useState(true)
  const autoPlayedRef = useRef(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const animRef = useRef<number | null>(null)
  const startTimeRef = useRef(0)
  const pauseTimeRef = useRef(0)
  const cursorRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const eventIdxRef = useRef(0)
  const targetRef = useRef({ mx: 0.5, my: 0.5, scrollPct: 0 })
  const smoothRef = useRef({ mx: 0.5, my: 0.5 })
  const lastFrameTimeRef = useRef(0)
  const timersRef = useRef<number[]>([])
  const speedRef = useRef(speed)
  const mountedRef = useRef(true)
  const sectionRef = useRef('sec-landing')

  speedRef.current = speed

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const data = await getReplayEvents(visitorId)
        if (mountedRef.current) setEvents(data)
      } catch {}
      finally { if (mountedRef.current) setLoading(false) }
    }
    load()
  }, [visitorId])

  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout)
      timersRef.current = []
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [])

  const totalDuration = events.length > 0 ? events[events.length - 1].ts : 0

  // Auto-play once events loaded AND iframe ready
  useEffect(() => {
    if (autoPlayedRef.current) return
    if (events.length === 0 || !iframeReady) return
    autoPlayedRef.current = true
    const t = setTimeout(() => setPlaying(true), 300)
    return () => clearTimeout(t)
  }, [events.length, iframeReady])

  // Listen for replay-ready handshake from iframe
  useEffect(() => {
    const handleMsg = (e: MessageEvent) => {
      if (e.data?.type === 'replay-ready') {
        setIframeReady(true)
      }
    }
    window.addEventListener('message', handleMsg)
    return () => window.removeEventListener('message', handleMsg)
  }, [])

  const sectionEvents = useMemo(() => events.filter((e) => e.type === 'section'), [events])

  // Event density heatmap: bucket events into 60 bins
  const heatmap = useMemo(() => {
    if (events.length === 0 || totalDuration === 0) return []
    const bins = 60
    const counts = new Array(bins).fill(0)
    for (const ev of events) {
      const idx = Math.min(bins - 1, Math.floor((ev.ts / totalDuration) * bins))
      counts[idx]++
    }
    const max = Math.max(1, ...counts)
    return counts.map((c, i) => ({ x: (i / bins) * 100, h: (c / max) * 100 }))
  }, [events, totalDuration])

  const scrollIframe = useCallback((pct: number) => {
    const iframe = iframeRef.current
    if (!iframe?.contentWindow) return
    try {
      iframe.contentWindow.postMessage({ type: 'replay-scroll', scrollPct: pct }, '*')
    } catch {}
  }, [])

  const scheduleTimer = useCallback((fn: () => void, delay: number) => {
    const id = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((t) => t !== id)
      if (mountedRef.current) fn()
    }, delay)
    timersRef.current.push(id)
    return id
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
        const pct = ev.data.scrollPct as number
        if (pct !== undefined && !Number.isNaN(pct)) {
          t.scrollPct = pct
        } else {
          const sy = (ev.data.scrollY as number) || 0
          const dh = (ev.data.docHeight as number) || 3000
          const vh = (ev.data.viewHeight as number) || 800
          t.scrollPct = dh > vh ? sy / (dh - vh) : 0
        }
      }
      if (ev.type === 'section') {
        section = (ev.data.section as string) || section
      }
    }
    sectionRef.current = section
    setCurrentSection(section)
    smoothRef.current = { mx: t.mx, my: t.my }
    eventIdxRef.current = endIdx
  }, [events])

  const clearOverlay = useCallback(() => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
    if (overlayRef.current) overlayRef.current.innerHTML = ''
  }, [])

  const spawnClickRipple = useCallback((x: number, y: number) => {
    const overlay = overlayRef.current
    if (!overlay) return
    const el = document.createElement('div')
    el.className = 'replay-click-ripple'
    el.style.cssText = `left:${x * 100}%;top:${y * 100}%;position:absolute;transform:translate(-50%,-50%);pointer-events:none;`
    el.innerHTML = `<div style="width:36px;height:36px;border-radius:50%;border:2px solid rgba(212,175,55,0.7);box-sizing:border-box;animation:clickRing 0.7s ease-out forwards;"/>`
    overlay.appendChild(el)
    scheduleTimer(() => el.remove(), 750)
  }, [scheduleTimer])

  const spawnKeyBadge = useCallback((key: string) => {
    const overlay = overlayRef.current
    if (!overlay) return
    const count = overlay.querySelectorAll('.replay-key-badge').length
    const el = document.createElement('div')
    el.className = 'replay-key-badge'
    el.style.cssText = `position:absolute;left:12px;bottom:${12 + count * 24}px;background:rgba(232,160,191,0.25);border:1px solid rgba(232,160,191,0.35);border-radius:5px;padding:3px 10px;font-size:11px;color:rgba(255,255,255,0.85);font-family:monospace;pointer-events:none;animation:replayKeyUp 1.2s ease-out forwards;`
    el.textContent = key
    overlay.appendChild(el)
    scheduleTimer(() => el.remove(), 1300)
  }, [scheduleTimer])

  useEffect(() => {
    if (!playing || events.length === 0 || !iframeReady) return

    startTimeRef.current = performance.now() - (pauseTimeRef.current * 1000)

    const tick = (frameTime: number) => {
      if (!mountedRef.current) return

      const dt = lastFrameTimeRef.current > 0 ? (frameTime - lastFrameTimeRef.current) / 1000 : 0
      lastFrameTimeRef.current = frameTime

      let elapsed = ((frameTime - startTimeRef.current) / 1000) * speedRef.current

      // Skip idle gaps: if next event is far away and we're not at a click/key, fast-forward
      if (skipIdle && eventIdxRef.current < events.length) {
        const nextEv = events[eventIdxRef.current]
        const gap = nextEv.ts - elapsed
        if (gap > 4000) {
          const jumpTime = nextEv.ts - 100
          startTimeRef.current = frameTime - (jumpTime / speedRef.current) * 1000
          elapsed = jumpTime
        }
      }

      if (elapsed >= totalDuration) {
        setPlaying(false)
        setCurrentTime(totalDuration)
        buildStateAt(totalDuration)
        scrollIframe(targetRef.current.scrollPct)
        return
      }

      setCurrentTime(elapsed)

      const t = targetRef.current
      let section = sectionRef.current

      const startIdx = eventIdxRef.current
      for (let i = startIdx; i < events.length; i++) {
        const ev = events[i]
        if (ev.ts > elapsed) {
          eventIdxRef.current = i
          break
        }

        if (ev.type === 'mouse') {
          t.mx = (ev.data.x as number) / ((ev.data.vw as number) || 1920)
          t.my = (ev.data.y as number) / ((ev.data.vh as number) || 1080)
        } else if (ev.type === 'scroll') {
          const pct = ev.data.scrollPct as number
          if (pct !== undefined && !Number.isNaN(pct)) {
            t.scrollPct = pct
          } else {
            const sy = (ev.data.scrollY as number) || 0
            const dh = (ev.data.docHeight as number) || 3000
            const vh = (ev.data.viewHeight as number) || 800
            t.scrollPct = dh > vh ? sy / (dh - vh) : 0
          }
        } else if (ev.type === 'section') {
          section = (ev.data.section as string) || section
        } else if (ev.type === 'click') {
          const cx = (ev.data.x as number) / ((ev.data.vw as number) || 1920)
          const cy = (ev.data.y as number) / ((ev.data.vh as number) || 1080)
          spawnClickRipple(cx, cy)
        } else if (ev.type === 'key') {
          spawnKeyBadge(ev.data.key as string)
        }

        if (i === events.length - 1) eventIdxRef.current = events.length
      }

      if (section !== sectionRef.current) {
        sectionRef.current = section
        setCurrentSection(section)
      }

      const lerpRate = Math.min(1, dt * (speedRef.current >= 2 ? 18 : 12))
      smoothRef.current.mx += (t.mx - smoothRef.current.mx) * lerpRate
      smoothRef.current.my += (t.my - smoothRef.current.my) * lerpRate

      if (cursorRef.current) {
        cursorRef.current.style.left = `${smoothRef.current.mx * 100}%`
        cursorRef.current.style.top = `${smoothRef.current.my * 100}%`
      }

      scrollIframe(t.scrollPct)

      animRef.current = requestAnimationFrame(tick)
    }

    lastFrameTimeRef.current = 0
    animRef.current = requestAnimationFrame(tick)

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      animRef.current = null
    }
  }, [playing, totalDuration, iframeReady, events, scrollIframe, buildStateAt, spawnClickRipple, spawnKeyBadge, skipIdle])

  const resetState = useCallback((time: number) => {
    clearOverlay()
    buildStateAt(time)
    scrollIframe(targetRef.current.scrollPct)
    if (cursorRef.current) {
      cursorRef.current.style.left = `${smoothRef.current.mx * 100}%`
      cursorRef.current.style.top = `${smoothRef.current.my * 100}%`
    }
  }, [clearOverlay, buildStateAt, scrollIframe])

  const handlePlay = useCallback(() => {
    if (currentTime >= totalDuration) {
      setCurrentTime(0)
      pauseTimeRef.current = 0
      resetState(0)
    }
    setPlaying(true)
  }, [currentTime, totalDuration, resetState])

  const handlePause = useCallback(() => {
    setPlaying(false)
    pauseTimeRef.current = currentTime / speed
  }, [currentTime, speed])

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const newTime = pct * totalDuration
    setCurrentTime(newTime)
    pauseTimeRef.current = newTime / speed
    setPlaying(false)
    resetState(newTime)
  }, [totalDuration, speed, resetState])

  const handleRangeSeek = useCallback((val: number) => {
    setCurrentTime(val)
    pauseTimeRef.current = val / speed
    setPlaying(false)
    resetState(val)
  }, [speed, resetState])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return

      if (e.code === 'Space') {
        e.preventDefault()
        if (playing) handlePause()
        else handlePlay()
      }
      if (e.code === 'ArrowRight') {
        e.preventDefault()
        const newTime = Math.min(totalDuration, currentTime + 5000)
        handleRangeSeek(newTime)
      }
      if (e.code === 'ArrowLeft') {
        e.preventDefault()
        const newTime = Math.max(0, currentTime - 5000)
        handleRangeSeek(newTime)
      }
      if (e.code === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [playing, currentTime, totalDuration, handlePlay, handlePause, handleRangeSeek, onClose])

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000)
    const m = Math.floor(s / 60)
    return `${m}:${String(s % 60).padStart(2, '0')}`
  }

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
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes clickRing { 0%{transform:scale(0.2);opacity:0.9} 100%{transform:scale(1.8);opacity:0} }
        @keyframes replayKeyUp { 0%{opacity:0.9;transform:translateY(0)} 100%{opacity:0;transform:translateY(-12px)} }
        .replay-range::-webkit-slider-thumb { -webkit-appearance:none; width:12px; height:12px; border-radius:50%; background:#E8A0BF; cursor:pointer; box-shadow:0 0 6px rgba(232,160,191,0.5); }
        .replay-range::-moz-range-thumb { width:12px; height:12px; border-radius:50%; background:#E8A0BF; border:none; cursor:pointer; }
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
        <div className="flex items-center justify-between px-6 py-3 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="flex items-center gap-4">
            <h3 className="text-white/80 text-sm" style={{ fontFamily: 'var(--font-serif)' }}>Session Replay</h3>
            <span className="text-white/20 text-[10px]">{visitorId}</span>
            <span className="text-white/15 text-[10px]">·</span>
            <span className="text-white/25 text-[10px]">{events.length} events</span>
            <span className="text-white/15 text-[10px]">·</span>
            <span className="text-white/25 text-[10px]">{formatTime(totalDuration)}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{
              background: 'rgba(232,160,191,0.1)', color: 'rgba(232,160,191,0.6)',
              border: '1px solid rgba(232,160,191,0.15)',
            }}>{secLabel}</span>
            <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors text-lg cursor-pointer">✕</button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-white/30 text-sm">Loading replay...</div>
        ) : events.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-white/30 text-sm">No replay data recorded for this session.</div>
        ) : (
          <>
            <div className="flex-1 mx-4 mt-3 mb-1 rounded-xl overflow-hidden relative" style={{ minHeight: 0 }}>
              {playing && (
                <div className="absolute top-3 left-3 z-30 px-2.5 py-1 rounded-md text-[10px] text-white/70 flex items-center gap-1.5 font-medium"
                  style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" style={{ animation: 'pulse 1.5s ease-in-out infinite' }} />
                  LIVE REPLAY
                </div>
              )}

              <div className="absolute top-3 right-3 z-30 px-2.5 py-1 rounded-md text-[10px] font-medium"
                style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(232,160,191,0.15)', color: 'rgba(232,160,191,0.7)' }}>
                {secLabel}
              </div>

              <iframe
                ref={iframeRef}
                src="https://proposalfrontend.vercel.app?replay=1"
                className="w-full h-full border-0"
                style={{ pointerEvents: 'none' }}
                onLoad={() => setIframeReady(true)}
                sandbox="allow-same-origin allow-scripts"
                title="Proposal Replay"
              />

              {!iframeReady && (
                <div className="absolute inset-0 z-25 flex items-center justify-center" style={{ background: 'rgba(8,4,16,0.95)' }}>
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-white/10 border-t-pink-400/60 rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-white/30 text-xs">Loading proposal site...</p>
                  </div>
                </div>
              )}

              <div ref={overlayRef} className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
                <div
                  ref={cursorRef}
                  className="absolute pointer-events-none"
                  style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)', zIndex: 25 }}
                >
                  <div className="w-6 h-6 rounded-full" style={{
                    background: 'radial-gradient(circle, rgba(232,160,191,0.35) 0%, transparent 70%)', filter: 'blur(3px)',
                  }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full" style={{
                      background: '#E8A0BF', boxShadow: '0 0 8px rgba(232,160,191,0.7), 0 0 20px rgba(232,160,191,0.2)',
                    }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 pb-4 pt-2 shrink-0">
              <div className="relative h-8 flex items-center cursor-pointer mb-2 group" onClick={handleSeek}>
                <div className="w-full h-[3px] rounded-full group-hover:h-[5px] transition-all" style={{ background: 'rgba(255,255,255,0.07)' }} />

                {/* Event density heatmap */}
                <div className="absolute inset-x-0 bottom-0 h-6 flex items-end pointer-events-none opacity-40">
                  {heatmap.map((bin, i) => (
                    <div key={i} className="flex-1 mx-[0.5px] rounded-sm" style={{
                      height: `${Math.max(6, bin.h)}%`,
                      background: 'linear-gradient(180deg, rgba(212,175,55,0.6), rgba(232,160,191,0.2))',
                      opacity: 0.3 + (bin.h / 100) * 0.7,
                    }} />
                  ))}
                </div>

                {sectionEvents.map((ev, i) => {
                  const pct = totalDuration > 0 ? (ev.ts / totalDuration) * 100 : 0
                  return (
                    <div key={i} className="absolute w-[2px] h-3 rounded-full" style={{
                      left: `${pct}%`, top: '50%', transform: 'translate(-50%, -50%)',
                      background: 'rgba(255,255,255,0.12)',
                    }} />
                  )
                })}

                <div className="absolute h-[3px] group-hover:h-[5px] transition-all rounded-full" style={{
                  width: totalDuration > 0 ? `${(currentTime / totalDuration) * 100}%` : '0%',
                  background: 'linear-gradient(90deg, rgba(232,160,191,0.35), rgba(212,175,55,0.55))',
                }} />

                <div className="absolute w-3.5 h-3.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" style={{
                  left: totalDuration > 0 ? `${(currentTime / totalDuration) * 100}%` : '0%',
                  background: '#E8A0BF', boxShadow: '0 0 10px rgba(232,160,191,0.6)', transform: 'translateX(-50%)',
                }} />
              </div>

              {/* Section quick-jump chips */}
              {sectionEvents.length > 1 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {sectionEvents.map((ev, i) => {
                    const label = SECTION_LABELS[ev.data.section as string] || (ev.data.section as string) || ''
                    const active = currentSection === ev.data.section
                    return (
                      <button
                        key={i}
                        onClick={() => handleRangeSeek(ev.ts)}
                        className={`px-2 py-0.5 rounded-md text-[9px] cursor-pointer transition-all ${active ? 'scale-105' : 'hover:scale-105'}`}
                        style={{
                          background: active ? 'rgba(232,160,191,0.2)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${active ? 'rgba(232,160,191,0.3)' : 'rgba(255,255,255,0.08)'}`,
                          color: active ? 'rgba(232,160,191,0.8)' : 'rgba(255,255,255,0.35)',
                        }}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              )}

              <div className="flex items-center gap-4">
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

                <input
                  type="range"
                  min={0}
                  max={totalDuration}
                  value={currentTime}
                  onChange={(e) => handleRangeSeek(Number(e.target.value))}
                  className="flex-1 h-1 rounded-full appearance-none cursor-pointer replay-range"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                />

                <span className="text-white/35 text-[11px] font-mono min-w-[75px] text-right shrink-0">
                  {formatTime(currentTime)} / {formatTime(totalDuration)}
                </span>

                <button
                  onClick={() => setSkipIdle((v) => !v)}
                  className={`px-2 py-1 rounded-md text-[9px] cursor-pointer transition-all shrink-0 ${skipIdle ? '' : 'opacity-50'}`}
                  style={{
                    background: skipIdle ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${skipIdle ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.08)'}`,
                    color: skipIdle ? 'rgba(212,175,55,0.6)' : 'rgba(255,255,255,0.3)',
                  }}
                  title="Skip idle gaps over 4s"
                >
                  ⚡ Skip idle
                </button>

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

              <div className="flex items-center gap-3 mt-2 text-[9px] text-white/20">
                <span>Space: play/pause</span>
                <span>← →: seek 5s</span>
                <span>Esc: close</span>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}
