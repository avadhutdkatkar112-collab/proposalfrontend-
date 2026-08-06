import { motion } from 'framer-motion'
import { useInView } from '../../hooks/useInView'

const lines = [
  "I didn't delete them because I stopped liking you.",
  "I deleted them because I was afraid.",
  "I doubted myself.",
  "I thought maybe the timing wasn't right.",
]

function RevealLine({ text, index }: { text: string; index: number }) {
  const { ref, isInView } = useInView(0.5)
  return (
    <motion.p
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 1, delay: 0.2 }}
      className={`leading-relaxed ${
        index === 0
          ? 'text-2xl md:text-4xl text-white/90'
          : 'text-xl md:text-2xl text-white/60'
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

export default function RevealSection() {
  const { ref } = useInView(0.2)

  return (
    <section
      ref={ref}
      className="relative min-h-screen flex items-center justify-center px-6 py-24"
      style={{
        background:
          'linear-gradient(180deg, #0d0818 0%, #150c24 50%, #0d0818 100%)',
      }}
    >
      <div className="max-w-2xl mx-auto text-center space-y-12">
        {lines.map((line, i) => (
          <RevealLine key={i} text={line} index={i} />
        ))}
      </div>
    </section>
  )
}
