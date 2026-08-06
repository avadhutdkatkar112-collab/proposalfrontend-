import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useInView } from '../../hooks/useInView'
import confetti from 'canvas-confetti'

function TeddyBear() {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -20 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 120, delay: 0.3 }}
      className="text-8xl md:text-9xl mb-8"
    >
      <motion.span
        animate={{ rotate: [-5, 5, -5] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="inline-block"
      >
        🧸
      </motion.span>
    </motion.div>
  )
}

export default function CuteSection() {
  const { ref, isInView } = useInView(0.2)
  const [showMessage, setShowMessage] = useState(false)
  const cleanupRef = useRef<(() => void) | null>(null)

  const fireConfetti = useCallback(() => {
    const end = Date.now() + 2000
    const colors = ['#FFD1DC', '#E8A0BF', '#FF69B4', '#D4AF37', '#E6E6FA']
    let running = true

    const frame = () => {
      if (!running) return
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors,
      })
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors,
      })
      if (Date.now() < end) requestAnimationFrame(frame)
    }
    frame()

    cleanupRef.current = () => { running = false }
  }, [])

  const handleClick = () => {
    setShowMessage(true)
    fireConfetti()
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => { cleanupRef.current?.() }
  }, [])

  return (
    <section
      ref={ref}
      className="relative min-h-screen flex items-center justify-center px-6 py-24"
      style={{
        background:
          'linear-gradient(180deg, #0d0818 0%, #1a1030 50%, #0d0818 100%)',
      }}
    >
      <div className="text-center max-w-lg">
        <AnimatePresence>
          {isInView && (
            <>
              <TeddyBear />

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="text-xl md:text-2xl text-white/70 mb-6"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                I honestly think...
              </motion.p>

              {!showMessage ? (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5 }}
                  onClick={handleClick}
                  className="text-white/55 text-sm tracking-widest uppercase cursor-pointer hover:text-white/70 transition-colors"
                >
                  tap to see ↓
                </motion.button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 100 }}
                >
                  <motion.p
                    className="text-3xl md:text-5xl mb-8"
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontStyle: 'italic',
                      background: 'linear-gradient(135deg, #FFD1DC, #E8A0BF, #D4AF37)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    you're the cutest person I know.
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="flex justify-center gap-4 text-3xl"
                  >
                    {['💖', '✨', '🌸', '💫', '💗'].map((e, i) => (
                      <motion.span
                        key={i}
                        animate={{
                          y: [0, -10, 0],
                          rotate: [0, 10, -10, 0],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          delay: i * 0.2,
                        }}
                      >
                        {e}
                      </motion.span>
                    ))}
                  </motion.div>
                </motion.div>
              )}
            </>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
