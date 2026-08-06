import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useInView } from '../../hooks/useInView'
import Sparkles from '../ui/Sparkles'

function GlowingHeart() {
  return (
    <motion.div className="relative inline-block mb-8">
      <motion.div
        className="text-7xl md:text-8xl"
        animate={{
          scale: [1, 1.15, 1],
          filter: [
            'drop-shadow(0 0 20px rgba(232,160,191,0.5))',
            'drop-shadow(0 0 40px rgba(232,160,191,0.8))',
            'drop-shadow(0 0 20px rgba(232,160,191,0.5))',
          ],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        ❤️
      </motion.div>
      <Sparkles count={12} />
    </motion.div>
  )
}

export default function ProposalSection({ onSelect }: { onSelect: (choice: string) => void }) {
  const { ref, isInView } = useInView(0.2)
  const [hovered, setHovered] = useState<string | null>(null)
  const [customAnswer, setCustomAnswer] = useState('')
  const [showInput, setShowInput] = useState(false)
  const [sent, setSent] = useState(false)

  const choices = [
    { emoji: '❤️', label: "I'd Love To", color: '#E8A0BF' },
    { emoji: '🌸', label: "Let's Get To Know Each Other First", color: '#C8A2C8' },
    { emoji: '🤍', label: "I Don't Feel The Same, But Thank You", color: '#9CA3AF' },
  ]

  const handleCustomSubmit = () => {
    if (customAnswer.trim()) {
      onSelect(customAnswer.trim())
      setSent(true)
    }
  }

  return (
    <section
      ref={ref}
      className="relative min-h-screen flex items-center justify-center px-6 py-24"
      style={{
        background:
          'radial-gradient(ellipse at 50% 50%, #1a1030 0%, #0d0818 70%)',
      }}
    >
      <AnimatePresence>
        {isInView && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="text-center max-w-lg"
          >
            <GlowingHeart />

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="text-2xl md:text-4xl text-white/90 mb-6 leading-relaxed"
              style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}
            >
              Would you give me a chance to know you better?
            </motion.p>

            {/* Reassurance — Option 3 (Gentle) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.8 }}
              className="mb-10 space-y-2"
            >
              <p className="text-white/45 text-sm leading-relaxed" style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>
                Whether your answer is "yes," "not now," or "no," it's completely okay.
              </p>
              <p className="text-white/40 text-sm leading-relaxed" style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>
                Your comfort matters more to me than the answer itself.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.8 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              {choices.map((choice, i) => (
                <motion.button
                  key={choice.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.4 + i * 0.15 }}
                  whileHover={{ scale: 1.08, y: -4 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onSelect(choice.label)}
                  onMouseEnter={() => setHovered(choice.label)}
                  onMouseLeave={() => setHovered(null)}
                  className="relative px-6 py-4 rounded-full cursor-pointer transition-all duration-300 min-w-[200px]"
                  style={{
                    background:
                      hovered === choice.label
                        ? `linear-gradient(135deg, ${choice.color}33, ${choice.color}22)`
                        : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${hovered === choice.label ? choice.color + '66' : 'rgba(255,255,255,0.1)'}`,
                  }}
                >
                  <span className="text-lg mr-2">{choice.emoji}</span>
                  <span className="text-white/70 text-xs md:text-sm">{choice.label}</span>

                  {hovered === choice.label && (
                    <motion.div
                      className="absolute inset-0 rounded-full -z-10"
                      layoutId="hover-glow"
                      style={{
                        boxShadow: `0 0 30px ${choice.color}33`,
                      }}
                    />
                  )}
                </motion.button>
              ))}
            </motion.div>

            {/* Type your own answer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2 }}
              className="mt-8"
            >
              {!showInput ? (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowInput(true)}
                  className="text-white/40 text-sm cursor-pointer transition-colors hover:text-white/60"
                  style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}
                >
                  Or type your own answer...
                </motion.button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center gap-3"
                >
                  <input
                    type="text"
                    value={customAnswer}
                    onChange={(e) => setCustomAnswer(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
                    placeholder="Type your answer here..."
                    autoFocus
                    className="w-full max-w-sm px-5 py-3 rounded-full text-white/80 text-sm text-center outline-none transition-all duration-300 focus:ring-2 focus:ring-[#E8A0BF]/30"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      fontFamily: 'var(--font-serif)',
                    }}
                  />
                  <motion.button
                    whileHover={{ scale: sent ? 1 : 1.05 }}
                    whileTap={{ scale: sent ? 1 : 0.95 }}
                    onClick={handleCustomSubmit}
                    disabled={!customAnswer.trim() || sent}
                    className="px-6 py-2 rounded-full text-white/70 text-sm cursor-pointer transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{
                      background: sent
                        ? 'linear-gradient(135deg, rgba(232,160,191,0.35), rgba(212,175,55,0.3))'
                        : 'linear-gradient(135deg, rgba(232,160,191,0.2), rgba(212,175,55,0.15))',
                      border: '1px solid rgba(232,160,191,0.3)',
                    }}
                  >
                    {sent ? 'Sent ✨' : 'Send'}
                  </motion.button>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
