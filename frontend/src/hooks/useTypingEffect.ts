import { useState, useEffect, useRef } from 'react'

export function useTypingEffect(
  text: string,
  speed = 50,
  startDelay = 0,
  trigger = true
) {
  const [displayedText, setDisplayedText] = useState('')
  const [isComplete, setIsComplete] = useState(false)
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    if (!trigger) return

    setDisplayedText('')
    setIsComplete(false)

    const timeout = setTimeout(() => {
      let i = 0
      intervalRef.current = window.setInterval(() => {
        if (i < text.length) {
          setDisplayedText(text.slice(0, i + 1))
          i++
        } else {
          if (intervalRef.current) clearInterval(intervalRef.current)
          setIsComplete(true)
        }
      }, speed)
    }, startDelay)

    return () => {
      clearTimeout(timeout)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [text, speed, startDelay, trigger])

  return { displayedText, isComplete }
}
