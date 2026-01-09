import { useState } from 'preact/hooks'
import { playBeep, setSoundEnabled, getSoundEnabled } from '../../../lib/beep.js'
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
    fontSize: 'var(--font-size-base)',
    fontFamily: 'var(--font-family-base)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
    // borderRadius: '50%',
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
        <span style={{ color: 'var(--color-primary-darker)', }}>
          <FontAwesomeIcon icon={faVolumeHigh} style={{ fontSize: '0.9rem' }} />
        </span>
      ) : (
        <span
          style={{
            position: 'relative',
            display: 'inline-block',
            color: 'var(--color-primary-darker)',
          }}
        >
          
          <FontAwesomeIcon icon={faVolumeXmark} style={{ fontSize: '0.9rem' }} />
        </span>
      )}
    </button>
  )
}
