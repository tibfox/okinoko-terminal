import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { magiAsciiArt } from './art.js'

const artLines = magiAsciiArt.split('\n').filter(Boolean)
const artColumns = Math.max(...artLines.map((line) => line.length))
const artRows = artLines.length
const MIN_FONT = 3
const MAX_FONT = 12
const CHAR_WIDTH_RATIO = 1.2

export default function MobileAsciiArt() {
  const wrapperRef = useRef(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const node = wrapperRef.current
    const target = node?.parentElement ?? node
    if (!target) {
      return undefined
    }

    const updateSize = () => {
      const rect = target.getBoundingClientRect()
      setSize({ width: rect.width, height: rect.height })
    }

    updateSize()

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0]
        if (entry) {
          const { width, height } = entry.contentRect
          setSize({ width, height })
        }
      })
      observer.observe(target)
      return () => observer.disconnect()
    }

    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  const fontSize = useMemo(() => {
    const { width, height } = size
    if (!width || !height) {
      return 6
    }

    const widthBased = width / (artColumns * CHAR_WIDTH_RATIO)
    const heightBased = height / artRows
    return Math.max(MIN_FONT, Math.min(MAX_FONT, Math.min(widthBased, heightBased)))
  }, [size])

  return (
    <div
      ref={wrapperRef}
      style={{
        width: '100%',
        height: '100%',
        flex: 1,
        minHeight: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        margin: 0,
        padding: 0,
      }}
    >
      <pre
        className="rainbow-ascii"
        style={{
          fontFamily: 'monospace',
          fontSize: `${fontSize}px`,
          lineHeight: `${fontSize * 0.95}px`,
          whiteSpace: 'pre',
          textAlign: 'center',
          margin: 0,
          padding: 0,
          color: 'transparent',
        }}
      >
        {magiAsciiArt}
      </pre>
    </div>
  )
}
