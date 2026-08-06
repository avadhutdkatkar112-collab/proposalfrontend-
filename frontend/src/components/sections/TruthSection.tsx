import { motion } from 'framer-motion'
import { useInView } from '../../hooks/useInView'

const truths = [
  "But there is one thing that never disappeared.",
  "When I talk to you...",
  "I genuinely feel happy.",
  "I don't know why.",
  "But every conversation with you somehow makes my day brighter.",
]

function TruthLine({ text, index }: { text: string; index: number }) {
  const { ref, isInView } = useInView(0.6)
  return (
    <motion.p
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.9, delay: 0.15 }}
      className={`${
        index === 2
          ? 'text-3xl md:text-5xl text-white/90 font-semibold'
          : index === 0
          ? 'text-xl md:text-2xl text-white/50'
          : 'text-lg md:text-xl text-white/60'
      }`}
      style={{
        fontFamily: 'var(--font-serif)',
        fontStyle: index === 0 ? 'italic' : 'normal',
      }}
    >
      {text}
    </motion.p>
  )
}

export default function TruthSection() {
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
      <div className="max-w-2xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 1 }}
          className="text-xs text-white/50 tracking-[0.25em] uppercase mb-16"
        >
          The Truth
        </motion.h2>

        <div className="space-y-10">
          {truths.map((line, i) => (
            <TruthLine key={i} text={line} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
