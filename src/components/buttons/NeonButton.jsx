import { COLORS } from "../../styles/colors";

import React, { useRef, useState, useEffect } from 'react'
import { playBeep } from '../../lib/beep.js' // ⬅️ adjust path as needed

export default function NeonButton({
  children,
  variant,
  style = {},
  onClick,
  beep = true, // ✅ enable beep by default
  ...props
}) {
  const buttonRef = useRef(null)
  const [fontSize, setFontSize] = useState('1rem')

  const base = {
    backgroundColor: '#000',
    border: '1px solid var(--color-primary)',
    color: 'var(--color-primary)',
    borderRadius: '8px',
    padding: '0.5rem 1rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    fontSize,
    maxWidth: '170px',
  }

  const handleClick = (e) => {
    if (beep) {
       playBeep(300, 50, 'square')   // 🔊 play a sound
    }

    // If user passed their own onClick, call it too
    if (onClick) onClick(e)
  }

  return (
    <button
      ref={buttonRef}
      className="neon-btn"
      style={{ ...base, ...style }}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  )
}
