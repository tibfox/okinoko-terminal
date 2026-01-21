export default function DaoTile({
  dao,
  memberCount,
  activeProposalCount,
  treasuryStr,
  isMobile,
  onClick,
}) {
  const creatorName = String(dao.created_by || '').replace(/^hive:/i, '')

  return (
    <div
      onClick={onClick}
      style={{
        border: '1px solid var(--color-primary-darkest)',
        padding: '12px',
        background: 'rgba(0, 0, 0, 0.35)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        minHeight: '160px',
        maxHeight: '200px',
        width: isMobile ? '100%' : '200px',
        transition: 'border-color 0.2s ease, background 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-primary)'
        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.5)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-primary-darkest)'
        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.35)'
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      }}
    >
      {/* Name */}
      <div style={{
        fontWeight: 700,
        fontSize: 'var(--font-size-base)',
        color: 'var(--color-primary-lighter)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {dao.name || `DAO #${dao.project_id}`}
      </div>

      {/* Creator */}
      <div style={{ fontSize: 'var(--font-size-base)', opacity: 0.85 }}>
        <span style={{ opacity: 0.7 }}>by </span>
        <span style={{ color: 'var(--color-primary-lighter)' }}>@{creatorName}</span>
      </div>

      {/* Stats */}
      <div style={{ fontSize: 'var(--font-size-base)' }}>
        <span style={{ opacity: 0.7 }}>Members: </span>
        <span style={{ color: 'var(--color-primary-lighter)' }}>{memberCount}</span>
      </div>
      <div style={{ fontSize: 'var(--font-size-base)' }}>
        <span style={{ opacity: 0.7 }}>Active proposals: </span>
        <span style={{ color: 'var(--color-primary-lighter)' }}>{activeProposalCount}</span>
      </div>

      {/* Treasury */}
      {treasuryStr && (
        <div style={{
          fontSize: 'var(--font-size-base)',
          marginTop: 'auto',
        }}>
          <span style={{ opacity: 0.7 }}>Treasury: </span>
          <span style={{ color: 'var(--color-primary-lighter)' }}>{treasuryStr}</span>
        </div>
      )}
    </div>
  )
}
