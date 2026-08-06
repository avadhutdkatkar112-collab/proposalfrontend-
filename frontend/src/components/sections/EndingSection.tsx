import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import FloatingHearts from '../ui/FloatingHearts'

const flowers = ['🌸', '🌺', '🌷', '🌹', '💐', '🌻', '🌼']

const endings: Record<string, { message: string; sub: string; hearts: number; confettiIntensity: number }> = {
  "I'd Love To": {
    message: 'You just made me the happiest person alive.',
    sub: "I promise I'll cherish this moment forever.",
    hearts: 30,
    confettiIntensity: 2,
  },
  "Let's Get To Know Each Other First": {
    message: 'That means the world to me.',
    sub: "I'll be right here, getting to know you one conversation at a time.",
    hearts: 15,
    confettiIntensity: 1,
  },
  "I Don't Feel The Same, But Thank You": {
    message: "Thank you for being honest with me.",
    sub: "I meant every word. Our bond stays exactly the same.",
    hearts: 8,
    confettiIntensity: 0,
  },
}

const defaultEnding = {
  message: 'Thank you for sharing that with me.',
  sub: "Your words mean more than you know. I'll remember this.",
  hearts: 12,
  confettiIntensity: 1,
}

export default function EndingSection({ choice }: { choice: string }) {
  const cleanupRef = useRef<(() => void) | null>(null)
  const ending = endings[choice] || defaultEnding

  useEffect(() => {
    if (ending.confettiIntensity <= 0) return

    const end = Date.now() + 3000
    const colors = ['#FFD1DC', '#E8A0BF', '#FF69B4', '#D4AF37', '#E6E6FA', '#FFB6C1']
    let running = true

    const frame = () => {
      if (!running) return
      confetti({
        particleCount: Math.ceil(2 * ending.confettiIntensity),
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      })
      confetti({
        particleCount: Math.ceil(2 * ending.confettiIntensity),
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      })
      if (Date.now() < end) requestAnimationFrame(frame)
    }
    frame()

    cleanupRef.current = () => { running = false }
    return () => { running = false }
  }, [ending.confettiIntensity])

  return (
    <section
      className="relative min-h-screen flex items-center justify-center px-6 py-24 overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse at 50% 50%, #1a1030 0%, #0d0818 70%)',
      }}
    >
      <FloatingHearts count={ending.hearts} color="#E8A0BF" />

      <div className="relative z-10 text-center max-w-lg">
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 80 }}
          className="flex justify-center gap-3 mb-8"
        >
          {flowers.map((f, i) => (
            <motion.span
              key={i}
              className="text-3xl md:text-4xl"
              animate={{
                y: [0, -15, 0],
                rotate: [0, 10, -10, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            >
              {f}
            </motion.span>
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="text-xl md:text-2xl text-white/80 mb-4"
          style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}
        >
          {ending.message}
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="text-base md:text-lg text-white/60 leading-relaxed mb-8"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          {ending.sub}
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full"
          style={{
            background: 'linear-gradient(135deg, rgba(232,160,191,0.1), rgba(212,175,55,0.1))',
            border: '1px solid rgba(232,160,191,0.2)',
          }}
        >
          <span className="text-white/40 text-sm">Your response:</span>
          <span className="text-white/70 text-sm font-medium">{choice}</span>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="mt-12 text-white/30 text-xs tracking-wider"
        >
          Thank you for reading something I never had the courage to send.
        </motion.p>
      </div>
    </section>
  )
}
