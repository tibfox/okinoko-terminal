import { useState } from 'preact/hooks'
import NeonButton from '../../buttons/NeonButton.jsx'
import SparkleButton from '../../buttons/SparkleButton.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'



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
  hideSendButton = false,
}) {
  const renderActionButton = () => {
    if (!displayMode || hideSendButton) {
      return <span />
    }

    if (displayMode === 'g_create') {
      return (
        <div className="next-button-glitter-wrapper">
          <NeonButton onClick={onCreate} disabled={!isSendEnabled} style={{ position: 'relative', overflow: 'hidden' }}>
            <SparkleButton>
              {pending ? (
                'Creating...'
              ) : (
                <>
                  Create Game
                  <FontAwesomeIcon icon={faChevronRight} style={{ fontSize:'0.9rem',marginLeft: '10px' }} />
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
                  <FontAwesomeIcon icon={faChevronRight} style={{ fontSize:'0.9rem',marginLeft: '10px' }} />
                </>
              )}
            </SparkleButton>
          </NeonButton>
        </div>
      )
    }

    return (
      <div className="next-button-glitter-wrapper">
        <NeonButton onClick={onMove} disabled={!isSendEnabled}
        style={{ position: 'relative', overflow: 'hidden' }}>
          <SparkleButton>
            {pending ? (
              'Sending…'
            ) : (
              <>
                Send Move
                <FontAwesomeIcon icon={faChevronRight} style={{ fontSize:'0.9rem',marginLeft: '10px' }} />
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
        <FontAwesomeIcon icon={faChevronLeft} style={{ fontSize:'0.9rem',marginRight: '10px' }} />
        {backButtonLabel}
      </NeonButton>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        {renderActionButton()}
      </div>
    </div>
  )
}
