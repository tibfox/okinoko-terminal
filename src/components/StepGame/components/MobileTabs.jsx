import NeonButton from '../../buttons/NeonButton.jsx'

const resolveBrowseLabel = (activeGame, mode) => {
  if (!activeGame) return 'BROWSE'
  return mode === 'g_join' ? 'BROWSE' : 'INFO'
}

const resolvePreviewLabel = (activeGame, mode) => {
  if (!activeGame) return 'DETAILS'
  return mode === 'g_join' ? 'GAME INFO' : 'BOARD'
}

export default function MobileTabs({ visible, activePage, activeGame, displayMode, onChange }) {
  if (!visible) return null

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '8px',
        marginBottom: '10px',
      }}
    >
      <NeonButton
        onClick={() => onChange?.('form')}
        style={{ opacity: activePage === 'form' ? 1 : 0.5 }}
      >
        {resolveBrowseLabel(activeGame, displayMode)}
      </NeonButton>
      <NeonButton
        onClick={() => onChange?.('preview')}
        style={{ opacity: activePage === 'preview' ? 1 : 0.5 }}
      >
        {resolvePreviewLabel(activeGame, displayMode)}
      </NeonButton>
    </div>
  )
}
