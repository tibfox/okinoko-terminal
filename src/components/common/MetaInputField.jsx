import React, { useState, useEffect } from 'react'
import NeonButton from '../buttons/NeonButton.jsx'
import NeonSwitch from './NeonSwitch.jsx'

export default function MetaInputField({
  paramName,
  paramType,
  params,
  setParams,
  metaAsArray = false,
}) {
  const [entries, setEntries] = useState([])

  // Initialize from parent
  useEffect(() => {
    const existing = params?.[paramName]
    if (existing) {
      if (Array.isArray(existing)) {
        setEntries(existing)
      } else if (typeof existing === 'object') {
        setEntries(Object.entries(existing).map(([k, v]) => ({ key: k, val: v })))
      }
    }
  }, [paramName])

  // Push updates up to parent
  useEffect(() => {
    if (metaAsArray) {
      setParams(prev => ({ ...prev, [paramName]: entries }))
    } else {
      const obj = entries.reduce((acc, { key, val }) => {
        if (key) acc[key] = val
        return acc
      }, {})
      setParams(prev => ({ ...prev, [paramName]: obj }))
    }
  }, [entries])

  const handleAdd = () => setEntries(prev => [...prev, { key: '', val: '' }])
  const handleRemove = (i) => setEntries(prev => prev.filter((_, idx) => idx !== i))
  const handleChange = (i, field, value) => {
    setEntries(prev => {
      const next = [...prev]
      next[i][field] = value
      return next
    })
  }

  const parseAnyValue = (input) => {
    const val = input.trim()
    if (val.toLowerCase() === 'true') return true
    if (val.toLowerCase() === 'false') return false
    if (!isNaN(val) && val !== '') return Number(val)
    return val
  }

  return (
    <div
      style={{
        border: '1px solid rgba(0,255,255,0.2)',
        
        padding: '6px',
        marginTop: '4px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      {entries.map((entry, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
          }}
        >
          {/* Key field */}
          <input
            type="text"
            placeholder="key"
            value={entry.key}
            onChange={(e) => handleChange(i, 'key', e.target.value)}
            className="vsc-input"
            style={{ flex: 1, minWidth: 0 }}
          />

          {/* Value field */}
          {paramType === 'meta-string-bool' ? (
            <NeonSwitch
            name=''
              checked={!!entry.val}
              onChange={(val) => handleChange(i, 'val', val)}
            />
          ) : paramType === 'meta-string-int' ? (
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={entry.val}
              onChange={(e) =>
                handleChange(i, 'val', e.target.value.replace(/[^0-9]/g, ''))
              }
              className="vsc-input"
              style={{ flex: 1, minWidth: 0 }}
            />
          ) : paramType === 'meta-string-any' ? (
            <input
              type="text"
              value={entry.val}
              onChange={(e) =>
                handleChange(i, 'val', parseAnyValue(e.target.value))
              }
              className="vsc-input"
              style={{ flex: 1, minWidth: 0 }}
            />
          ) : (
            <input
              type="text"
              value={entry.val}
              onChange={(e) => handleChange(i, 'val', e.target.value)}
              className="vsc-input"
              style={{ flex: 1, minWidth: 0 }}
            />
          )}

          {/* Remove button */}
          <button
            onClick={() => handleRemove(i)}
            style={{
              background: 'transparent',
              border: '1px solid #0ff',
              color: '#0ff',
              cursor: 'pointer',
              padding: '0 6px',
              
              flexShrink: 0,
            }}
          >
            ✖
          </button>
        </div>
      ))}

      <NeonButton onClick={handleAdd}>＋ Add</NeonButton>
    </div>
  )
}
