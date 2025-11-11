import NeonButton from '../../buttons/NeonButton.jsx'
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
}) {
  const renderActionButton = () => {
    if (!displayMode) {
      return <span />
    }

    if (displayMode === 'g_create') {
      return (
        <NeonButton onClick={onCreate} disabled={!isSendEnabled}>
          {pending ? (
            'Creating...'
          ) : (
            <>
              Create Game
              <FontAwesomeIcon icon={faChevronRight} style={{ marginLeft: '10px' }} />
            </>
          )}
        </NeonButton>
      )
    }

    if (displayMode === 'g_join') {
      return (
        <NeonButton onClick={onJoin} disabled={!isSendEnabled}>
          {pending ? (
            'Joining...'
          ) : (
            <>
              Join Game
              <FontAwesomeIcon icon={faChevronRight} style={{ marginLeft: '10px' }} />
            </>
          )}
        </NeonButton>
      )
    }

    return (
      <NeonButton onClick={onMove} disabled={!isSendEnabled}>
        {pending ? (
          'Sending…'
        ) : (
          <>
            Send Move
            <FontAwesomeIcon icon={faChevronRight} style={{ marginLeft: '10px' }} />
          </>
        )}
      </NeonButton>
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
      {renderActionButton()}
    </div>
  )
}
