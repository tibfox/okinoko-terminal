import { useState } from 'preact/hooks'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons'

export function CyberContainer({ title, children, defaultCollapsed = false }) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)

  const toggle = () => setIsCollapsed(prev => !prev)
  const collapseIcon = isCollapsed ? faChevronDown : faChevronUp

  return (
    <div style={{ marginTop: '24px', textAlign: 'left' }}>
      {/* Header tile */}
      <button
        type="button"
        onClick={toggle}
        className="cyber-subheader"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          color: 'var(--color-primary-lightest)',
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
        }}
      >
       {title}
        <FontAwesomeIcon icon={collapseIcon} />
      </button>

      {/* Collapsible content */}
      {!isCollapsed && (
        <div
          style={{
            border: '1px solid var(--color-primary-darkest)',
            borderTop: 'none',
            background: 'rgba(0,0,0,0.25)',
            padding: '20px',
            borderRadius: 0,
            marginTop: '-24px',
            position: 'relative',
            zIndex: -1,
          }}
        >
          {children}
        </div>
      )}
    </div>
  )
}