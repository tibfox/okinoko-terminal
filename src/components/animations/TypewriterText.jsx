import { useState, useEffect, useRef } from 'react'

export default function TypewriterText({
  text = '',
  speed = 2,
  className = '',
  onDone = () => {},
}) {
  const [displayed, setDisplayed] = useState('')
  const intervalRef = useRef(null)
  const bufferRef = useRef('')

  useEffect(() => {
    clearInterval(intervalRef.current)
    bufferRef.current = ''
    setDisplayed('')

    let i = 0
    intervalRef.current = setInterval(() => {
      bufferRef.current += text.charAt(i)
      setDisplayed(bufferRef.current)
      i++
      if (i >= text.length) {
        clearInterval(intervalRef.current)
        onDone()
      }
    }, speed)

    return () => clearInterval(intervalRef.current)
  }, [text, speed])

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        boxSizing: 'border-box',
        fontFamily: 'monospace',
        whiteSpace: 'pre-line',
      }}
    >
      {/* Hidden ghost text to stabilize layout */}
      <div
        style={{
          visibility: 'hidden',
          whiteSpace: 'pre-line',
          wordWrap: 'break-word',
        }}
      >
        {text}
      </div>

      {/* Animated visible text with inline cursor */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          whiteSpace: 'pre-line',
          wordWrap: 'break-word',
          width: '100%',
        }}
      >
        <span className="typewriter">{displayed}</span>
      </div>
    </div>
  )
}
