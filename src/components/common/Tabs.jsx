import { h } from 'preact'

export function Tabs({ tabs, activeTab, onChange }) {
  const tabButtonStyle = (active) => ({
    flex: 1,
    padding: '10px 12px',
    background: active ? 'var(--color-primary-darker)' : 'transparent',
    color: active ? 'var(--color-primary-lightest)' : 'var(--color-primary-lighter)',
    border: '1px solid var(--color-primary-darkest)',
    cursor: 'pointer',
    textTransform: 'uppercase',
    fontSize: '0.85rem',
    letterSpacing: '0.05em',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: '100px',
  })

  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          style={tabButtonStyle(activeTab === tab.id)}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
