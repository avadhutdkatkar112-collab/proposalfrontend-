import { motion, AnimatePresence } from 'framer-motion'
import { useTypingEffect } from '../../hooks/useTypingEffect'

const stars = Array.from({ length: 80 }, () => ({
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 2.5 + 0.5,
  delay: Math.random() * 3,
}))

export default function LandingSection({ onEnter }: { onEnter: () => void }) {
  const { displayedText: text1, isComplete: done1 } = useTypingEffect(
    'Some words were written...',
    45,
    1000,
    true
  )
  const { displayedText: text2, isComplete: done2 } = useTypingEffect(
    '...but never sent.',
    45,
    500,
    done1
  )

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 30%, #1a1030 0%, #0d0818 50%, #050208 100%)',
        }}
      />

      {stars.map((star, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
          }}
          animate={{
            opacity: [0.2, 0.8, 0.2],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            repeat: Infinity,
            delay: star.delay,
          }}
        />
      ))}

      <div className="relative z-10 text-center px-6 max-w-2xl">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
        >
          <p
            className="text-white/70 text-lg md:text-xl tracking-wide mb-2"
            style={{ fontFamily: 'var(--font-serif)', minHeight: '2rem' }}
          >
            {text1}
          </p>
          {done1 && (
            <p
              className="text-white/70 text-lg md:text-xl tracking-wide"
              style={{ fontFamily: 'var(--font-serif)', minHeight: '2rem' }}
            >
              {text2}
            </p>
          )}
        </motion.div>

        <AnimatePresence>
          {done2 && (
            <motion.button
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              onClick={onEnter}
              className="mt-12 group relative px-8 py-4 rounded-full overflow-hidden cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, rgba(232,160,191,0.15), rgba(212,175,55,0.15))',
                border: '1px solid rgba(232,160,191,0.3)',
              }}
            >
              <span
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(232,160,191,0.25), rgba(212,175,55,0.25))',
                }}
              />
              <span className="relative text-white/80 text-sm tracking-[0.2em] uppercase">
                See What I Never Sent
              </span>
              <motion.div
                className="absolute inset-0 rounded-full"
                animate={{
                  boxShadow: [
                    '0 0 20px rgba(232,160,191,0.2)',
                    '0 0 40px rgba(232,160,191,0.3)',
                    '0 0 20px rgba(232,160,191,0.2)',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
