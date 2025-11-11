import { useEffect, useState } from 'preact/hooks'
import TerminalContainer from '../TerminalContainer.jsx'
import AccountDataPanel from './AccountDataPanel.jsx'

export default function AccountDataTerminal() {
  const [initialState, setInitialState] = useState(null)

  useEffect(() => {
    const width = 420
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

    const spacing = 24
    const txWidth = 420
    const txPadding = 230
    const txX = Math.max(spacing, window.innerWidth - txWidth - txPadding)
    const x = Math.max(spacing, txX - width - spacing)
    const y = 30

    setInitialState({
      ...fallback,
      position: {
        x,
        y,
      },
    })
  }, [])

  if (!initialState) {
    return null
  }

  return (
    <TerminalContainer
      windowId="account-data"
      title="Account Data"
      titleOnMinimize="Acc"
      initialState={initialState}
      desktopBounds={{
        minWidth: 320,
        maxWidth: 600,
        minHeight: 260,
        maxHeight: 720,
      }}
      desktopDefaultSize={{
        width: 420,
        height: 320,
      }}
      viewportPadding={48}
      className="terminal--account-data"
      style={{
        backdropFilter: 'blur(5px)',
      }}
      headerVariant="compact"
      compactTitleOnMinimize="Acc"
    >
      <AccountDataPanel />
    </TerminalContainer>
  )
}
