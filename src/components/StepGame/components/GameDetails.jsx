import NeonButton from '../../buttons/NeonButton.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCirclePlay, faHourglassStart, faChevronLeft } from '@fortawesome/free-solid-svg-icons'
import GamblingInfoIcon from '../../common/GamblingInfoIcon.jsx'

export default function GameDetails({
  game,
  description,
  opponentName,
  formattedAgo,
  isMyTurn,
  onBack,
}) {
  if (!game) return null

  const prizePool =
    game.bet > 0 ? `${game.bet * 2} ${game.asset}` : 'none'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: '12px',
        textAlign: 'center',
        opacity: 0.9,
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: '20px' }}>
          {game.id}: {game.name}
        </h2>
        <center>
          <table
            style={{
              textAlign: 'left',
              tableLayout: 'auto',
              borderCollapse: 'collapse',
            }}
          >
            <tbody>
              <tr>
                <td style={{ paddingRight: '10px' }}>
                  <strong>Opponent:</strong>
                </td>
                <td>{opponentName || ''}</td>
              </tr>
              <tr>
                <td style={{ paddingRight: '10px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <strong>Prize Pool:</strong>
                    <GamblingInfoIcon size={14} style={{ marginLeft: 0 }} />
                  </span>
                </td>
                <td>{prizePool}</td>
              </tr>
              <tr>
                <td style={{ paddingRight: '10px' }}>
                  <strong>Turn:</strong>
                </td>
                <td>
                  {isMyTurn ? (
                    <>
                      <FontAwesomeIcon icon={faCirclePlay} style={{ marginRight: '10px' }} />
                      <strong>your turn</strong>
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faHourglassStart} style={{ marginRight: '10px' }} />
                      {opponentName || ''}
                    </>
                  )}
                </td>
              </tr>
              <tr>
                <td style={{ paddingRight: '10px' }}>
                  <strong>Last move:</strong>
                </td>
                <td>{formattedAgo || ''} ago</td>
              </tr>
            </tbody>
          </table>
        </center>
        <div
          style={{
            marginTop: '15px',
            fontSize: '0.9rem',
            opacity: 0.8,
            textAlign: 'justify',
          }}
        >
          {description}
        </div>
      </div>

      <NeonButton onClick={onBack} style={{ minWidth: '50%' }}>
        <FontAwesomeIcon icon={faChevronLeft} style={{ marginRight: '10px' }} />
        Game List
      </NeonButton>
    </div>
  )
}
