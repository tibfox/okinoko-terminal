import { useState } from 'preact/hooks'
import NeonButton from '../../buttons/NeonButton.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'

// Helper component to add sparkle effect to buttons
const SparkleButton = ({ onClick, disabled, children }) => (
  <>
    {/* Bottom grid - continuous twinkle (always active) */}
    <div className="pixel-sparkle-grid pixel-sparkle-grid-twinkle">
      {Array.from({ length: 90 }).map((_, i) => (
        <div key={`twinkle-${i}`} className="pixel-sparkle-twinkle"></div>
      ))}
    </div>
    {/* Top grid - black overlay that reveals sparkles on hover */}
    <div className="pixel-sparkle-grid pixel-sparkle-grid-overlay">
      {Array.from({ length: 90 }).map((_, i) => (
        <div key={`overlay-${i}`} className="pixel-sparkle-overlay"></div>
      ))}
    </div>
    {/* Button text - must be above all grids */}
    <span style={{
      position: 'relative',
      zIndex: 3,
      textShadow: '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, -2px 0 0 #000, 2px 0 0 #000, 0 -2px 0 #000, 0 2px 0 #000'
    }}>
      {children}
    </span>
  </>
)

export default function ActionFooter({
  displayMode,
  pending,
  isSendEnabled,
  onCreate,
  onJoin,
  onMove,
  onBackToMode,
  onBackToGameList,
  showGameListButton = false,
}) {
  const renderActionButton = () => {
    if (!displayMode) {
      return <span />
    }

    if (displayMode === 'g_create') {
      return (
        <div className="next-button-glitter-wrapper" style={{ width: '100%' }}>
          <NeonButton onClick={onCreate} disabled={!isSendEnabled} style={{ position: 'relative', overflow: 'hidden', width: '100%' }}>
            <SparkleButton>
              {pending ? (
                'Creating...'
              ) : (
                <>
                  Create Game
                  <FontAwesomeIcon icon={faChevronRight} style={{ marginLeft: '10px' }} />
                </>
              )}
            </SparkleButton>
          </NeonButton>
        </div>
      )
    }

    if (displayMode === 'g_join') {
      return (
        <div className="next-button-glitter-wrapper">
          <NeonButton onClick={onJoin} disabled={!isSendEnabled} style={{ position: 'relative', overflow: 'hidden' }}>
            <SparkleButton>
              {pending ? (
                'Joining...'
              ) : (
                <>
                  Join Game
                  <FontAwesomeIcon icon={faChevronRight} style={{ marginLeft: '10px' }} />
                </>
              )}
            </SparkleButton>
          </NeonButton>
        </div>
      )
    }

    return (
      <div className="next-button-glitter-wrapper" style={{ width: '100%' }}>
        <NeonButton onClick={onMove} disabled={!isSendEnabled} style={{ position: 'relative', overflow: 'hidden', width: '100%' }}>
          <SparkleButton>
            {pending ? (
              'Sending…'
            ) : (
              <>
                Send Move
                <FontAwesomeIcon icon={faChevronRight} style={{ marginLeft: '10px' }} />
              </>
            )}
          </SparkleButton>
        </NeonButton>
      </div>
    )
  }

  const useGameListAction = Boolean(showGameListButton && onBackToGameList)
  const backButtonLabel = useGameListAction ? 'Game List' : 'Game Mode'
  const backButtonHandler = useGameListAction ? onBackToGameList : onBackToMode

  return (
    <div
      style={{
        display: 'flex',
        marginTop: '10px',
        gap: '12px',
        justifyContent: 'space-between',
        width: '100%',
        alignItems: 'center',
      }}
    >
      <NeonButton onClick={backButtonHandler}>
        <FontAwesomeIcon icon={faChevronLeft} style={{ marginRight: '10px' }} />
        {backButtonLabel}
      </NeonButton>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        {renderActionButton()}
      </div>
    </div>
  )
}
