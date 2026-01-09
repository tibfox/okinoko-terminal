import { useState, useEffect } from 'preact/hooks'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHourglass } from '@fortawesome/free-solid-svg-icons'

export function MaintenanceOverlay({ message }) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 900)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)

    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(0, 0, 0, 0.5)',
    zIndex: 9999999,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'auto',
  }

  const modalStyle = {
    width: isMobile ? '80%' : '33%',
    height: 'auto',
    background: '#000',
    border: '2px solid var(--color-primary)',
    boxShadow: '0 0 20px var(--color-primary-darker)',
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '2rem',
    fontFamily: 'var(--font-family-base)',
    gap: isMobile ? '2rem' : '3rem',
  }

  const iconContainerStyle = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  }

  const iconStyle = {
    fontSize:'0.9rem',
    color: 'var(--color-primary)',
  }

  const messageStyle = {
    color: 'var(--color-primary)',
    textAlign: 'center',
    fontSize: 'var(--font-size-base)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    lineHeight: '1.6',
    maxWidth: '100%',
  }

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={iconContainerStyle}>
          <FontAwesomeIcon
            icon={faHourglass}
            style={iconStyle}
            className="maintenance-spinner"
          />
        </div>
        <div style={messageStyle}>
          {message}
        </div>
      </div>
    </div>
  )
}
