import { motion } from 'framer-motion'
import { useInView } from '../../hooks/useInView'

const reasons = [
  { icon: '😊', text: 'The way your eyes light up when you smile' },
  { icon: '💛', text: 'How you always check if everyone is okay' },
  { icon: '🗣️', text: 'The warmth in your voice when you talk' },
  { icon: '🌸', text: 'Your gentle kindness with everyone' },
  { icon: '☀️', text: 'How conversations with you heal my mood' },
  { icon: '🫶', text: 'You make ordinary moments feel magical' },
]

function ReasonCard({ reason, index }: { reason: (typeof reasons)[0]; index: number }) {
  const { ref, isInView } = useInView(0.3)

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay: index * 0.1 }}
      whileHover={{ scale: 1.06, y: -8 }}
      className="group relative cursor-pointer"
      style={{ perspective: 800 }}
    >
      <motion.div
        whileHover={{ rotateY: 8 }}
        transition={{ type: 'spring', stiffness: 200 }}
        className="relative rounded-2xl p-6 text-center backdrop-blur-xl overflow-hidden h-full"
        style={{
          background:
            'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background:
              'linear-gradient(135deg, rgba(232,160,191,0.15), rgba(212,175,55,0.1))',
          }}
        />

        <div className="relative z-10">
          <motion.span
            className="text-3xl block mb-3"
            whileHover={{ scale: 1.3, rotate: 10 }}
          >
            {reason.icon}
          </motion.span>
          <p className="text-white/70 text-sm md:text-base" style={{ fontFamily: 'var(--font-serif)' }}>
            {reason.text}
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function ReasonsSection() {
  const { ref, isInView } = useInView(0.1)

  return (
    <section
      ref={ref}
      className="relative min-h-screen py-24 px-6"
      style={{
        background:
          'linear-gradient(180deg, #0d0818 0%, #1a1030 50%, #0d0818 100%)',
      }}
    >
      <div className="max-w-4xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center text-3xl md:text-4xl text-white/80 mb-4"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          Why You?
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-center text-white/50 text-sm mb-16 tracking-wider"
        >
          Honestly, I could list a hundred more
        </motion.p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-5 md:gap-6">
          {reasons.map((reason, i) => (
            <ReasonCard key={i} reason={reason} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
