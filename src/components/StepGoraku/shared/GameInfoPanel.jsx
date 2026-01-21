import { memo } from 'preact/compat'
import { GAME_STYLES } from './asciiGameEngine.js'

/**
 * Reusable Info Panel for arcade games
 * @param {Array} items - Array of { label, value } objects to display
 */
const GameInfoPanel = memo(({ items }) => (
  <div style={GAME_STYLES.infoPanelMobile}>
    {items.map((item, idx) => (
      <div key={idx} style={GAME_STYLES.infoPanelMobileItem}>
        <span style={GAME_STYLES.infoPanelLabel}>{item.label}</span>
        <span style={GAME_STYLES.infoPanelValue}>{item.value}</span>
      </div>
    ))}
  </div>
))

export default GameInfoPanel
