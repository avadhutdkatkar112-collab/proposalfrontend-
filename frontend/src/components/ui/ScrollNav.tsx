import { motion } from 'framer-motion'

const labels = [
  'Home',
  'Messages',
  'Reveal',
  'Moments',
  'Truth',
  'Cute',
  'Reasons',
  'Letter',
  'Proposal',
  'Thank You',
]

interface ScrollNavProps {
  total: number
  active: number
  onNavigate: (index: number) => void
}

export default function ScrollNav({ total, active, onNavigate }: ScrollNavProps) {
  return (
    <motion.nav
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 1, duration: 0.6 }}
      className="fixed right-3 md:right-5 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-2.5"
    >
      {/* Progress line behind dots */}
      <div className="absolute top-0 bottom-0 w-px bg-white/10" />

      {/* Active progress fill */}
      <motion.div
        className="absolute top-0 w-px origin-top"
        style={{
          background: 'linear-gradient(180deg, #E8A0BF, #D4AF37)',
        }}
        animate={{
          height: `${(active / Math.max(total - 1, 1)) * 100}%`,
        }}
        transition={{ type: 'spring', stiffness: 80, damping: 15 }}
      />

      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          onClick={() => onNavigate(i)}
          className="relative z-10 group cursor-pointer p-1"
          aria-label={`Go to ${labels[i] || `section ${i + 1}`}`}
        >
          <motion.div
            className="rounded-full"
            animate={{
              width: i === active ? 10 : 5,
              height: i === active ? 10 : 5,
              background:
                i === active
                  ? 'linear-gradient(135deg, #E8A0BF, #D4AF37)'
                  : i < active
                  ? 'rgba(232,160,191,0.4)'
                  : 'rgba(255,255,255,0.15)',
              boxShadow:
                i === active
                  ? '0 0 14px rgba(232,160,191,0.6)'
                  : 'none',
            }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          />

          {/* Tooltip label on hover */}
          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap translate-x-2 group-hover:translate-x-0">
            <span
              className="text-[10px] tracking-wider px-2 py-1 rounded-full"
              style={{
                background: 'rgba(232,160,191,0.15)',
                color: 'rgba(255,255,255,0.6)',
                border: '1px solid rgba(232,160,191,0.2)',
              }}
            >
              {labels[i] || `Section ${i + 1}`}
            </span>
          </div>
        </button>
      ))}
    </motion.nav>
  )
}
