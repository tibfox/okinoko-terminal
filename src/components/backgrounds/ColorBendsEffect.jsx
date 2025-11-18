import { useMemo } from 'preact/hooks'
import './background-effects.css'

const LAYER_COUNT = 6
const KEYFRAMES = [
  'color-bends-orbit-one',
  'color-bends-orbit-two',
  'color-bends-orbit-three',
  'color-bends-orbit-four',
  'color-bends-orbit-five',
]

const seededRandom = (seed) => {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

const seededBetween = (seed, min, max) => min + seededRandom(seed) * (max - min)

export default function ColorBendsEffect() {
  const layers = useMemo(() => {
    return Array.from({ length: LAYER_COUNT }).map((_, index) => {
      const seed = (index + 1) * 2.314
      const size = seededBetween(seed * 1.17, 38, 65)
      const maxSize = size * 16
      const top = seededBetween(seed * 1.33, -25, 10)
      const left = seededBetween(seed * 1.51, -20, 100)
      const blur = seededBetween(seed * 1.77, 40, 95)
      const opacity = seededBetween(seed * 1.93, 0.35, 0.75)
      const intensity = seededBetween(seed * 2.18, 35, 70)
      const duration = seededBetween(seed * 2.35, 8, 16).toFixed(2)
      const delay = seededBetween(seed * 2.51, -6, 2).toFixed(2)
      const direction = seededRandom(seed * 2.76) > 0.5 ? 'alternate-reverse' : 'alternate'
      const keyframe = KEYFRAMES[index % KEYFRAMES.length]

      return {
        id: `bend-${index}`,
        style: {
          '--bend-size': `${size}vw`,
          '--bend-max-size': `${Math.round(maxSize)}px`,
          '--bend-top': `${top}%`,
          '--bend-left': `${left}%`,
          '--bend-blur': `${blur}px`,
          '--bend-opacity': opacity,
          '--bend-intensity': `${intensity}%`,
          '--bend-animation': `${keyframe} ${duration}s ease-in-out infinite ${direction}`,
          animationDelay: `${delay}s`,
        },
      }
    })
  }, [])

  return (
    <div className="background-effect background-effect--color-bends" aria-hidden="true">
      {layers.map((layer) => (
        <div key={layer.id} className="color-bends__layer" style={layer.style} />
      ))}
    </div>
  )
}
