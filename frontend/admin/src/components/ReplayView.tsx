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

const SECTIONS = [
  { id: 'sec-landing', label: 'Home', icon: '🏠' },
  { id: 'sec-timeline', label: 'Messages', icon: '💌' },
  { id: 'sec-reveal', label: 'Reveal', icon: '💡' },
  { id: 'sec-gallery', label: 'Gallery', icon: '📸' },
  { id: 'sec-truth', label: 'Truth', icon: '💛' },
  { id: 'sec-cute', label: 'Cute', icon: '🧸' },
  { id: 'sec-reasons', label: 'Reasons', icon: '✨' },
  { id: 'sec-letter', label: 'Letter', icon: '📝' },
  { id: 'sec-proposal', label: 'Proposal', icon: '❤️' },
  { id: 'sec-ending', label: 'Response', icon: '🎉' },
]

const SECTION_COLORS: Record<string, string> = {
  'sec-landing': '#E8A0BF',
  'sec-timeline': '#D4AF37',
  'sec-reveal': '#FFD700',
  'sec-gallery': '#FF69B4',
  'sec-truth': '#FFB6C1',
  'sec-cute': '#DDA0DD',
  'sec-reasons': '#F0E68C',
  'sec-letter': '#87CEEB',
  'sec-proposal': '#FF1493',
  'sec-ending': '#FFD700',
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
  const sectionRef = useRef('sec-landing')
  const scrollYRef = useRef(0)
  const docHeightRef = useRef(1)
  const viewHeightRef = useRef(1)
  const mouseTrailRef = useRef<{ x: number; y: number; age: number }[]>([])

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

  const processEventsUpTo = useCallback((time: number) => {
    for (const ev of events) {
      if (ev.ts > time) break

      if (ev.type === 'mouse') {
        const vw = (ev.data.vw as number) || 1920
        const vh = (ev.data.vh as number) || 1080
        const canvas = canvasRef.current
        if (canvas) {
          const nx = (ev.data.x as number) / vw
          const ny = (ev.data.y as number) / vh
          mouseTrailRef.current.push({ x: nx, y: ny, age: 0 })
          if (mouseTrailRef.current.length > 40) mouseTrailRef.current.shift()
          mouseRef.current = { x: nx * canvas.width, y: ny * canvas.height }
        }
        if (ev.data.section) sectionRef.current = ev.data.section as string
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
        scrollYRef.current = (ev.data.scrollY as number) || 0
        docHeightRef.current = (ev.data.docHeight as number) || 3000
        viewHeightRef.current = (ev.data.viewHeight as number) || window.innerHeight
        if (ev.data.section) sectionRef.current = ev.data.section as string
      }

      if (ev.type === 'section') {
        sectionRef.current = (ev.data.section as string) || 'sec-landing'
      }

      if (ev.type === 'key') {
        keysRef.current.push({
          key: (ev.data.key as string) || '?',
          time: performance.now(),
        })
      }
    }
  }, [events])

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height
    const now = performance.now()

    ctx.fillStyle = '#0a0612'
    ctx.fillRect(0, 0, w, h)

    const currentSectionIdx = SECTIONS.findIndex((s) => s.id === sectionRef.current)
    const totalSections = SECTIONS.length

    // Section nav strip on left
    const stripW = 40
    const stripH = h - 40
    const stripX = 10
    const stripY = 20
    const secH = stripH / totalSections

    for (let i = 0; i < totalSections; i++) {
      const sy = stripY + i * secH
      const sec = SECTIONS[i]
      const isCurrent = i === currentSectionIdx

      ctx.fillStyle = isCurrent ? 'rgba(232,160,191,0.25)' : 'rgba(255,255,255,0.03)'
      ctx.fillRect(stripX, sy + 1, stripW - 2, secH - 2)

      if (isCurrent) {
        ctx.fillStyle = SECTION_COLORS[sec.id] || '#E8A0BF'
        ctx.fillRect(stripX, sy + 1, 3, secH - 2)
      }

      ctx.fillStyle = isCurrent ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)'
      ctx.font = `${isCurrent ? '11' : '9'}px sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(sec.icon, stripX + stripW / 2, sy + secH / 2 + 3)
    }

    // Page content area
    const pageX = stripW + 20
    const pageW = w - pageX - 10
    const pageH = h - 40

    // Page background with section color tint
    const sectionColor = SECTION_COLORS[sectionRef.current] || '#E8A0BF'
    const gradient = ctx.createLinearGradient(pageX, 20, pageX + pageW, 20 + pageH)
    gradient.addColorStop(0, 'rgba(13,8,24,0.95)')
    gradient.addColorStop(0.5, `${sectionColor}08`)
    gradient.addColorStop(1, 'rgba(13,8,24,0.95)')
    ctx.fillStyle = gradient
    ctx.fillRect(pageX, 20, pageW, pageH)

    // Page border
    ctx.strokeStyle = `${sectionColor}20`
    ctx.lineWidth = 1
    ctx.strokeRect(pageX, 20, pageW, pageH)

    // Section name at top of page
    const sec = SECTIONS[currentSectionIdx] || SECTIONS[0]
    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    ctx.font = '20px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(sec.icon, pageX + pageW / 2, 60)

    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    ctx.font = '12px sans-serif'
    ctx.fillText(sec.label, pageX + pageW / 2, 80)

    // Scroll position as page indicator
    const scrollPct = docHeightRef.current > viewHeightRef.current
      ? scrollYRef.current / (docHeightRef.current - viewHeightRef.current)
      : 0

    const indicatorH = pageH - 80
    const indicatorY = 90

    // Scroll track
    ctx.fillStyle = 'rgba(255,255,255,0.04)'
    ctx.fillRect(pageX + pageW - 14, indicatorY, 4, indicatorH)

    // Scroll thumb
    const thumbH = Math.max(20, (viewHeightRef.current / docHeightRef.current) * indicatorH)
    const thumbY = indicatorY + scrollPct * (indicatorH - thumbH)
    ctx.fillStyle = `${sectionColor}60`
    ctx.fillRect(pageX + pageW - 14, thumbY, 4, thumbH)

    // Mouse trail
    mouseTrailRef.current.forEach((pt) => {
      pt.age += 0.02
      const alpha = Math.max(0, 0.3 - pt.age * 0.3)
      if (alpha <= 0) return
      const px = pageX + pt.x * pageW
      const py = 20 + pt.y * pageH
      ctx.beginPath()
      ctx.arc(px, py, 2, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(232,160,191,${alpha})`
      ctx.fill()
    })
    mouseTrailRef.current = mouseTrailRef.current.filter((pt) => pt.age < 1)

    // Mouse cursor
    const mx = pageX + mouseRef.current.x * pageW
    const my = 20 + mouseRef.current.y * pageH

    ctx.beginPath()
    ctx.arc(mx, my, 10, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(232,160,191,0.15)'
    ctx.fill()

    ctx.beginPath()
    ctx.arc(mx, my, 5, 0, Math.PI * 2)
    ctx.fillStyle = '#E8A0BF'
    ctx.fill()

    ctx.beginPath()
    ctx.arc(mx, my, 2, 0, Math.PI * 2)
    ctx.fillStyle = '#fff'
    ctx.fill()

    // Clicks
    clicksRef.current = clicksRef.current.filter((c) => now - c.time < 1000)
    clicksRef.current.forEach((c) => {
      const age = (now - c.time) / 1000
      const r = 12 + age * 30
      const alpha = 0.7 * (1 - age)

      ctx.beginPath()
      ctx.arc(c.x, c.y, r, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(212,175,55,${alpha})`
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.beginPath()
      ctx.arc(c.x, c.y, 3, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(212,175,55,${alpha})`
      ctx.fill()
    })

    // Keyboard overlay
    const recentKeys = keysRef.current.filter((k) => now - k.time < 2000)
    if (recentKeys.length > 0) {
      const kx = pageX + 15
      const ky = pageH + 10

      recentKeys.forEach((k, i) => {
        const age = (now - k.time) / 2000
        const alpha = 0.8 * (1 - age)
        const x = kx + i * 28

        ctx.fillStyle = `rgba(232,160,191,${alpha * 0.2})`
        ctx.beginPath()
        ctx.roundRect(x, ky - 12, 24, 18, 3)
        ctx.fill()

        ctx.fillStyle = `rgba(255,255,255,${alpha})`
        ctx.font = '10px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(k.key.length > 1 ? k.key.slice(0, 3) : k.key, x + 12, ky)
      })
    }

    // Bottom timeline
    const barY = h - 14
    const barX = stripW + 20
    const barW = w - barX - 50

    ctx.fillStyle = 'rgba(255,255,255,0.06)'
    ctx.fillRect(barX, barY, barW, 3)

    if (totalDuration > 0) {
      const progress = (currentTime / totalDuration) * barW
      const grad = ctx.createLinearGradient(barX, 0, barX + progress, 0)
      grad.addColorStop(0, 'rgba(232,160,191,0.3)')
      grad.addColorStop(1, 'rgba(212,175,55,0.5)')
      ctx.fillStyle = grad
      ctx.fillRect(barX, barY, progress, 3)
    }

    // Section change markers on timeline
    let lastSec = ''
    for (const ev of events) {
      if (ev.type === 'section' && ev.data.section !== lastSec) {
        lastSec = ev.data.section as string
        const mx2 = barX + (ev.ts / totalDuration) * barW
        ctx.fillStyle = 'rgba(255,255,255,0.15)'
        ctx.fillRect(mx2 - 1, barY - 3, 2, 9)
      }
    }

    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.font = '9px monospace'
    ctx.textAlign = 'right'
    ctx.fillText(`${sec.label}`, w - 10, barY - 2)
  }, [currentTime, totalDuration, events])

  useEffect(() => {
    if (!playing || events.length === 0) return

    startTimeRef.current = performance.now() - pauseTimeRef.current

    const tick = () => {
      const elapsed = (performance.now() - startTimeRef.current) * speed

      if (elapsed >= totalDuration) {
        setPlaying(false)
        setCurrentTime(totalDuration)
        processEventsUpTo(totalDuration)
        drawFrame()
        return
      }

      setCurrentTime(elapsed)
      processEventsUpTo(elapsed)
      drawFrame()

      animRef.current = requestAnimationFrame(tick)
    }

    animRef.current = requestAnimationFrame(tick)

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [playing, speed, totalDuration, processEventsUpTo, drawFrame])

  useEffect(() => {
    if (!playing) drawFrame()
  }, [drawFrame, playing])

  const handlePlay = () => {
    if (currentTime >= totalDuration) {
      setCurrentTime(0)
      pauseTimeRef.current = 0
      mouseRef.current = { x: 0, y: 0 }
      clicksRef.current = []
      scrollRef.current = 0
      scrollYRef.current = 0
      keysRef.current = []
      mouseTrailRef.current = []
      sectionRef.current = 'sec-landing'
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
    const scaleX = canvas.width / rect.width
    const scaledX = x * scaleX

    const stripW = 40
    const barX = stripW + 20
    const barW = canvas.width - barX - 50
    const pct = Math.max(0, Math.min(1, (scaledX - barX) / barW))
    const newTime = pct * totalDuration

    setCurrentTime(newTime)
    pauseTimeRef.current = newTime / speed
    setPlaying(false)

    mouseRef.current = { x: 0, y: 0 }
    clicksRef.current = []
    scrollRef.current = 0
    scrollYRef.current = 0
    keysRef.current = []
    mouseTrailRef.current = []
    sectionRef.current = 'sec-landing'

    processEventsUpTo(newTime)
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
        className="w-full max-w-5xl rounded-2xl overflow-hidden"
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
                style={{ background: '#0a0612' }}
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
                    mouseTrailRef.current = []
                    processEventsUpTo(t)
                    drawFrame()
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
