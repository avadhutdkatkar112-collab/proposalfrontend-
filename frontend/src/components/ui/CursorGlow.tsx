import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

export default function CursorGlow() {
  const [pos, setPos] = useState({ x: -100, y: -100 })

  useEffect(() => {
    const move = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('mousemove', move)
    return () => window.removeEventListener('mousemove', move)
  }, [])

  return (
    <motion.div
      className="fixed pointer-events-none z-50 rounded-full"
      animate={{ x: pos.x - 150, y: pos.y - 150 }}
      transition={{ type: 'tween', duration: 0.15, ease: 'easeOut' }}
      style={{
        width: 300,
        height: 300,
        background:
          'radial-gradient(circle, rgba(232,160,191,0.12) 0%, rgba(212,175,55,0.05) 40%, transparent 70%)',
      }}
    />
  )
}
