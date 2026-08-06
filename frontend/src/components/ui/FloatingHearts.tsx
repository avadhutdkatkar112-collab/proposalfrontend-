import { useEffect, useRef } from 'react'

interface Heart {
  x: number
  y: number
  size: number
  speedY: number
  opacity: number
  rotation: number
  rotSpeed: number
}

export default function FloatingHearts({ count = 15, color = '#E8A0BF' }: { count?: number; color?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    let hearts: Heart[] = []

    const resize = () => {
      const parent = canvas.parentElement
      if (parent) {
        canvas.width = parent.offsetWidth
        canvas.height = parent.offsetHeight
      }
    }
    resize()

    for (let i = 0; i < count; i++) {
      hearts.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 12 + 6,
        speedY: Math.random() * 0.5 + 0.2,
        opacity: Math.random() * 0.4 + 0.1,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.02,
      })
    }

    const drawHeart = (x: number, y: number, size: number, rotation: number, opacity: number) => {
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(rotation)
      ctx.globalAlpha = opacity
      ctx.beginPath()
      const topY = -size * 0.4
      ctx.moveTo(0, size * 0.3)
      ctx.bezierCurveTo(-size, topY, -size * 0.5, -size, 0, topY)
      ctx.bezierCurveTo(size * 0.5, -size, size, topY, 0, size * 0.3)
      ctx.fillStyle = color
      ctx.fill()
      ctx.restore()
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      hearts.forEach((h) => {
        h.y -= h.speedY
        h.rotation += h.rotSpeed

        if (h.y < -20) {
          h.y = canvas.height + 20
          h.x = Math.random() * canvas.width
        }

        drawHeart(h.x, h.y, h.size, h.rotation, h.opacity)
      })

      animationId = requestAnimationFrame(animate)
    }

    animate()
    window.addEventListener('resize', resize)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resize)
    }
  }, [count, color])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
    />
  )
}
