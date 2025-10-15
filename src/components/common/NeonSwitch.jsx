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
            color: '#0ff',
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
          border: '1px solid #0ff',
          borderRadius: '12px',
          position: 'relative',
          backgroundColor: checked
            ? 'rgba(0,255,255,0.3)'
            : 'rgba(0,0,0,0.5)',
          transition: 'all 0.2s ease-in-out',
          boxShadow: checked
            ? '0 0 8px #0ff, inset 0 0 4px #0ff'
            : 'inset 0 0 4px rgba(0,255,255,0.2)',
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
            backgroundColor: checked ? '#0ff' : '#555',
            transition: 'left 0.2s ease',
          }}
        />
      </div>
    </div>
  )
}
