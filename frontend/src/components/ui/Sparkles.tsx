import { motion } from 'framer-motion'

interface SparkleProps {
  count?: number
}

function Sparkle({ delay }: { delay: number }) {
  const size = Math.random() * 8 + 4
  const x = Math.random() * 100
  const y = Math.random() * 100
  const duration = Math.random() * 2 + 1.5

  return (
    <motion.div
      className="absolute"
      style={{ left: `${x}%`, top: `${y}%` }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: [0, 1, 0],
        scale: [0, 1, 0],
        rotate: [0, 180],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        repeatDelay: Math.random() * 3 + 1,
      }}
    >
      <svg width={size} height={size} viewBox="0 0 20 20">
        <path
          d="M10 0 L12 8 L20 10 L12 12 L10 20 L8 12 L0 10 L8 8 Z"
          fill="#D4AF37"
          opacity={0.8}
        />
      </svg>
    </motion.div>
  )
}

export default function Sparkles({ count = 20 }: SparkleProps) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <Sparkle key={i} delay={Math.random() * 4} />
      ))}
    </div>
  )
}
