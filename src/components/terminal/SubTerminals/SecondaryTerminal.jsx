import TerminalContainer from '../TerminalContainer.jsx'
import MonitorPanel from './MonitorPanel.jsx'
import { getWindowDefaults } from '../windowDefaults.js'

const INITIAL_STATE = getWindowDefaults('aux-monitor')

export default function SecondaryTerminal() {
  return (
    <TerminalContainer
      windowId="aux-monitor"
      title="Monitor"
      titleOnMinimize="Mon"
      initialState={INITIAL_STATE}
      // backgroundColor="rgba(0, 0, 0, 0.7)"
      desktopBounds={{
        minWidth: 240,
        maxWidth: 1024,
        minHeight: 240,
        maxHeight: 1024,
      }}
      desktopDefaultSize={{
        width: 576,
        height: 540,
      }}
      viewportPadding={64}
      className="terminal--monitor"
      style={{
        backdropFilter: 'blur(6px)',
      }}
      headerVariant="compact"
      compactTitleOnMinimize="Mon"
    >
      <MonitorPanel />
    </TerminalContainer>
  )
}
