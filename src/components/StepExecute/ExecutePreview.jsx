import { COLORS } from "../../styles/colors";
import { useState,useRef,useEffect } from 'preact/hooks'

const LOG_COLORS = {
  '⬢': '#00ff7f',
  '✘': '#ff5555',
}

export default function ExecutePreview({ jsonPreview, logs }) {
  const [isMobile, setIsMobile] = useState(false)
  const logContainerRef = useRef(null)
  const logEndRef = useRef(null)
  const [atBottom, setAtBottom] = useState(true)
  const [showScrollButton, setShowScrollButton] = useState(false)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 900)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const el = logContainerRef.current
    if (!el) return

    const handleScroll = () => {
      const scrollTop = Math.round(el.scrollTop)
    const scrollHeight = Math.round(el.scrollHeight)
    const clientHeight = Math.round(el.clientHeight)
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight

    const nearBottom = distanceFromBottom <= 60
      setAtBottom(nearBottom)
      setShowScrollButton(!nearBottom)
    }

    el.addEventListener('scroll', handleScroll)
    return () => el.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (atBottom && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, atBottom])

  const scrollToBottom = () => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
      }}
    >
      <h3>Payload Preview</h3>
      <div
  className="neon-scroll"
  style={{
    border: '1px solid var(--color-primary-darker)',
    borderRadius: '8px',
    padding: '8px',
    backgroundColor: 'rgba(0,0,0,0.6)',
    fontFamily: "'Share Tech Mono', monospace",
      fontSize: '0.9em',

    minHeight: '10vh',
    maxHeight: isMobile ? 'none' : '30vh',
    marginBottom: '10px',
    overflowY: 'auto',
    whiteSpace: 'pre-wrap',     // ✅ wrap long lines automatically
    wordWrap: 'break-word',     // ✅ break inside long words if needed
    boxSizing: 'border-box',
  }}
>
  {jsonPreview}
</div>


      <h3>Log Console</h3>

      {/* ✅ Wrapper (relative) */}
      <div
  style={{
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    flex: '1 1 auto',
    minHeight: 0, // ✅ allows child scroll area to shrink properly
  }}
>
  {/* ✅ Scrollable log box */}
  <div
    ref={logContainerRef}
    className="neon-scroll"
    style={{
      flex: 1,
      border: '1px solid ' + 'var(--color-primary-darker)',
      borderRadius: '8px',
      padding: '8px',
      backgroundColor: 'rgba(0,0,0,0.6)',
      fontFamily: "'Share Tech Mono', monospace",
      fontSize: '0.9em',
      overflowY: 'auto',
      boxSizing: 'border-box',
      height: '100%',       // ✅ ensures this fills the wrapper
      minHeight: 0,
      whiteSpace: 'pre-wrap',     
    wordWrap: 'break-word',     
    }}
  >
    {logs.map((line, i) => {
      const color = LOG_COLORS[line[0]] || + 'var(--color-primary)'
      return (
        <div
          key={i}
          className="log-line"
          style={{
            color,
            animation: 'flashNew 0.3s ease-out',
          }}
        >
          {line}
        </div>
      )
    })}
    <div ref={logEndRef} />
  </div>

  {/* ✅ Scroll button — pinned inside wrapper */}
  {showScrollButton && (
    <button
      onClick={scrollToBottom}
      className="scroll-btn"
      style={{
        position: 'absolute',
        right: '10px',
        bottom: '10px',
        background: 'rgba(0,255,255,0.1)',
        border: '1px solid var(--color-primary)',
        color: 'var(--color-primary)',
        borderRadius: '6px',
        fontSize: '0.8rem',
        cursor: 'pointer',
        padding: '4px 8px',
        
        fontFamily: "'Share Tech Mono', monospace",
        
        transition: 'all 0.2s ease',
        boxShadow: '0 0 8px var(--color-primary-darker)',
        opacity: 0.8,
        backdropFilter: 'blur(2px)',
        zIndex: 5, // ✅ make sure it floats above log content
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.8)}
    >
      ↓ Scroll
    </button>
  )}
</div>
    </div>
  )
}
