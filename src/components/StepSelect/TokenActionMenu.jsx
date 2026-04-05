import { useState, useRef, useEffect } from 'preact/hooks'
import { createPortal } from 'preact/compat'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBars } from '@fortawesome/free-solid-svg-icons'
import { baseButtonStyle } from './daoHelpers.js'

const menuItemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '0.4rem 0.75rem',
  background: 'transparent',
  border: 'none',
  color: 'var(--color-primary)',
  fontSize: 'var(--font-size-base)',
  fontFamily: 'var(--font-family-base)',
  cursor: 'pointer',
  width: '100%',
  textAlign: 'left',
  whiteSpace: 'nowrap',
  transition: 'background 0.15s ease',
}

const menuItemDisabledStyle = {
  ...menuItemStyle,
  opacity: 0.3,
  cursor: 'not-allowed',
}

/**
 * A lightweight dropdown action menu for table rows.
 * Uses a portal so the dropdown is never clipped by parent overflow.
 * @param {{ items: Array<{ label: string, icon?: any, onClick: () => void, disabled?: boolean }> }} props
 */
export default function TokenActionMenu({ items }) {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const menuRef = useRef(null)
  const btnRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) &&
          btnRef.current && !btnRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const toggleMenu = (e) => {
    e?.stopPropagation?.()
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setMenuPos({
        top: rect.bottom + 4 + window.scrollY,
        left: rect.right + window.scrollX,
      })
    }
    setOpen((p) => !p)
  }

  const dropdown = open && createPortal(
    <div
      ref={menuRef}
      style={{
        position: 'absolute',
        top: `${menuPos.top}px`,
        left: `${menuPos.left}px`,
        transform: 'translateX(-100%)',
        zIndex: 99999,
        background: 'rgba(6, 6, 6, 0.95)',
        border: '1px solid var(--color-primary-darkest)',
        boxShadow: '0 0 12px var(--color-primary-darkest)',
        padding: '0.25rem 0',
        minWidth: '10rem',
      }}
    >
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => {
            if (item.disabled) return
            setOpen(false)
            item.onClick()
          }}
          style={item.disabled ? menuItemDisabledStyle : menuItemStyle}
          onMouseEnter={(e) => { if (!item.disabled) e.currentTarget.style.background = 'var(--color-primary-darkest)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        >
          {item.icon && <FontAwesomeIcon icon={item.icon} style={{ fontSize: '0.8rem', width: '14px' }} />}
          {item.label}
        </button>
      ))}
    </div>,
    document.body,
  )

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        ref={btnRef}
        onClick={toggleMenu}
        style={{
          ...baseButtonStyle(false),
          padding: '0.15rem 0.4rem',
          fontSize: '0.75rem',
          background: open ? 'var(--color-primary-darkest)' : 'rgba(0, 0, 0, 0.6)',
          color: 'var(--color-primary)',
          minWidth: 'unset',
        }}
      >
        <FontAwesomeIcon icon={faBars} />
      </button>
      {dropdown}
    </div>
  )
}
