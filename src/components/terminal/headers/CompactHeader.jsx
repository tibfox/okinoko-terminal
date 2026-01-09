import SlotText from '../../animations/SlotText.jsx'

export default function CompactHeader({
  title,
  onDragPointerDown,
  isMinimized = false,
}) {
  const normalizedTitle = title?.toUpperCase().replace(/Ō/g, 'ō') ?? ''

  return (
    <div
      onPointerDown={onDragPointerDown}
      style={{
        cursor: 'grab',
        display: 'flex',
        justifyContent: 'flex-start',
        minWidth: 0,
        marginBottom: '1.5rem',
      }}
    >
      {isMinimized ? (
        <h1
          className="cyber-tile"
          style={{
            margin: 0,
            marginRight: '15px',
            fontSize: 'var(--font-size-base)',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            letterSpacing: '0.15em',
            display: 'inline-block',
          }}
          title={normalizedTitle}
        >
          {normalizedTitle}
        </h1>
      ) : (
        <SlotText
          text={normalizedTitle}
          tag="h1"
          interval={60}
          baseDuration={100}
          charDuration={30}
          pad={false}
          className="cyber-tile"
          style={{
            margin: 0,
            marginRight: '15px',
            fontFamily: 'var(--font-family-base)',
            fontSize: 'var(--font-size-base)',
            letterSpacing: '0.15em',
            display: 'inline-block',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
          }}
        />
      )}
    </div>
  )
}
