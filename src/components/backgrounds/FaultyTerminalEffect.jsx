import { useEffect, useState } from 'preact/hooks'
import './background-effects.css'

export default function FaultyTerminalEffect() {
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

  return (
    <div
      className={`background-effect background-effect--faulty-terminal ${paused ? 'faulty-terminal--paused' : ''}`}
      aria-hidden="true"
    >
      <div className="faulty-terminal__grid" />
      <div className="faulty-terminal__scan" />
      <div className="faulty-terminal__noise" />
    </div>
  )
}
