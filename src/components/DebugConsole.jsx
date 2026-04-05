import { useState, useEffect, useRef, useContext, useCallback } from 'preact/hooks'
import { getLogs, clearLogs, subscribe } from '../lib/debugConsole.js'
import { PopupContext } from '../popup/context.js'

const LEVEL_COLORS = {
  log: 'var(--color-primary-lighter)',
  info: '#58a6ff',
  warn: '#d29922',
  error: '#f85149',
  debug: '#8b949e',
}

export function DebugConsoleContent() {
  const [logs, setLogs] = useState(getLogs)
  const [filter, setFilter] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => subscribe(setLogs), [])
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const filtered = filter
    ? logs.filter(e => e.level === filter)
    : logs

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '60vh', gap: '8px' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
        {['', 'log', 'warn', 'error', 'info'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '2px 8px',
              fontSize: '11px',
              background: filter === f ? 'var(--color-primary)' : 'transparent',
              color: filter === f ? '#000' : (LEVEL_COLORS[f] || 'var(--color-primary-lighter)'),
              border: '1px solid var(--color-primary-darkest)',
              borderRadius: '3px',
              cursor: 'pointer',
            }}
          >
            {f || 'all'}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ color: 'var(--color-primary-darker)', fontSize: '11px' }}>
          {filtered.length} entries
        </span>
        <button
          onClick={clearLogs}
          style={{
            padding: '2px 8px',
            fontSize: '11px',
            background: 'transparent',
            color: '#f85149',
            border: '1px solid #f85149',
            borderRadius: '3px',
            cursor: 'pointer',
          }}
        >
          clear
        </button>
      </div>

      {/* Log entries */}
      <div
        class="neon-scroll"
        style={{
          flex: 1,
          overflow: 'auto',
          background: 'rgba(0,0,0,0.4)',
          borderRadius: '4px',
          padding: '6px',
          fontFamily: 'monospace',
          fontSize: '11px',
          lineHeight: '1.5',
        }}
      >
        {filtered.length === 0 && (
          <div style={{ color: 'var(--color-primary-darker)', padding: '12px', textAlign: 'center' }}>
            No log entries
          </div>
        )}
        {filtered.map((entry, i) => {
          const time = new Date(entry.ts).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 })
          return (
            <div key={i} style={{ color: LEVEL_COLORS[entry.level] || '#ccc', wordBreak: 'break-all', borderBottom: '1px solid rgba(255,255,255,0.03)', padding: '1px 0' }}>
              <span style={{ color: 'var(--color-primary-darker)', marginRight: '6px' }}>{time}</span>
              <span style={{ color: LEVEL_COLORS[entry.level], opacity: 0.6, marginRight: '6px' }}>[{entry.level}]</span>
              {entry.msg}
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

/** Hook to register triple-tap and Ctrl+Shift+D to open the debug console */
export function useDebugConsole() {
  const popup = useContext(PopupContext)
  const tapCount = useRef(0)
  const tapTimer = useRef(null)

  const openConsole = useCallback(() => {
    popup?.openPopup?.({
      title: 'Debug Console',
      body: () => <DebugConsoleContent />,
      width: '80vw',
    })
  }, [popup])

  useEffect(() => {
    // Ctrl+Shift+D keyboard shortcut
    const onKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault()
        openConsole()
      }
    }
    window.addEventListener('keydown', onKeyDown)

    // Triple-tap on mobile (anywhere)
    const onTouchEnd = () => {
      tapCount.current++
      clearTimeout(tapTimer.current)
      if (tapCount.current >= 5) {
        tapCount.current = 0
        openConsole()
      }
      tapTimer.current = setTimeout(() => { tapCount.current = 0 }, 600)
    }
    window.addEventListener('touchend', onTouchEnd)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('touchend', onTouchEnd)
      clearTimeout(tapTimer.current)
    }
  }, [openConsole])
}
