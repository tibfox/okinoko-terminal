import { useMemo } from 'preact/hooks'
import './background-effects.css'

const STRAND_COUNT = 200

const seededRandom = (seed) => {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

const seededBetween = (seed, min, max) => min + seededRandom(seed) * (max - min)

export default function ThreadsEffect() {
  const strands = useMemo(() => {
    return Array.from({ length: STRAND_COUNT }).map((_, index) => {
      const seed = (index + 1) * 1.137
      const left = seededBetween(seed * 1.11, 0, 100)
      const duration = seededBetween(seed * 1.73, 6, 26)
      const delay = seededBetween(seed * 2.07, -20, 0)
      const width = seededBetween(seed * 2.63, 1, 4)
      const opacity = seededBetween(seed * 3.01, 0.35, 0.85)
      const blur = seededBetween(seed * 3.57, 0.1, 10)
      const intensity = seededBetween(seed * 4.13, 45, 85)
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
    <div className="background-effect background-effect--threads" aria-hidden="true">
      {strands.map((strand) => (
        <div key={strand.id} className="threads__strand" style={strand.style} />
      ))}
    </div>
  )
}
