import React from 'react'
import { playBeep } from '../../lib/beep.js' // 🔊 adjust the path if needed

export default function ListButton({
  children,
  variant,
  onClick,
  beep = true, // ✅ default: button makes a beep
  ...props
}) {
  const handleClick = (e) => {
    if (beep) {
      playBeep(360, 50, 'square') 
    }

    // run user’s click handler too
    if (onClick) onClick(e)
  }

  return (
    <button
      className="neon-list-btn"
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  )
}
