import { useEffect, useState } from 'preact/hooks'
import TerminalContainer from './TerminalContainer.jsx'
import TxQueuePopupBody from './TxQueuePopupBody.jsx'

const DEFAULT_WIDTH = 420
const DEFAULT_HEIGHT = 380

export default function TransactionsTerminal() {
  const [initialState, setInitialState] = useState(null)

  useEffect(() => {
    const fallback = {
      isMinimized: false,
      dimensions: { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT },
      position: null,
    }

    if (typeof window === 'undefined') {
      setInitialState(fallback)
      return
    }

    const padding = 96
    const x = Math.max(24, window.innerWidth - DEFAULT_WIDTH - padding)
    const y = Math.max(120, window.innerHeight - DEFAULT_HEIGHT - padding)

    setInitialState({
      ...fallback,
      position: { x, y },
    })
  }, [])

  if (!initialState) {
    return null
  }

  return (
    <TerminalContainer
      windowId="tx-monitor"
      title="Recent Transactions"
      titleOnMinimize="Tx"
      initialState={initialState}
      desktopBounds={{
        minWidth: 360,
        maxWidth: 560,
        minHeight: 260,
        maxHeight: 600,
      }}
      desktopDefaultSize={{
        width: DEFAULT_WIDTH,
        height: DEFAULT_HEIGHT,
      }}
      backgroundColor="rgba(0, 0, 0, 0.8)"
      className="terminal--transactions"
      style={{
        backdropFilter: 'blur(4px)',
      }}
      headerVariant="compact"
      compactTitleOnMinimize="Tx"
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <TxQueuePopupBody />
      </div>
    </TerminalContainer>
  )
}
