import { motion } from 'framer-motion'
import { useInView } from '../../hooks/useInView'

const photos = [
  { placeholder: '🌸', caption: 'The way you light up when you laugh' },
  { placeholder: '☀️', caption: 'Every conversation we never wanted to end' },
  { placeholder: '🌿', caption: 'How you always make everyone feel welcome' },
  { placeholder: '✨', caption: 'Your smile that makes my day brighter' },
  { placeholder: '🦋', caption: 'The moments I quietly treasure' },
  { placeholder: '🌅', caption: 'Being around you feels like home' },
]

function PolaroidCard({ photo, index }: { photo: (typeof photos)[0]; index: number }) {
  const { ref, isInView } = useInView(0.15)

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50, rotate: (index % 2 === 0 ? -4 : 4) }}
      animate={isInView ? { opacity: 1, y: 0, rotate: (index % 2 === 0 ? -2 : 2) } : {}}
      transition={{ duration: 0.7, delay: index * 0.1 }}
      whileHover={{
        scale: 1.06,
        rotate: 0,
        y: -10,
      }}
      className="group relative cursor-pointer"
    >
      <div
        className="relative rounded-xl overflow-hidden transition-shadow duration-500"
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
        }}
      >
        <div className="aspect-[4/3] flex items-center justify-center text-3xl md:text-4xl relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background:
                'radial-gradient(circle at 50% 50%, rgba(232,160,191,0.25), transparent 70%)',
            }}
          />
          <motion.span
            className="relative z-10"
            whileHover={{ scale: 1.2, rotate: 10 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            {photo.placeholder}
          </motion.span>

          {/* Floating hearts overlay on hover */}
          <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700">
            {Array.from({ length: 3 }).map((_, i) => (
              <motion.span
                key={i}
                className="absolute text-sm"
                style={{
                  left: `${20 + i * 30}%`,
                  bottom: '20%',
                }}
                animate={{
                  y: [0, -30, -60],
                  opacity: [0, 0.6, 0],
                  scale: [0.5, 1, 0.8],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.5,
                }}
              >
                💖
              </motion.span>
            ))}
          </div>
        </div>

        <div className="px-2 py-1.5 text-center">
          <p
            className="text-white/60 text-xs tracking-wider"
            style={{ fontFamily: 'var(--font-handwriting)' }}
          >
            {photo.caption}
          </p>
        </div>
      </div>

      {/* Hover glow */}
      <motion.div
        className="absolute -inset-1 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"
        style={{
          background: 'linear-gradient(135deg, rgba(232,160,191,0.3), rgba(212,175,55,0.2))',
          filter: 'blur(20px)',
        }}
      />
    </motion.div>
  )
}

export default function GallerySection() {
  const { ref, isInView } = useInView(0.1)

  return (
    <section
      ref={ref}
      className="relative min-h-screen flex flex-col justify-center py-8 px-4"
      style={{
        background:
          'linear-gradient(180deg, #0d0818 0%, #1a1030 50%, #0d0818 100%)',
      }}
    >
      <div className="max-w-4xl mx-auto w-full">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center text-2xl md:text-3xl text-white/80 mb-1"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          Moments I Cherish
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-center text-white/40 text-sm mb-6 tracking-wider"
        >
          Every little memory with you
        </motion.p>

        <div className="grid grid-cols-3 md:grid-cols-3 gap-2 md:gap-3">
          {photos.map((photo, i) => (
            <PolaroidCard key={i} photo={photo} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
