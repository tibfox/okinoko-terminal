import TerminalContainer from '../TerminalContainer.jsx'
import AccountDataPanel from './AccountDataPanel.jsx'
import { getWindowDefaults } from '../windowDefaults.js'

const INITIAL_STATE = getWindowDefaults('account-data')

export default function AccountDataTerminal() {
  return (
    <TerminalContainer
      windowId="account-data"
      title="Account Data"
      titleOnMinimize="Acc"
      initialState={INITIAL_STATE}
      desktopBounds={{
        minWidth: 150,
        maxWidth: 1024,
        minHeight: 150,
        maxHeight: 1024,
      }}
      desktopDefaultSize={{
        width: 216,
        height: 324,
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
