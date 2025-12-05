import { useEffect, useRef, useState } from 'preact/hooks'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCaretDown, faCheck } from '@fortawesome/free-solid-svg-icons'

export default function NeonListDropdown({
  options = [],
  value,
  onChange, // expects new value
  placeholder = 'Select…',
  title,
  style = {},
  menuOffsetY = '0.5rem',
  showCheck = false,
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const selected = options.find((opt) => String(opt.value) === String(value))

  useEffect(() => {
    if (!open) return
    const handlePointer = (e) => {
      if (containerRef.current?.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointer, true)
    return () => document.removeEventListener('pointerdown', handlePointer, true)
  }, [open])

  const handleSelect = (val) => {
    onChange?.(val)
    setOpen(false)
  }

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%', ...style }}
      title={title}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          width: '100%',
          textAlign: 'left',
          padding: '12px 38px 12px 14px',
          background: 'rgba(6, 6, 6, 0.9)',
          color: 'var(--color-primary-lighter)',
          border: '1px solid var(--color-primary-darkest)',
          // borderRadius: '6px',
          fontWeight: 600,
          letterSpacing: '0.03em',
          boxShadow: '0 0 8px rgba(0,0,0,0.4)',
          cursor: 'pointer',
        }}
      >
        <span style={{ opacity: selected ? 1 : 0.75 }}>
          {selected ? selected.label : placeholder}
        </span>
        <FontAwesomeIcon
          icon={faCaretDown}
          style={{
            position: 'absolute',
            right: 14,
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            color: 'var(--color-primary)',
            fontSize: '0.95rem',
          }}
        />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: `calc(100% + ${menuOffsetY})`,
            right: 0,
            minWidth: '100%',
            background: 'rgba(0, 0, 0, 0.95)',
            border: '2px solid var(--color-primary-darkest)',
            
            boxShadow: '0 0 18px var(--color-primary-darkest)',
            padding: '0.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
            zIndex: 1000,
          }}
        >
          {options.map((opt) => (
            <button
              key={opt.value ?? opt.label ?? opt}
              type="button"
              onClick={() => handleSelect(opt.value)}
              style={{
                textAlign: 'left',
                border: '1px solid var(--color-primary-darkest)',
                
                padding: '0.4rem 0.5rem',
                background: 'rgba(6, 6, 6, 0.9)',
                color: 'var(--color-primary-lighter)',
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
              title={opt.title}
            >
              {showCheck && String(opt.value) === String(value) ? (
                <FontAwesomeIcon icon={faCheck} style={{ color: 'var(--color-primary)' }} />
              ) : (
                <span style={{ width: '16px' }} />
              )}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontWeight: 600 }}>{opt.label ?? opt.value}</div>
              {opt.subtitle ? (
                <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{opt.subtitle}</div>
              ) : null}
              </div>
            </button>
          ))}
          {!options.length && (
            <div style={{ color: 'var(--color-primary-lighter)', opacity: 0.75, fontSize: '0.85rem' }}>
              No options available.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
