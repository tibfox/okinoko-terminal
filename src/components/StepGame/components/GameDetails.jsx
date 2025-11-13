import { useMemo, useState, useEffect } from 'preact/hooks'
import { useQuery, useSubscription } from '@urql/preact'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCirclePlay,
  faHourglassStart,
  faChevronDown,
  faChevronUp,
} from '@fortawesome/free-solid-svg-icons'
import {
  GAME_MOVES_QUERY,
  GAME_MOVE_SUBSCRIPTION,
} from '../../../data/inarow_gql.js'
import { getBoardDimensions } from '../utils/boardDimensions.js'
import { getCookie, setCookie } from '../../../lib/cookies.js'
import { CyberContainer } from '../../common/CyberContainer.jsx'

/* ---------------- GameDetails ---------------- */

export default function GameDetails({
  game,
  opponentName,
  formattedAgo,
  isMyTurn,
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
        <h2 className="cyber-tile" style={{ marginBottom: '20px', display: 'inline-block' }}>
          {game.id}: {game.name}
        </h2>

        {/* Game metadata */}
        <center>
          <table
            style={{
              textAlign: 'left',
              tableLayout: 'auto',
              borderCollapse: 'collapse',
            }}
          >
            <tbody>
            {prizePool != 'none'&& (
  <>
    <tr>
      <td style={{ paddingRight: '10px' }}>
        <strong>Prize Pool:</strong>
      </td>
      <td>{prizePool}</td>
    </tr>
   
  </>
)}
           <tr>     <td style={{ paddingRight: '10px' }}>
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
            </tbody>
          </table>
        </center>

        {/* Move history */}
        <GameMovesTable game={game} formattedAgo={formattedAgo} />
      </div>
    </div>
  )
}

/* ---------------- Helpers ---------------- */

const formatHandle = value => (value ? value.replace(/^hive:/, '') : '—')
const toNumericVar = value =>
  value === null || value === undefined ? null : value.toString()

const formatUtcTimestamp = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const pad = num => String(num).padStart(2, '0')
  return (
    `${date.getUTCFullYear()}-` +
    `${pad(date.getUTCMonth() + 1)}-` +
    `${pad(date.getUTCDate())} ` +
    `${pad(date.getUTCHours())}:` +
    `${pad(date.getUTCMinutes())}:` +
    `${pad(date.getUTCSeconds())}`
  )
}

/* ---------------- GameMovesTable ---------------- */

function GameMovesTable({ game, formattedAgo }) {
  const dimensions = useMemo(() => getBoardDimensions(game?.type), [game?.type])
  const numericGameId = toNumericVar(game?.id)

  const [{ data, fetching, error }, reexecute] = useQuery({
    query: GAME_MOVES_QUERY,
    variables: numericGameId ? { gameId: numericGameId } : undefined,
    pause: !numericGameId,
    requestPolicy: 'cache-and-network',
  })

  useSubscription(
    {
      query: GAME_MOVE_SUBSCRIPTION,
      variables: numericGameId ? { gameId: numericGameId } : undefined,
      pause: !numericGameId,
    },
    (_, event) => {
      if (event) reexecute({ requestPolicy: 'network-only' })
      return event
    }
  )

  const moves = data?.moves ?? []

  const entries = useMemo(() => {
    return moves
      .map((move, idx) => {
        const cellIndex = Number(move.cell)
        let coords = '—'
        if (dimensions && Number.isFinite(cellIndex) && cellIndex >= 0) {
          const row = Math.floor(cellIndex / dimensions.cols)
          const col = cellIndex % dimensions.cols
          coords = `R${row + 1}C${col + 1}`
        }
        const timestamp = move.indexer_ts
          ? formatUtcTimestamp(move.indexer_ts)
          : '—'
        const rawId = Number(move.id)

        return {
          id: `${move.id ?? idx}-${idx}`,
          rawId: Number.isFinite(rawId) ? rawId : idx,
          turn: idx + 1,
          player: formatHandle(move.by),
          coords,
          timestamp,
        }
      })
      .sort((a, b) => b.rawId - a.rawId)
  }, [moves, dimensions])

  return (
    <CyberContainer title={`History (${entries.length} moves)`}>
      {fetching && <div style={{marginTop: '12px', opacity: 0.8 }}>Loading moves…</div>}

      {error && !fetching && (
        <div style={{marginTop: '12px', color: 'var(--color-error, #ff5c8d)' }}>
          Unable to load moves.
        </div>
      )}

      {!fetching && !error && entries.length === 0 && (
        <div style={{ marginTop: '12px',opacity: 0.8 }}>No moves yet.</div>
      )}

      {!fetching && !error && entries.length > 0 && (
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginTop: '12px',
            fontSize: '0.85rem',
          }}
        >
          <thead>
            <tr>
              <th style={{ textAlign: 'left', paddingRight: '12px' }}>#</th>
              <th style={{ textAlign: 'left', paddingRight: '12px' }}>Player</th>
              <th style={{ textAlign: 'left', paddingRight: '12px' }}>Move</th>
              <th style={{ textAlign: 'left' }}>Timestamp (UTC)</th>
            </tr>
          </thead>

          <tbody>
            {entries.map(entry => (
              <tr key={entry.id}>
                <td style={{ paddingRight: '12px' }}>{entry.turn}</td>
                <td style={{ paddingRight: '12px' }}>{entry.player}</td>
                <td style={{ textAlign: 'left', paddingRight: '12px' }}>{entry.coords}</td>
                <td style={{ textAlign: 'left' }}>{entry.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </CyberContainer>
  )
}
