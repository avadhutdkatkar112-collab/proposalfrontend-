import { motion } from 'framer-motion'
import { useInView } from '../../hooks/useInView'

const letterLines = [
  "I don't know what tomorrow holds.",
  "I don't know if you'll feel the same.",
  "I don't even know if this is the perfect time.",
  "But I do know one thing.",
  "Keeping this inside forever would be my biggest regret.",
  "You make ordinary days feel special.",
  "You make conversations feel effortless.",
  "You make me smile without even trying.",
  "So today...",
  "Instead of deleting another message...",
  "I'm finally sending one.",
]

function LetterLine({ text, index }: { text: string; index: number }) {
  const { ref, isInView } = useInView(0.7)
  return (
    <motion.p
      ref={ref}
      initial={{ opacity: 0, x: -20 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.6 }}
      className={`${
        index === 10
          ? 'text-lg md:text-xl text-white/90 font-semibold'
          : index >= 8
          ? 'text-base md:text-lg text-white/70'
          : index >= 5
          ? 'text-sm md:text-base text-white/65'
          : 'text-sm md:text-base text-white/50'
      }`}
      style={{
        fontFamily: index >= 8 ? 'var(--font-handwriting)' : 'var(--font-serif)',
        fontStyle: index < 8 ? 'italic' : 'normal',
      }}
    >
      {text}
    </motion.p>
  )
}

export default function LetterSection() {
  const { ref, isInView } = useInView(0.1)

  return (
    <section
      ref={ref}
      className="relative min-h-screen flex items-center justify-center px-6 py-24"
      style={{
        background:
          'linear-gradient(180deg, #0d0818 0%, #1a0f20 50%, #0d0818 100%)',
      }}
    >
      <div className="max-w-xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 1 }}
          className="relative rounded-3xl p-8 md:p-12"
          style={{
            background:
              'linear-gradient(135deg, rgba(255,248,240,0.06), rgba(255,248,240,0.02))',
            border: '1px solid rgba(255,248,240,0.1)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}
        >
          <motion.div
            className="absolute top-4 right-6 text-3xl opacity-20"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            💌
          </motion.div>

          <div className="space-y-5">
            {letterLines.map((line, i) => (
              <LetterLine key={i} text={line} index={i} />
            ))}
          </div>

          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-16 h-1 rounded-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.5), transparent)' }} />
        </motion.div>
      </div>
    </section>
  )
}
