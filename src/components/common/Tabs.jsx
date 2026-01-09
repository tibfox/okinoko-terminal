import { h } from 'preact'
import { playBeep } from '../../lib/beep.js'

export function Tabs({ tabs, activeTab, onChange }) {
  const tabButtonStyle = (active) => ({
    flex: 1,
    padding: '10px 12px',
    background: active ? 'var(--color-primary-darker)' : 'transparent',
    color: active ? 'black' : 'var(--color-primary-lighter)',
    border: '1px solid var(--color-primary-darkest)',
    cursor: 'pointer',
    textTransform: 'uppercase',
    fontSize: 'var(--font-size-base)',
    letterSpacing: '0.05em',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: '100px',
    zIndex: 1,
  })

  const handleClick = (id) => {
    playBeep(800, 25, 'square')
    onChange(id)
  }

  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className="tabs-button"
          style={tabButtonStyle(activeTab === tab.id)}
          onClick={() => handleClick(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
