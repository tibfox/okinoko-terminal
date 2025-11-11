import { useEffect, useState } from 'preact/hooks'
import TerminalContainer from './TerminalContainer.jsx'

export default function SecondaryTerminal() {
  const [initialState, setInitialState] = useState(null)

  useEffect(() => {
    const width = 480
    const height = 320
    const fallback = {
      isMinimized: true,
      dimensions: { width, height },
      position: null,
    }

    if (typeof window === 'undefined') {
      setInitialState(fallback)
      return
    }

    setInitialState({
      ...fallback,
      position: {
        x: Math.max(40, window.innerWidth - width - 80),
        y: 30,
      },
    })
  }, [])

  if (!initialState) {
    return null
  }

  return (
    <TerminalContainer
      windowId="aux-monitor"
      title="Monitor"
      titleOnMinimize="Mon"
      initialState={initialState}
      desktopBounds={{
        minWidth: 360,
        maxWidth: 720,
        minHeight: 240,
        maxHeight: 520,
      }}
      desktopDefaultSize={{
        width: 520,
        height: 320,
      }}
      viewportPadding={64}
      
      className="terminal--monitor"
      style={{
        backdropFilter: 'blur(6px)',
      }}
      headerVariant="compact"
      compactTitleOnMinimize="Mon"
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <p style={{ margin: 0 }}>
          Auxiliary terminal ready. Drag me anywhere, resize, or leave minimized for quick access.
        </p>
        <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem' }}>
          <li>Future: live metrics</li>
          <li>Future: notifications</li>
          <li>Future: quick scripts</li>
        </ul>
      </div>
    </TerminalContainer>
  )
}
