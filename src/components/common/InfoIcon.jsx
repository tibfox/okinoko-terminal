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
        title={tooltip}
        style={{
          color: 'var(--color-primary-lighter)',
          cursor: 'help',
          fontSize: `${size}px`,
          ...(style || {}),
        }}
        onMouseEnter={(e) =>
          setHintOverlay({
            text: tooltip,
            x: e.clientX - 60,
            y: e.clientY - 60,
          })
        }
        onMouseMove={(e) =>
          setHintOverlay((prev) =>
            prev
              ? {
                  ...prev,
                  x: e.clientX - 60,
                  y: e.clientY - 60,
                }
              : prev
          )
        }
        onMouseLeave={() => setHintOverlay(null)}
      />

      {hintOverlay && createPortal(
        <div
          style={{
            position: 'fixed',
            top: hintOverlay.y,
            left: hintOverlay.x,
            zIndex: 2147483647,
            background: 'black',
            border: '1px solid var(--color-primary-darker)',
            padding: '8px 10px',
            maxWidth: '280px',
            color: 'var(--color-primary-lighter)',
            fontSize: '0.85rem',
            pointerEvents: 'none',
            boxShadow: '0 0 8px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(3px)',
          }}
        >
          {hintOverlay.text}
        </div>,
        document.body
      )}
    </>
  )
}
