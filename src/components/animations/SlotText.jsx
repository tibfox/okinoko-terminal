import React, { useState, useEffect, useRef } from 'react'

export default function SlotText({
  text = 'VSC Terminal',
  className = '',
  tag: Tag = 'span',
  style: customStyle = {},
  interval = 15,
  frameDelay = 50,
  baseDuration = 600,
  charDuration = 80,
  startDelay = 0,
  pad = true,
}) {
  const [displayChars, setDisplayChars] = useState(text.split(''))
  const loopRef = useRef(null)
  const startRef = useRef(null)

  useEffect(() => {
    // const chars = '┤┘┐┌└├┴┬┼ΞλψΩЖФЯѰ'
    // const chars = '!@#$%^&*-=+<>?ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'
    // const chars = '10'
    const chars = '!#$&*+<>?'

    const animateOnce = () => {
      text.split('').forEach((char, i) => {
        if (char === ' ') return
        const spinDuration = baseDuration + i * charDuration
        let elapsed = 0

        const spinInterval = setInterval(() => {
          setDisplayChars(prev => {
            const next = [...prev]
            next[i] = chars[Math.floor(Math.random() * chars.length)]
            return next
          })
          elapsed += frameDelay
          if (elapsed >= spinDuration) {
            clearInterval(spinInterval)
            setDisplayChars(prev => {
              const next = [...prev]
              next[i] = text[i]
              return next
            })
          }
        }, frameDelay)
      })
    }

    const startDelayMs = startDelay * 1000
    const intervalMs = interval * 1000

    startRef.current = setTimeout(() => {
      animateOnce()
      loopRef.current = setInterval(animateOnce, intervalMs)
    }, startDelayMs)

    return () => {
      clearTimeout(startRef.current)
      clearInterval(loopRef.current)
    }
  }, [text, interval, startDelay, frameDelay, baseDuration, charDuration])

  return (
    <Tag
      className={`cyber-tile ${className}`}
      style={{
        display: 'inline-block',
        whiteSpace: 'nowrap',
        textAlign: 'center',
        verticalAlign: 'top',
        margin: 0,
        padding: 0,
        fontFamily: "'Share Tech Mono',monospace",
        letterSpacing: '0.05em',
        lineHeight: 1.2,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        textRendering: 'optimizeSpeed',
        ...customStyle,
      }}
    >
      {pad ? ` ${displayChars.join('')} ` : displayChars.join('')}
    </Tag>
  )
}
