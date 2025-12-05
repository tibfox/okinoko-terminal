import { useEffect, useMemo, useState } from 'preact/hooks'
import './background-effects.css'

const STRAND_COUNT = 120

const seededRandom = (seed) => {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

const seededBetween = (seed, min, max) => min + seededRandom(seed) * (max - min)

export default function ThreadsEffect() {
  const [paused, setPaused] = useState(false)
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return null
  }

  useEffect(() => {
    const handleVisibility = () => setPaused(document.hidden)
    const handleBlur = () => setPaused(true)
    const handleFocus = () => setPaused(false)
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('blur', handleBlur)
    window.addEventListener('focus', handleFocus)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  const strands = useMemo(() => {
    return Array.from({ length: STRAND_COUNT }).map((_, index) => {
      const seed = (index + 1) * 1.137
      const left = seededBetween(seed * 1.11, 0, 100)
      const duration = seededBetween(seed * 1.73, 10, 24)
      const delay = seededBetween(seed * 2.07, -12, 0)
      const width = seededBetween(seed * 2.63, 1, 3)
      const opacity = seededBetween(seed * 3.01, 0.25, 0.65)
      const blur = seededBetween(seed * 3.57, 0.1, 6)
      const intensity = seededBetween(seed * 4.13, 40, 75)
      const direction = seededRandom(seed * 4.79) > 0.5 ? 'alternate-reverse' : 'alternate'
      return {
        id: `thread-${index}`,
        style: {
          '--strand-left': `${left}%`,
          '--strand-duration': `${duration}s`,
          '--strand-delay': `${delay}s`,
          '--strand-width': `${width}px`,
          '--strand-opacity': opacity,
          '--strand-blur': `${blur}px`,
          '--strand-intensity': `${intensity}%`,
          '--strand-direction': direction,
        },
      }
    })
  }, [])

  return (
    <div
      className={`background-effect background-effect--threads ${paused ? 'threads--paused' : ''}`}
      aria-hidden="true"
    >
      {strands.map((strand) => (
        <div key={strand.id} className="threads__strand" style={strand.style} />
      ))}
    </div>
  )
}
