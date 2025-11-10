import NeonButton from '../buttons/NeonButton.jsx'

/**
 * Simple two-state tab row that only renders on mobile when `visible` is true.
 * Pass an array of { id, label } tabs and track the state in the parent.
 */
export default function MobileTabs({ visible, tabs, activeTab, onChange }) {
  if (!visible || !tabs?.length) return null

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '8px',
        marginBottom: '10px',
      }}
    >
      {tabs.map((tab) => (
        <NeonButton
          key={tab.id}
          onClick={() => !tab.disabled && onChange?.(tab.id)}
          style={{ opacity: activeTab === tab.id ? 1 : 0.5 }}
          disabled={tab.disabled}
        >
          {tab.label}
        </NeonButton>
      ))}
    </div>
  )
}
