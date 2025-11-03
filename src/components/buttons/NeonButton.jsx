import { h } from 'preact'
import { useRef, useState } from 'preact/hooks'
import { playBeep } from '../../lib/beep.js'

export default function NeonButton({
  children,
  variant,
  style = {},
  onClick,
  beep = true,
  disabled = false, // ✅ add disabled prop
  ...props
}) {
  const buttonRef = useRef(null)
  const [hovered, setHovered] = useState(false)

 const base = {
  backgroundColor: '#000',
  border: `1px solid ${
    disabled ? 'var(--color-primary-darker)' : 'var(--color-primary-darker)'
  }`,
  color: disabled ? 'var(--color-primary-darker)' : 'var(--color-primary)',
  borderRadius: '0px',
  padding: '0.5rem 1rem',
  cursor: disabled ? 'not-allowed' : 'pointer',
  transition: 'all 0.25s ease',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  fontSize: '1rem',
  maxWidth: '170px',
  opacity: disabled ? 0.5 : 1,
  textShadow: !disabled && hovered
    ? '0 0 4px var(--color-primary), 0 0 6px var(--color-primary-lighter)'
    : 'none',

  
}


  const handleClick = (e) => {
    if (disabled) return 
    if (beep) playBeep(300, 50, 'square')
    if (onClick) onClick(e)
  }

  return (
    <button
      ref={buttonRef}
      className="neon-btn"
      disabled={disabled}
      style={{ ...base, ...style }}
      onClick={handleClick}
      onMouseEnter={() => !disabled && setHovered(true)}
      onMouseLeave={() => !disabled && setHovered(false)}
      {...props}
    >
      {children}
       <svg preserveAspectRatio="none" viewBox="0 0 100 40">
    <polygon points="0,0 86,0 100,40 0,40"></polygon>
  </svg>
    </button>
  )
}
