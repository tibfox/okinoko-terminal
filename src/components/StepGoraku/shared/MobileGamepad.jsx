import { GAME_STYLES } from './asciiGameEngine.js'

/**
 * Reusable Mobile Gamepad with D-pad and action buttons
 * @param {object} keysHeldRef - Ref object for tracking held keys
 * @param {object} config - Configuration for the gamepad
 * @param {boolean} config.showDpad - Whether to show the D-pad (default: true)
 * @param {boolean} config.showUp - Show up button on D-pad
 * @param {boolean} config.showDown - Show down button on D-pad
 * @param {boolean} config.showLeft - Show left button on D-pad
 * @param {boolean} config.showRight - Show right button on D-pad
 * @param {Array} config.actionButtons - Array of { label, key, onPress?, large? }
 */
export default function MobileGamepad({ keysHeldRef, config = {} }) {
  const {
    showDpad = true,
    showUp = false,
    showDown = false,
    showLeft = true,
    showRight = true,
    actionButtons = [{ label: 'ACTION', key: 'action' }],
    dpadOpacity = 1,
  } = config

  const createTouchHandlers = (key) => ({
    onTouchStart: (e) => { e.preventDefault(); keysHeldRef.current[key] = true },
    onTouchEnd: (e) => { e.preventDefault(); keysHeldRef.current[key] = false },
    onTouchCancel: (e) => { e.preventDefault(); keysHeldRef.current[key] = false },
  })

  const createActionHandlers = (btn) => {
    if (btn.onPress) {
      return {
        onTouchStart: (e) => { e.preventDefault(); e.stopPropagation(); btn.onPress() },
        onClick: (e) => { e.stopPropagation(); btn.onPress() },
      }
    }
    return {
      onTouchStart: (e) => { e.preventDefault(); keysHeldRef.current[btn.key] = true },
      onTouchEnd: (e) => { e.preventDefault(); keysHeldRef.current[btn.key] = false },
      onTouchCancel: (e) => { e.preventDefault(); keysHeldRef.current[btn.key] = false },
    }
  }

  return (
    <div style={GAME_STYLES.gamepad}>
      {/* D-Pad (Left) */}
      <div style={{ ...GAME_STYLES.dpad, opacity: showDpad ? dpadOpacity : 0.2 }}>
        <div /> {/* Empty top-left */}
        {showUp ? (
          <button style={GAME_STYLES.dpadButton} {...createTouchHandlers('up')}>▲</button>
        ) : (
          <div style={GAME_STYLES.dpadCenter} />
        )}
        <div /> {/* Empty top-right */}
        {showLeft ? (
          <button style={GAME_STYLES.dpadButton} {...createTouchHandlers('left')}>◀</button>
        ) : (
          <div style={GAME_STYLES.dpadCenter} />
        )}
        <div style={GAME_STYLES.dpadCenter} /> {/* Center */}
        {showRight ? (
          <button style={GAME_STYLES.dpadButton} {...createTouchHandlers('right')}>▶</button>
        ) : (
          <div style={GAME_STYLES.dpadCenter} />
        )}
        <div /> {/* Empty bottom-left */}
        {showDown ? (
          <button style={GAME_STYLES.dpadButton} {...createTouchHandlers('down')}>▼</button>
        ) : (
          <div style={GAME_STYLES.dpadCenter} />
        )}
        <div /> {/* Empty bottom-right */}
      </div>

      {/* Action Buttons (Right) */}
      <div style={GAME_STYLES.actionButtons}>
        {actionButtons.map((btn, idx) => (
          <button
            key={idx}
            style={btn.large !== false ? GAME_STYLES.actionButtonLarge : GAME_STYLES.actionButton}
            {...createActionHandlers(btn)}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  )
}
