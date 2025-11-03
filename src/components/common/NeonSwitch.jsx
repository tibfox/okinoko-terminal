import { COLORS } from "../../styles/colors";

import React from 'react'
import { playBeep } from '../../lib/beep.js' // adjust path as needed

export default function NeonSwitch({ name = '', checked, onChange, beep = true }) {
  const handleToggle = () => {
    const newState = !checked
    onChange(newState)

    if (beep) {
      playBeep(400, 50, 'square')
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px', // space between label and switch
        cursor: 'pointer',
        justifyContent: 'space-between',
      }}
      onClick={handleToggle}
    >
      {/* ✅ Only show name if it's not empty */}
      {name && (
        <span
          style={{
            color: 'var(--color-primary)',
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: '0.9em',
            userSelect: 'none',
          }}
        >
          {name}
        </span>
      )}

      {/* ✅ Switch */}
      <div
        style={{
          width: '44px',
          height: '22px',
          border: '1px solid ' + 'var(--color-primary-darker)',
          borderRadius: '12px',
          position: 'relative',
          backgroundColor: checked
            ? 'var(--color-primary-darker)'
            : 'var(--color-primary-darkest)',
          transition: 'all 0.2s ease-in-out',
         
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '2px',
            left: checked ? '24px' : '2px',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            backgroundColor: checked
            ? 'var(--color-primary)'
            : 'var(--color-primary-darker)',
            transition: 'left 0.2s ease',
          }}
        />
      </div>
    </div>
  )
}
