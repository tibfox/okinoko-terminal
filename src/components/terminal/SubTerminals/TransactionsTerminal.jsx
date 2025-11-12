import TerminalContainer from '../TerminalContainer.jsx'
import TxQueuePopupBody from '../components/TxQueuePopupBody.jsx'
import { getWindowDefaults } from '../windowDefaults.js'

const INITIAL_STATE = getWindowDefaults('tx-monitor')

export default function TransactionsTerminal() {
  return (
    <TerminalContainer
      windowId="tx-monitor"
      title="Recent Transactions"
      titleOnMinimize="Tx"
      initialState={INITIAL_STATE}
      desktopBounds={{
        minWidth: 240,
        maxWidth: 1024,
        minHeight: 240,
        maxHeight: 1024,
      }}
      desktopDefaultSize={{
        width: 324,
        height: 324,
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
