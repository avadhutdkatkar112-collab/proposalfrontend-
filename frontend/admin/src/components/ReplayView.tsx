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
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number | null>(null)
  const startTimeRef = useRef(0)
  const pauseTimeRef = useRef(0)
  const mouseRef = useRef({ x: 0, y: 0 })
  const clicksRef = useRef<{ x: number; y: number; time: number }[]>([])
  const scrollRef = useRef(0)
  const keysRef = useRef<{ key: string; time: number }[]>([])

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

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height

    // Background
    ctx.fillStyle = '#0d0818'
    ctx.fillRect(0, 0, w, h)

    // Grid lines
    ctx.strokeStyle = 'rgba(232,160,191,0.05)'
    ctx.lineWidth = 1
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke()
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
    }

    // Replay cursor
    const mx = mouseRef.current.x
    const my = mouseRef.current.y
    ctx.beginPath()
    ctx.arc(mx, my, 8, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(232,160,191,0.6)'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(mx, my, 4, 0, Math.PI * 2)
    ctx.fillStyle = '#E8A0BF'
    ctx.fill()

    // Cursor trail
    ctx.beginPath()
    ctx.arc(mx, my, 20, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(232,160,191,0.1)'
    ctx.fill()

    // Clicks
    const now = performance.now()
    clicksRef.current = clicksRef.current.filter((c) => now - c.time < 800)
    clicksRef.current.forEach((c) => {
      const age = (now - c.time) / 800
      const r = 15 + age * 25
      const alpha = 0.6 * (1 - age)
      ctx.beginPath()
      ctx.arc(c.x, c.y, r, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(212,175,55,${alpha})`
      ctx.lineWidth = 2
      ctx.stroke()
    })

    // Scroll indicator
    if (scrollRef.current > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.15)'
      ctx.font = '10px monospace'
      ctx.fillText(`scroll: ${Math.round(scrollRef.current)}px`, 10, h - 10)
    }

    // Recent keys
    const recentKeys = keysRef.current.filter((k) => now - k.time < 1500)
    recentKeys.forEach((k, i) => {
      const age = (now - k.time) / 1500
      const alpha = 0.7 * (1 - age)
      ctx.fillStyle = `rgba(255,255,255,${alpha})`
      ctx.font = '13px monospace'
      ctx.fillText(k.key, 15 + i * 30, h - 30)
    })

    // Timeline bar
    const barY = h - 50
    ctx.fillStyle = 'rgba(255,255,255,0.05)'
    ctx.fillRect(50, barY, w - 100, 4)
    if (totalDuration > 0) {
      const progress = (currentTime / totalDuration) * (w - 100)
      ctx.fillStyle = 'rgba(232,160,191,0.5)'
      ctx.fillRect(50, barY, progress, 4)
    }
  }, [currentTime, totalDuration])

  useEffect(() => {
    if (!playing || events.length === 0) return

    startTimeRef.current = performance.now() - pauseTimeRef.current

    const tick = () => {
      const elapsed = (performance.now() - startTimeRef.current) * speed
      const time = elapsed

      if (time >= totalDuration) {
        setPlaying(false)
        setCurrentTime(totalDuration)
        return
      }

      setCurrentTime(time)

      // Process events up to current time
      for (const ev of events) {
        if (ev.ts > time) break

        if (ev.type === 'mouse') {
          const vw = (ev.data.vw as number) || 1920
          const vh = (ev.data.vh as number) || 1080
          const canvas = canvasRef.current
          if (canvas) {
            mouseRef.current = {
              x: ((ev.data.x as number) / vw) * canvas.width,
              y: ((ev.data.y as number) / vh) * canvas.height,
            }
          }
        }

        if (ev.type === 'click') {
          const vw = (ev.data.vw as number) || 1920
          const vh = (ev.data.vh as number) || 1080
          const canvas = canvasRef.current
          if (canvas) {
            clicksRef.current.push({
              x: ((ev.data.x as number) / vw) * canvas.width,
              y: ((ev.data.y as number) / vh) * canvas.height,
              time: performance.now(),
            })
          }
        }

        if (ev.type === 'scroll') {
          scrollRef.current = (ev.data.scrollY as number) || 0
        }

        if (ev.type === 'key') {
          keysRef.current.push({
            key: (ev.data.key as string) || '?',
            time: performance.now(),
          })
        }
      }

      animRef.current = requestAnimationFrame(tick)
    }

    animRef.current = requestAnimationFrame(tick)

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [playing, speed, events, totalDuration])

  useEffect(() => {
    drawFrame()
  }, [drawFrame])

  const handlePlay = () => {
    if (currentTime >= totalDuration) {
      setCurrentTime(0)
      pauseTimeRef.current = 0
    }
    setPlaying(true)
  }

  const handlePause = () => {
    setPlaying(false)
    pauseTimeRef.current = currentTime / speed
  }

  const handleSeek = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const barStart = 50
    const barWidth = canvas.width - 100
    const pct = Math.max(0, Math.min(1, (x - barStart) / barWidth))
    const newTime = pct * totalDuration
    setCurrentTime(newTime)
    pauseTimeRef.current = newTime / speed
    setPlaying(false)

    // Reset state
    mouseRef.current = { x: 0, y: 0 }
    clicksRef.current = []
    scrollRef.current = 0
    keysRef.current = []

    // Replay events up to seek point
    for (const ev of events) {
      if (ev.ts > newTime) break
      if (ev.type === 'mouse') {
        const vw = (ev.data.vw as number) || 1920
        const vh = (ev.data.vh as number) || 1080
        mouseRef.current = {
          x: ((ev.data.x as number) / vw) * canvas.width,
          y: ((ev.data.y as number) / vh) * canvas.height,
        }
      }
      if (ev.type === 'scroll') scrollRef.current = (ev.data.scrollY as number) || 0
    }

    drawFrame()
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
      <motion.div
        initial={{ scale: 0.9, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-4xl rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(26,16,48,0.95), rgba(13,8,24,0.98))',
          border: '1px solid rgba(232,160,191,0.15)',
        }}
      >
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h3 className="text-white/80 text-sm" style={{ fontFamily: 'var(--font-serif)' }}>
              Session Replay
            </h3>
            <p className="text-white/30 text-[10px]">{visitorId} · {events.length} events · {formatTime(totalDuration)}</p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors text-lg cursor-pointer">✕</button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-white/30 text-sm">Loading replay...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-20 text-white/30 text-sm">No replay data recorded for this session.</div>
        ) : (
          <>
            <div className="px-6 pb-2">
              <canvas
                ref={canvasRef}
                width={960}
                height={540}
                className="w-full rounded-lg cursor-pointer"
                style={{ background: '#0d0818' }}
                onClick={handleSeek}
              />
            </div>

            <div className="px-6 py-4 flex items-center gap-4">
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

              <div className="flex-1">
                <input
                  type="range"
                  min={0}
                  max={totalDuration}
                  value={currentTime}
                  onChange={(e) => {
                    const t = Number(e.target.value)
                    setCurrentTime(t)
                    pauseTimeRef.current = t / speed
                    setPlaying(false)
                  }}
                  className="w-full h-1 rounded-full appearance-none cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.1)' }}
                />
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
