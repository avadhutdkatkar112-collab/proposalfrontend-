import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { SessionData } from '../../hooks/useSessionTracker'

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
}

function formatDuration(ms: number) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function getProgressColor(progress: number) {
  if (progress >= 100) return '#E8A0BF'
  if (progress >= 60) return '#C8A2C8'
  if (progress >= 30) return '#D4AF37'
  return 'rgba(255,255,255,0.3)'
}

export default function Dashboard({
  session,
  onReset,
  onClose,
}: {
  session: SessionData
  onReset: () => void
  onClose: () => void
}) {
  const [now, setNow] = useState(Date.now())
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const timeOnPage = now - session.startedAt
  const lastEvent = session.events[session.events.length - 1]
  const isOnline = lastEvent && now - lastEvent.timestamp < 30000

  const handleReset = () => {
    onReset()
    setShowResetConfirm(false)
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(5,2,8,0.92)', backdropFilter: 'blur(12px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 30 }}
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(26,16,48,0.95), rgba(13,8,24,0.98))',
          border: '1px solid rgba(232,160,191,0.15)',
          boxShadow: '0 25px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-1">
            <h2
              className="text-white/80 text-sm tracking-[0.2em] uppercase"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Proposal Dashboard
            </h2>
            <button
              onClick={onClose}
              className="text-white/30 hover:text-white/60 transition-colors text-lg cursor-pointer"
            >
              ✕
            </button>
          </div>
          <p className="text-white/25 text-[10px] tracking-wider">Private — Only visible to you</p>
        </div>

        <div className="px-6 pb-6 space-y-5">
          {/* Status */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  background: isOnline ? '#4ADE80' : '#EF4444',
                  boxShadow: isOnline ? '0 0 8px rgba(74,222,128,0.5)' : 'none',
                }}
              />
              <span className="text-white/50 text-xs">{isOnline ? 'Online' : 'Offline'}</span>
            </div>
            <div className="h-3 w-px bg-white/10" />
            <span className="text-white/30 text-xs">
              Session {formatDuration(timeOnPage)}
            </span>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-white/40 text-[10px] tracking-wider uppercase">Progress</span>
              <span className="text-white/50 text-xs font-mono">{session.progress}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${getProgressColor(session.progress)}, #E8A0BF)` }}
                animate={{ width: `${session.progress}%` }}
                transition={{ type: 'spring', stiffness: 80, damping: 15 }}
              />
            </div>
          </div>

          {/* Current Section */}
          <div
            className="rounded-xl p-4"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <span className="text-white/30 text-[10px] tracking-wider uppercase block mb-2">
              Current Section
            </span>
            <span className="text-white/70 text-sm" style={{ fontFamily: 'var(--font-serif)' }}>
              {session.currentSection
                .replace('sec-', '')
                .replace(/-/g, ' ')
                .replace(/\b\w/g, (c) => c.toUpperCase())}
            </span>
          </div>

          {/* Response (if submitted) */}
          {session.response && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl p-4"
              style={{
                background: 'linear-gradient(135deg, rgba(232,160,191,0.08), rgba(212,175,55,0.05))',
                border: '1px solid rgba(232,160,191,0.15)',
              }}
            >
              <span className="text-white/30 text-[10px] tracking-wider uppercase block mb-2">
                Response
              </span>
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {session.response.includes('Love') ? '❤️' : session.response.includes('Know') ? '🌸' : '🤍'}
                </span>
                <span className="text-white/80 text-sm font-medium">{session.response}</span>
              </div>
              {session.respondedAt && (
                <span className="text-white/25 text-[10px] mt-1 block">
                  {formatTime(session.respondedAt)}
                </span>
              )}
            </motion.div>
          )}

          {/* Timeline */}
          <div>
            <span className="text-white/30 text-[10px] tracking-wider uppercase block mb-3">
              Timeline
            </span>
            <div
              className="rounded-xl p-3 max-h-48 overflow-y-auto"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              {session.events.length === 0 ? (
                <p className="text-white/20 text-xs text-center py-4">No events yet</p>
              ) : (
                <div className="space-y-2">
                  {session.events.map((event, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="text-white/20 text-[10px] font-mono whitespace-nowrap mt-0.5">
                        {formatTime(event.timestamp)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span
                          className={`text-xs ${
                            event.type === 'response'
                              ? 'text-rose font-medium'
                              : event.type === 'open'
                              ? 'text-white/50'
                              : 'text-white/40'
                          }`}
                        >
                          {event.label}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 py-2.5 rounded-lg text-xs tracking-wider cursor-pointer transition-all duration-200 hover:scale-[1.02]"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.5)',
              }}
            >
              Refresh
            </button>
            <button
              onClick={() => setShowResetConfirm(true)}
              className="flex-1 py-2.5 rounded-lg text-xs tracking-wider cursor-pointer transition-all duration-200 hover:scale-[1.02]"
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.15)',
                color: 'rgba(239,68,68,0.6)',
              }}
            >
              Reset Session
            </button>
          </div>
        </div>

        {/* Reset Confirmation Modal */}
        <AnimatePresence>
          {showResetConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center rounded-2xl"
              style={{ background: 'rgba(5,2,8,0.9)' }}
            >
              <div className="text-center px-6">
                <p className="text-white/70 text-sm mb-1">Reset this session?</p>
                <p className="text-white/30 text-xs mb-5">All tracking data will be cleared.</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 py-2 rounded-lg text-xs cursor-pointer"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.5)',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReset}
                    className="flex-1 py-2 rounded-lg text-xs cursor-pointer"
                    style={{
                      background: 'rgba(239,68,68,0.15)',
                      border: '1px solid rgba(239,68,68,0.25)',
                      color: 'rgba(239,68,68,0.8)',
                    }}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
