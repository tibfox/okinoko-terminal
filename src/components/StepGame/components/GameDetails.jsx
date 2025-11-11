import { useMemo, useState, useEffect, useCallback } from 'preact/hooks'
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

const MOVE_HISTORY_COLLAPSE_COOKIE = 'gameMoveHistoryCollapsed'

export default function GameDetails({
  game,
  opponentName,
  formattedAgo,
  isMyTurn,
}) {
  if (!game) return null

  const prizePool =
    game.bet > 0 ? `${game.bet * 2} ${game.asset}` : 'none'

  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false)

  useEffect(() => {
    try {
      const cookieValue = getCookie(MOVE_HISTORY_COLLAPSE_COOKIE)
      if (cookieValue === '1') setIsHistoryCollapsed(true)
      if (cookieValue === '0') setIsHistoryCollapsed(false)
    } catch {}
  }, [])

  useEffect(() => {
    try {
      setCookie(MOVE_HISTORY_COLLAPSE_COOKIE, isHistoryCollapsed ? '1' : '0', 365)
    } catch {}
  }, [isHistoryCollapsed])

  const toggleHistory = useCallback(() => {
    setIsHistoryCollapsed(prev => !prev)
  }, [])

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
        <h2 className="cyber-tile" style={{ margin: '20px', display: 'inline-block' }}>
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
                  <strong>Prize Pool:</strong>
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
            </tbody>
          </table>
        </center>
        <GameMovesTable
          game={game}
          isCollapsed={isHistoryCollapsed}
          onToggle={toggleHistory}
          formattedAgo={formattedAgo}
        />
      </div>
    </div>
  )
}

const formatHandle = value => (value ? value.replace(/^hive:/, '') : '—')
const toNumericVar = value =>
  value === null || value === undefined ? null : value.toString()
const formatUtcTimestamp = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const pad = num => String(num).padStart(2, '0')
  const year = date.getUTCFullYear()
  const month = pad(date.getUTCMonth() + 1)
  const day = pad(date.getUTCDate())
  const hours = pad(date.getUTCHours())
  const minutes = pad(date.getUTCMinutes())
  const seconds = pad(date.getUTCSeconds())
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

function GameMovesTable({ game, isCollapsed, onToggle, formattedAgo }) {
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
      pause: !numericGameId,
      variables: numericGameId ? { gameId: numericGameId } : undefined,
    },
    (_, event) => {
      if (event && reexecute) {
        reexecute({ requestPolicy: 'network-only' })
      }
      return event
    },
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
      .sort((a, b) => {
        return b.rawId - a.rawId
      })
  }, [moves, dimensions])

  const collapseIcon = isCollapsed ? faChevronDown : faChevronUp

  return (
    <div style={{ marginTop: '24px', textAlign: 'left' }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          border: '1px solid var(--color-primary-darkest)',
          borderRadius: 0,
          background: 'rgba(0, 0, 0, 0.35)',
          color: 'var(--color-primary-lightest)',
          cursor: 'pointer',
          textTransform: 'uppercase',
          fontWeight: 600,
          letterSpacing: '0.05em',
        }}
        aria-expanded={!isCollapsed}
        className="cyber-tile"
      >
        <span>Move History</span>
        <FontAwesomeIcon icon={collapseIcon} />
      </button>
      {!isCollapsed && (
        <div
          style={{
            border: '1px solid var(--color-primary-darkest)',
            borderRadius: 0,
            padding: '10px',
            marginTop: '10px',
            maxHeight: '300px',
            overflowY: 'auto',
            width: 'min(640px, 100%)',
            background: 'rgba(0, 0, 0, 0.25)',
          }}
        >
          {formattedAgo && (
            <div style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '8px' }}>
              Last move: {formattedAgo} ago
            </div>
          )}
          {fetching && <div style={{ opacity: 0.8 }}>Loading moves…</div>}
          {error && !fetching && (
            <div style={{ color: 'var(--color-error, #ff5c8d)' }}>
              Unable to load moves.
            </div>
          )}
          {!fetching && !error && entries.length === 0 && (
            <div style={{ opacity: 0.8 }}>No moves yet.</div>
          )}
          {!fetching && !error && entries.length > 0 && (
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.85rem',
              }}
            >
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', paddingBottom: '6px' }}>#</th>
                  <th style={{ textAlign: 'left', paddingBottom: '6px' }}>Player</th>
                  <th style={{ textAlign: 'right', paddingBottom: '6px' }}>Move</th>
                  <th style={{ textAlign: 'right', paddingBottom: '6px' }}>Timestamp (UTC)</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(entry => (
                  <tr key={entry.id}>
                    <td style={{ padding: '4px 0' }}>{entry.turn}</td>
                    <td style={{ padding: '4px 0' }}>{entry.player}</td>
                    <td style={{ padding: '4px 0', textAlign: 'right' }}>{entry.coords}</td>
                    <td style={{ padding: '4px 0', textAlign: 'right' }}>{entry.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
