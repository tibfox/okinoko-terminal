import { useMemo } from 'preact/hooks'
import { useQuery, useSubscription } from '@urql/preact'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCirclePlay,
  faHourglassStart,
  faFlag
} from '@fortawesome/free-solid-svg-icons'
import {
  GAME_MOVES_QUERY,
  GAME_MOVE_SUBSCRIPTION,
} from '../../../data/inarow_gql.js'
import { getBoardDimensions } from '../utils/boardDimensions.js'
import { CyberContainer } from '../../common/CyberContainer.jsx'
import { formatUTC } from '../../../lib/friendlyDates.js'
import NeonButton from '../../buttons/NeonButton.jsx'

/* ---------------- GameDetails ---------------- */

export default function GameDetails({
  game,
  opponentName,
  formattedAgo,
  isMyTurn,
  nextTurnPlayer,
  swapInfo,
  onResign,
  onTimeout,
}) {
  if (!game) return null

  const prizePool =
    game.bet > 0 ? `${game.bet * 2} ${game.asset}` : 'none'
  const hasOpponent = Boolean(game?.playerX && game?.playerY)
  const daysAgo = Math.floor(Number(game?.lastMoveMinutesAgo ?? 0) / (24 * 60))

  const handleResignClick = () => {
    if (!onResign) return
    const confirmResign = window.confirm(
      'Are you sure you want to resign from this game? This action cannot be undone.'
    )
    if (!confirmResign) return
    onResign({
      __gameId: game?.id ?? null,
      __gameAction: 'g_resign',
      __gameCell: undefined,
    })
  }

  const handleTimeoutClick = () => {
    if (!onTimeout) return
    const confirmTimeout = window.confirm(
      'Are you sure you want to timeout your opponent? This action cannot be undone.'
    )
    if (!confirmTimeout) return
    onTimeout({
      __gameId: game?.id ?? null,
      __gameAction: 'g_timeout',
      __gameCell: undefined,
    })
  }

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
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <table
            style={{
              textAlign: 'center',
              margin: '0 auto',
              tableLayout: 'auto',
              borderCollapse: 'collapse',
              width: 'auto',
            }}
          >
            <tbody>
              {prizePool !== 'none' && (
                <tr>
                  <td style={{ padding: '6px 10px' }}>
                    <strong>Prize Pool:</strong>
                  </td>
                  <td style={{ padding: '6px 10px' }}>{prizePool}</td>
                </tr>
              )}
            <tr>
              <td style={{ padding: '6px 10px' }}>
                <strong>Turn:</strong>
              </td>
              <td style={{ padding: '6px 10px' }}>
                {isMyTurn ? (
                  <>
                    <FontAwesomeIcon icon={faCirclePlay} style={{ marginRight: '10px' }} />
                    <strong>your turn</strong>
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faHourglassStart} style={{ marginRight: '10px' }} />
                  {nextTurnPlayer ? formatHandle(nextTurnPlayer) : opponentName || ''}
                  </>
                )}
              </td>
            </tr>
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
          <NeonButton onClick={handleResignClick} style={{ minWidth: '120px' }}>
            <FontAwesomeIcon icon={faFlag} style={{ marginRight: '10px' }} />
            Resign
          </NeonButton>
          <NeonButton
            disabled={!hasOpponent || isMyTurn || daysAgo < 7}
            onClick={handleTimeoutClick}
            style={{ minWidth: '120px' }}
          >
            <FontAwesomeIcon icon={faHourglassStart} style={{ marginRight: '10px' }} />
            Claim Timeout
          </NeonButton>
        </div>

        {swapInfo?.active && (
          <div
            style={{
              marginTop: '12px',
              textAlign: 'center',
              maxWidth: '420px',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            <div style={{ marginBottom: '6px' }}>{swapInfo.waitingText}</div>
            {swapInfo.description && (
              <div style={{ fontSize: '0.9rem', marginBottom: '6px', opacity: 0.85 }}>
                {swapInfo.description}
              </div>
            )}
            {swapInfo.remaining && (
              <div style={{ fontSize: '0.85rem', marginBottom: '4px', color: 'var(--color-primary-lighter)' }}>
                {swapInfo.remaining}
              </div>
            )}
            {swapInfo.nextStone && (
              <div style={{ fontSize: '0.85rem', marginBottom: '6px' }}>
                {swapInfo.nextStone}
              </div>
            )}
            {swapInfo.history?.length > 0 && (
              <div style={{ maxHeight: '90px', overflowY: 'auto' }}>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.85rem', textAlign: 'left' }}>
                  {swapInfo.history.slice(-5).map((entry, idx) => (
                    <li key={`${entry}-${idx}`}>{entry}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Move history */}
        <GameMovesTable game={game} />
      </div>
    </div>
  )
}

/* ---------------- Helpers ---------------- */

const formatHandle = value => (value ? value.replace(/^hive:/, '') : '—')
const colorLabel = (color) => {
  if (Number(color) === 2) return 'O'
  if (Number(color) === 1) return 'X'
  return '?'
}
const toNumericVar = value =>
  value === null || value === undefined ? null : value.toString()



/* ---------------- GameMovesTable ---------------- */

function GameMovesTable({ game }) {
  const dimensions = useMemo(() => getBoardDimensions(game?.type), [game?.type])
  const numericGameId = toNumericVar(game?.id)

  const [{ data, fetching, error }, reexecute] = useQuery({
    query: GAME_MOVES_QUERY,
    variables: numericGameId ? { gameId: numericGameId } : undefined,
    pause: !numericGameId,
    requestPolicy: 'cache-and-network',
  })

  // useSubscription(
  //   {
  //     query: GAME_MOVE_SUBSCRIPTION,
  //     variables: numericGameId ? { gameId: numericGameId } : undefined,
  //     pause: !numericGameId,
  //   },
  //   (_, event) => {
  //     if (event) reexecute({ requestPolicy: 'network-only' })
  //     return event
  //   }
  // )
  // useSubscription(
  //   {
  //     query: GAME_SWAP_SUBSCRIPTION,
  //     variables: numericGameId ? { gameId: numericGameId } : undefined,
  //     pause: !numericGameId,
  //   },
  //   (_, event) => {
  //     if (event) reexecute({ requestPolicy: 'network-only' })
  //     return event
  //   }
  // )

  const moves = data?.moves ?? []
  const swaps = data?.swaps ?? []

  const entries = useMemo(() => {
    const list = []

    moves.forEach((move) => {
      let coords = '—'
      const cellIndex = Number(move.cell)
      if (dimensions && Number.isFinite(cellIndex) && cellIndex >= 0) {
        const row = Math.floor(cellIndex / dimensions.cols)
        const col = cellIndex % dimensions.cols
        coords = `R${row + 1}C${col + 1}`
      }
      let desc = coords
      if ((game?.type || '').toLowerCase() === 'gomoku') {
        const letter =
          move.by && game?.playerX && move.by === game.playerX
            ? '*'
            : move.by && game?.playerY && move.by === game.playerY
              ? '@'
              : ''
        if (letter) {
          desc = `${letter} ${coords}`
        }
      }
      list.push({
        key: `move-${move.id}-${move.indexer_block_height}-${move.cell}`,
        timestamp: move.indexer_ts,
        block: Number(move.indexer_block_height) || 0,
        player: formatHandle(move.by),
        description: desc,
      })
    })

    if ((game?.type || '').toLowerCase() === 'gomoku') {
      swaps.forEach((swap) => {
        const op = (swap.operation || '').toLowerCase()
        const choice = (swap.choice || '').toLowerCase()
        let coords = '—'
        const cellIndex = Number(swap.cell)
        if (dimensions && Number.isFinite(cellIndex) && cellIndex >= 0) {
          const row = Math.floor(cellIndex / dimensions.cols)
          const col = cellIndex % dimensions.cols
          coords = `R${row + 1}C${col + 1}`
        }
        let description = ''
        if (op === 'place' || op === 'add') {
          const stone = colorLabel(swap.color)
          description = `Swap ${stone} ${coords}`
        } else if (op === 'choose') {
          description = `Swap decision: ${choice || '—'}`
        } else if (op === 'color') {
          const stone = colorLabel(swap.color)
          description = `Swap color choice: ${stone}`
        } else {
          description = `Swap ${op || 'event'}`
        }
        list.push({
          key: `swap-${swap.id}-${swap.indexer_block_height}-${op}-${swap.cell ?? 'na'}-${choice || 'none'}`,
          timestamp: swap.indexer_ts,
          block: Number(swap.indexer_block_height) || 0,
          player: formatHandle(swap.by),
          description,
        })
      })
    }

    list.sort((a, b) => {
      if (a.block !== b.block) return b.block - a.block
      const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0
      const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0
      return tb - ta
    })

    return list.map((entry, idx) => ({
      ...entry,
      turn: idx + 1,
    }))
  }, [moves, swaps, dimensions, game?.type])

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
              {/* <th style={{ textAlign: 'left', paddingRight: '12px' }}>#</th> */}
              <th style={{ textAlign: 'left', paddingRight: '12px' }}>Player</th>
              <th style={{ textAlign: 'left', paddingRight: '12px' }}>Move</th>
              <th style={{ textAlign: 'left' }}>Time</th>
            </tr>
          </thead>

          <tbody>
            {entries.map(entry => (
              <tr key={entry.renderKey}>
                {/* <td style={{ paddingRight: '12px' }}>{entry.turn}</td> */}
                <td style={{ paddingRight: '12px' }}>{entry.player}</td>
                <td style={{ textAlign: 'left', paddingRight: '12px' }}>{entry.description}</td>
                <td style={{ textAlign: 'left' }}>
                  {entry.timestamp ? formatUTC(entry.timestamp) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </CyberContainer>
  )
}
