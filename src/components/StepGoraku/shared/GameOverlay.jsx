/**
 * Reusable Overlay for game states (ready, countdown, lost)
 * @param {string} gameState - Current game state
 * @param {number} countdown - Countdown number (for countdown state)
 * @param {object} gameConfig - Game-specific configuration
 * @param {string} gameConfig.title - Game title
 * @param {string[]} gameConfig.instructions - Array of instruction lines
 * @param {string} gameConfig.subtitle - Optional subtitle
 * @param {object} gameConfig.lostStats - Stats to show on game over { label, value }[]
 * @param {string} gameConfig.lostMessage - Message shown on game over
 */
export default function GameOverlay({ gameState, countdown, gameConfig }) {
  if (gameState === 'playing') return null

  if (gameState === 'countdown') {
    return (
      <div style={{ fontSize: '48px', color: 'var(--color-primary)' }}>
        {countdown}
      </div>
    )
  }

  if (gameState === 'ready') {
    return (
      <>
        <div style={{ fontSize: '20px', marginBottom: '10px' }}>{gameConfig.title}</div>
        {gameConfig.instructions.map((line, idx) => (
          <div key={idx} style={{ marginBottom: '5px' }}>{line}</div>
        ))}
        {gameConfig.subtitle && (
          <div style={{ marginBottom: '15px', fontSize: '12px' }}>{gameConfig.subtitle}</div>
        )}
        <div style={{ color: 'var(--color-primary)' }}>
          [SPACE] or [CLICK] to START
        </div>
      </>
    )
  }

  if (gameState === 'lost') {
    return (
      <>
        <div style={{ fontSize: '24px', marginBottom: '10px', color: '#ff6b6b' }}>
          {gameConfig.lostTitle || 'GAME OVER'}
        </div>
        {gameConfig.lostStats && gameConfig.lostStats.map((stat, idx) => (
          <div key={idx} style={{ marginBottom: '5px' }}>
            {stat.label}: {stat.value}
          </div>
        ))}
        {gameConfig.lostMessage && (
          <div style={{ marginBottom: '15px' }}>{gameConfig.lostMessage}</div>
        )}
        <div style={{ color: 'var(--color-primary)' }}>
          [SPACE] or [CLICK] to TRY AGAIN
        </div>
      </>
    )
  }

  return null
}
