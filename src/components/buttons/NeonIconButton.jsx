import { h } from 'preact'
import { playBeep } from '../../lib/beep.js'

export default function NeonIconButton({
  children,
  style = {},
  onClick,
  beep = true,
  disabled = false,
  ...props
}) {
  const base = {
    backgroundColor: 'transparent',
    border: '1px solid var(--color-primary-darkest)',
    color: disabled ? 'var(--color-primary-darker)' : 'var(--color-primary-lighter)',
    borderRadius: '0px',
    padding: 0,
    width: '42px',
    height: '42px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.25s ease',
    fontSize: 'var(--font-size-base)',
    opacity: disabled ? 0.5 : 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  const handleClick = (e) => {
    if (disabled) return
    if (beep) playBeep(400, 25, 'square')
    if (onClick) onClick(e)
  }

  return (
    <button
      className="neon-icon-btn"
      disabled={disabled}
      style={{ ...base, ...style }}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  )
}
