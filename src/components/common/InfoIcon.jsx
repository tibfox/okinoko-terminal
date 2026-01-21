import { useState } from 'preact/hooks'
import { createPortal } from 'preact/compat'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'

export default function InfoIcon({ tooltip, size = 16, style }) {
  const [hintOverlay, setHintOverlay] = useState(null)

  return (
    <>
      <FontAwesomeIcon
        icon={faCircleInfo}
        title={typeof tooltip === 'string' ? tooltip : undefined}
        style={{
          color: 'var(--color-primary-lighter)',
          cursor: 'help',
          fontSize:'0.9rem',
          ...(style || {}),
        }}
        onMouseEnter={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          setHintOverlay({
            content: tooltip,
            x: rect.left + rect.width / 2,
            y: rect.top,
          })
        }}
        onMouseLeave={() => setHintOverlay(null)}
      />

      {hintOverlay && createPortal(
        <div
          style={{
            position: 'fixed',
            top: hintOverlay.y - 10,
            left: hintOverlay.x,
            transform: 'translate(-50%, -100%)',
            zIndex: 2147483647,
            background: 'black',
            border: '1px solid var(--color-primary-darker)',
            padding: '8px 10px',
            color: 'var(--color-primary-lighter)',
            fontSize: 'var(--font-size-base)',
            pointerEvents: 'auto',
            boxShadow: '0 0 8px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(3px)',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={() => setHintOverlay(hintOverlay)}
          onMouseLeave={() => setHintOverlay(null)}
        >
          {hintOverlay.content}
        </div>,
        document.body
      )}
    </>
  )
}
