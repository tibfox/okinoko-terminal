import { h } from 'preact'
import { useRef } from 'preact/hooks'
import { playBeep } from '../../lib/beep.js'

export default function NeonButtonSimple({
  children,
  variant,
  style = {},
  onClick,
  beep = true,
  disabled = false,
  ...props
}) {
  const buttonRef = useRef(null)
  const base = {
    backgroundColor: '#000',
    color: disabled ? 'var(--color-primary-darker)' : 'var(--color-primary)',
    borderRadius: '0px',
    padding: '0.5rem 1rem',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.25s ease',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    fontSize: 'var(--font-size-base)',
    maxWidth: 'max-content',
    opacity: disabled ? 0.5 : 1,
    position: 'relative',
  }

  const handleClick = (e) => {
    if (disabled) return
    if (beep) playBeep(400, 25, 'square')
    if (onClick) onClick(e)
  }

  return (
    <button
      ref={buttonRef}
      className="neon-btn-simple"
      disabled={disabled}
      style={{ ...base, ...style }}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  )
}
