import { useState } from 'preact/hooks'
import { playBeep, setSoundEnabled, getSoundEnabled } from '../../lib/beep.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faVolumeXmark,faVolumeHigh } from '@fortawesome/free-solid-svg-icons';



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
    
    width: '32px',
    height: '32px',
    cursor: 'pointer',
    fontSize: '1rem',
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
    
  }

  return (
    <button
      onClick={toggleSound}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ ...baseStyle, ...style }} 
      title={soundEnabled ? 'Mute sound' : 'Enable sound'}
    >
      {soundEnabled ? (
        <span style={{ color: hovered?'var(--color-primary)':'var(--color-primary-darker)', }}>
       <FontAwesomeIcon icon={faVolumeHigh} style={{fontSize: '1.5rem'}} />

        </span>
      ) : (
        <span
          style={{
            position: 'relative',
            display: 'inline-block',
            color: hovered?'var(--color-primary)':'var(--color-primary-darker)',
          }}
        >
          <span><FontAwesomeIcon icon={faVolumeXmark} /></span>
        </span>
      )}
    </button>
  )
}
