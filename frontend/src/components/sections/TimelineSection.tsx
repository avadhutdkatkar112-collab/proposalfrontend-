import { motion } from 'framer-motion'
import { useInView } from '../../hooks/useInView'

const draftMessages = [
  {
    text: "Hii, i wanted to share you something... from past 3 months the day you joined and all from all the collaboration work we did, talked a lot, did lot of mazak masti and helped a lot to each other. I have experienced your suggestions always helped me to start something new or achieve success...",
    snippet: "Is it possible to have future with you.",
    time: '4:30 PM',
    status: 'Deleted before sending',
  },
  {
    text: "Bandana in this journey of path of life, I feel I need someone with whom support I can atleast reach the end of this journey happily. I find you really cute and I feel really happy when I talk with you...",
    snippet: "I don't know why I felt it's not right time and deleted",
    time: '6:50 PM',
    status: 'Deleted again',
  },
]

function ChatCard({ draft, index, imageSrc }: { draft: (typeof draftMessages)[0]; index: number; imageSrc: string }) {
  const { ref, isInView } = useInView(0.2)

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.9, delay: index * 0.2 }}
      className="relative"
    >
      <motion.div
        whileHover={{ y: -6 }}
        transition={{ type: 'spring', stiffness: 200 }}
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <div className="p-4 md:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #E8A0BF, #C8A2C8)' }}
            >
              You
            </div>
            <span className="text-white/50 text-xs tracking-wider">{draft.time}</span>
          </div>

          <div className="rounded-xl overflow-hidden mb-4" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            <img
              src={imageSrc}
              alt="Deleted message draft"
              className="w-full h-auto"
            />
          </div>

          <div className="flex items-center gap-2 mt-4">
            <div className="h-px flex-1 bg-white/10" />
            <motion.span
              className="text-xs tracking-[0.15em] uppercase flex items-center gap-2"
              style={{ color: 'rgba(232,160,191,0.6)' }}
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
              {draft.status}
            </motion.span>
            <div className="h-px flex-1 bg-white/10" />
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function TimelineSection() {
  const { ref, isInView } = useInView(0.1)

  return (
    <section
      ref={ref}
      className="relative min-h-screen py-24 px-6"
      style={{
        background:
          'linear-gradient(180deg, #0d0818 0%, #1a1030 30%, #1a1030 70%, #0d0818 100%)',
      }}
    >
      <div className="max-w-2xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center text-2xl md:text-3xl text-white/80 mb-3"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          Messages I Never Sent
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-center text-white/50 text-sm mb-16 tracking-wider"
        >
          I wrote these... then deleted them. Every single time.
        </motion.p>

        <div className="space-y-10">
          {draftMessages.map((draft, i) => (
            <ChatCard
              key={i}
              draft={draft}
              index={i}
              imageSrc={i === 0 ? '/chat-1.png' : '/chat-2.jpeg'}
            />
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 1.5, duration: 0.8 }}
          className="text-center text-white/35 text-xs mt-12 tracking-wider italic"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          Two drafts. Two deletions. But the feelings never left.
        </motion.p>
      </div>
    </section>
  )
}
