import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCaretLeft, faCaretRight } from '@fortawesome/free-solid-svg-icons'

/**
 * A resizable divider component for splitting layouts into two columns
 * @param {Object} props
 * @param {boolean} props.leftCollapsed - Whether the left column is collapsed
 * @param {boolean} props.rightCollapsed - Whether the right column is collapsed
 * @param {Function} props.onDragStart - Callback when dragging starts
 */
export default function ResizableDivider({ leftCollapsed, rightCollapsed, onDragStart }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'col-resize',
        position: 'relative',
        background: 'var(--color-primary-darkest)',
        userSelect: 'none',
        width: '100%',
      }}
      onMouseDown={onDragStart}
      onTouchStart={(e) => {
        e.preventDefault()
        onDragStart()
      }}
    >
      <div
        style={{
          position: 'absolute',
          bottom: '0px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '28px',
          height: '28px',
          borderRadius: '0',
          background: '#000',
          border: '1px solid var(--color-primary-darker)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0px',
        }}
      >
        {leftCollapsed ? (
          <FontAwesomeIcon
            icon={faCaretRight}
            style={{ color: 'var(--color-primary-darker)', fontSize:'0.9rem' }}
          />
        ) : rightCollapsed ? (
          <FontAwesomeIcon
            icon={faCaretLeft}
            style={{ color: 'var(--color-primary-darker)', fontSize:'0.9rem' }}
          />
        ) : (
          <>
            <FontAwesomeIcon
              icon={faCaretLeft}
              style={{ color: 'var(--color-primary-darker)', fontSize:'0.9rem' }}
            />
            <FontAwesomeIcon
              icon={faCaretRight}
              style={{ color: 'var(--color-primary-darker)', fontSize:'0.9rem'}}
            />
          </>
        )}
      </div>
    </div>
  )
}
