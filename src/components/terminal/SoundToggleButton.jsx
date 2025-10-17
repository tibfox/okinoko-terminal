import { h } from 'preact'
import { useState } from 'preact/hooks'
import { playBeep, setSoundEnabled, getSoundEnabled } from '../../lib/beep.js'

export default function SoundToggleButton({ style = {} }) {
  const [soundEnabled, setSoundState] = useState(getSoundEnabled())
  const [hovered, setHovered] = useState(false)

  function toggleSound() {
    const newValue = !soundEnabled
    setSoundState(newValue)
    setSoundEnabled(newValue)
    playBeep(800, 100)
  }

  const baseStyle = {
    background: 'none',
    border: 'none',
    color: 'var(--color-primary-darker)',
    width: '32px',
    height: '32px',
    cursor: 'pointer',
    fontSize: '1.5rem',
    fontFamily: "'Share Tech Mono', monospace",
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
    borderRadius: '50%',
    textShadow: hovered
      ? '0 0 8px var(--color-primary), 0 0 12px var(--color-primary-lighter)'
      : 'none',
    transform: 'rotate(180deg)', // 👈 Always include rotation here
  }

  return (
    <button
      onClick={toggleSound}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ ...baseStyle, ...style }} // 👈 Merge styles safely
      title={soundEnabled ? 'Mute sound' : 'Enable sound'}
    >
      {soundEnabled ? (
        <span style={{ color: 'var(--color-primary-darker)' }}>🕪</span>
      ) : (
        <span
          style={{
            position: 'relative',
            display: 'inline-block',
            color: 'var(--color-primary-darkest)',
          }}
        >
          <span>🕨</span>
        </span>
      )}
    </button>
  )
}
