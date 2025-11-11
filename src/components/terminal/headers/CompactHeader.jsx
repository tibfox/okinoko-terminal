import SlotText from '../../animations/SlotText.jsx'
import { useResponsiveTitleSize } from '../../../hooks/useResponsiveTitleSize.js'

export default function CompactHeader({
  title,
  onDragPointerDown,
  isMinimized = false,
}) {
  const normalizedTitle = title?.toUpperCase().replace(/Ō/g, 'ō') ?? ''
  const { wrapperRef, fontSize, isClamped } = useResponsiveTitleSize({
    text: normalizedTitle,
  })

  const showGlyphFallback = isMinimized && isClamped

  const commonStyle = {
    fontSize: `${fontSize}px`,
    lineHeight: 1.05,
  }

  return (
    <div
      ref={wrapperRef}
      onPointerDown={onDragPointerDown}
      style={{
        cursor: 'grab',
        display: 'flex',
        justifyContent: 'flex-start',
        marginBottom: '1.5rem',
        minWidth: 0,
      }}
    >
      {showGlyphFallback ? (
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
            marginRight: '75px',
            fontFamily: "'Share Tech Mono',monospace",
            letterSpacing: '0.15em',
            display: 'inline-block',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            ...commonStyle,
          }}
        />
      ) : (
        <h1
          className="cyber-tile"
          style={{
            margin: 0,
            marginRight: '75px',
            fontFamily: "'Share Tech Mono',monospace",
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            letterSpacing: '0.15em',
            display: 'inline-block',
            ...commonStyle,
          }}
          title={isClamped ? normalizedTitle : undefined}
        >
          {normalizedTitle}
        </h1>
      )}
    </div>
  )
}
