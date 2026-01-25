import { useMemo, useEffect, useState } from 'preact/hooks'
import { useQuery } from '@urql/preact'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCirclePlay,
  faHourglassStart,
  faFlag
} from '@fortawesome/free-solid-svg-icons'
import {
  GAME_MOVES_QUERY,
} from '../../../data/inarow_gql.js'
import { getBoardDimensions } from '../utils/boardDimensions.js'
import { CyberContainer } from '../../common/CyberContainer.jsx'
import { formatUTC } from '../../../lib/friendlyDates.js'
import NeonButton from '../../buttons/NeonButton.jsx'
import CopyUrlButton from '../../common/CopyUrlButton.jsx'
import { useGameSubscription } from '../providers/GameSubscriptionProvider.jsx'
import InfoIcon from '../../common/InfoIcon.jsx'
import { DEEP_LINK_TYPES } from '../../../hooks/useDeepLink.js'

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
  const [latestMoveTimestamp, setLatestMoveTimestamp] = useState(null)

  if (!game) return null

  const prizePool =
    game.bet > 0 ? `${game.bet * 2} ${game.asset}` : 'none'
  const hasOpponent = Boolean(game?.playerX && game?.playerY)

  // Calculate daysAgo from timestamp (use latest from moves query if available)
  let daysAgo = 0
  const timestampToUse = latestMoveTimestamp || game?.lastMoveTimestamp
  if (timestampToUse) {
    const lastMoveDate = new Date(timestampToUse)
    const now = new Date()
    const diffMinutes = Math.floor((now - lastMoveDate) / (1000 * 60))
    daysAgo = Math.floor(diffMinutes / (24 * 60))
  } else {
    daysAgo = Math.floor(Number(game?.lastMoveMinutesAgo ?? 0) / (24 * 60))
  }
  const isGomokuVariant = (game?.type || '').toLowerCase().includes('gomoku')
  const swapPhaseRaw = (game?.moveType || game?.state || '').toString().toLowerCase().trim()
  const swapPhaseLabel = (() => {
    switch (swapPhaseRaw) {
      case 's_1':
      case 'swap':
      case 'swap1':
        return 'Swap Opening: place 3 stones'
      case 's_2':
      case 'swap2':
        return 'Swap Decision: stay / swap / place two more'
      case 's_3':
      case 'swap3':
        return 'Swap Final Choice'
      default:
        return null
    }
  })()

  const handleResignClick = () => {
    if (!onResign) return
    const confirmMessage = hasOpponent
      ? 'Are you sure you want to resign from this game? This action cannot be undone.'
      : 'Are you sure you want to cancel this game? This action cannot be undone.'
    const confirmResign = window.confirm(confirmMessage)
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
      className="neon-scroll"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: '12px',
        textAlign: 'center',
        opacity: 0.9,
        overflowY: 'auto',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h2 className="cyber-tile" style={{ marginBottom: '8px', display: 'inline-block' }}>
          {game.name || `Game #${game.id}`}
        </h2>

        {opponentName && (
          <div style={{
            fontSize: 'var(--font-size-base)',
            color: 'var(--color-primary-lighter)',
            marginBottom: '12px',
            opacity: 0.85
          }}>
            vs {opponentName}
          </div>
        )}

        {/* Win/Loss Conditions */}
        <WinConditions gameType={game.type} />

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
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <NeonButton
            onClick={handleResignClick}
            title={hasOpponent
              ? 'Resigning will forfeit the game and award the win to your opponent.'
              : 'Canceling will remove this game from the lobby.'}
            style={{ marginTop: 0 }}
          >
            <FontAwesomeIcon icon={faFlag} style={{ fontSize:'0.9rem', marginRight: '6px' }} />
            {hasOpponent ? 'Resign' : 'Cancel'}
          </NeonButton>
          {hasOpponent && (
            <NeonButton
              disabled={isMyTurn || daysAgo < 7}
              onClick={handleTimeoutClick}
              title="Claim timeout victory if opponent hasn't moved in 7 days"
              style={{ marginTop: 0 }}
            >
              <FontAwesomeIcon icon={faHourglassStart} style={{ fontSize:'0.9rem', marginRight: '6px' }} />
              Timeout
            </NeonButton>
          )}
          <CopyUrlButton
            type={DEEP_LINK_TYPES.GAME}
            id={game.id}
            iconOnly
            style={{ marginTop: 0 }}
          />
        </div>

        {isGomokuVariant && swapPhaseLabel && (
          <div style={{ marginTop: '10px', textAlign: 'center', color: 'var(--color-primary-lighter)' }}>
            <strong>Swap Phase:</strong> {swapPhaseLabel}
          </div>
        )}

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
              <div style={{ fontSize: 'var(--font-size-base)', marginBottom: '6px', opacity: 0.85 }}>
                {swapInfo.description}
              </div>
            )}
            {swapInfo.remaining && (
              <div style={{ fontSize: 'var(--font-size-base)', marginBottom: '4px', color: 'var(--color-primary-lighter)' }}>
                {swapInfo.remaining}
              </div>
            )}
            {swapInfo.nextStone && (
              <div style={{ fontSize: 'var(--font-size-base)', marginBottom: '6px' }}>
                {swapInfo.nextStone}
              </div>
            )}
            {swapInfo.actions && (
              <div
                style={{
                  marginTop: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  alignItems: 'center',
                }}
              >
                <NeonButton
                  disabled={swapInfo.actions.disabled}
                  onClick={swapInfo.actions.onStay}
                  style={{ width: '100%', maxWidth: '260px' }}
                >
                  Stay
                </NeonButton>
                <NeonButton
                  disabled={swapInfo.actions.disabled}
                  onClick={swapInfo.actions.onSwap}
                  style={{ width: '100%', maxWidth: '260px' }}
                >
                  Swap Roles
                </NeonButton>
                <NeonButton
                  disabled={swapInfo.actions.disabled}
                  onClick={swapInfo.actions.onAdd}
                  style={{ width: '100%', maxWidth: '260px' }}
                >
                  Place Two More
                </NeonButton>
              </div>
            )}
            {swapInfo.history?.length > 0 && (
              <div className="neon-scroll" style={{ maxHeight: '90px', overflowY: 'auto' }}>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: 'var(--font-size-base)', textAlign: 'left' }}>
                  {swapInfo.history.slice(-5).map((entry, idx) => (
                    <li key={`${entry}-${idx}`}>{entry}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Move history */}
        <GameMovesTable game={game} onLatestMoveTimestamp={setLatestMoveTimestamp} />
      </div>
    </div>
  )
}

/* ---------------- WinConditions ---------------- */

function WinConditions({ gameType }) {
  if (!gameType) return null

  const normalized = String(gameType).trim().toLowerCase()

  let winText = ''
  let loseText = ''

  if (normalized.includes('freestyle')) {
    winText = '5 or more in a row'
    loseText = 'Opponent gets 5 or more in a row'
  } else if (normalized.includes('gomoku')) {
    winText = 'Exactly 5 in a row (not more)'
    loseText = 'Opponent gets exactly 5 in a row'
  } else if (normalized === 'tictactoe') {
    winText = '3 in a row'
    loseText = 'Opponent gets 3 in a row'
  } else if (normalized === 'squava') {
    winText = '4 in a row'
    loseText = 'You get 3 in a row OR opponent gets 4 in a row'
  } else if (normalized === 'tictactoe5') {
    winText = '4 in a row'
    loseText = 'Opponent gets 4 in a row'
  } else if (normalized === 'connect4') {
    winText = '4 in a row'
    loseText = 'Opponent gets 4 in a row'
  } else {
    return null
  }

  return (
    <div style={{
      fontSize: 'var(--font-size-base)',
      marginBottom: '16px',
      padding: '8px 12px',
      borderRadius: '4px',
      background: 'rgba(0, 0, 0, 0.3)',
      border: '1px solid var(--color-primary-darker, #004d5a)',
      maxWidth: '400px',
      margin: '0 auto 16px auto',
    }}>
      <div style={{ marginBottom: '4px' }}>
        <span style={{ color: 'var(--color-primary-lighter, #9be8ff)', fontWeight: '600' }}>Win:</span>{' '}
        <span style={{ opacity: 0.9 }}>{winText}</span>
      </div>
      <div>
        <span style={{ color: 'var(--color-primary-lighter, #9be8ff)', fontWeight: '600' }}>Lose:</span>{' '}
        <span style={{ opacity: 0.9 }}>{loseText}</span>
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

function GameMovesTable({ game, onLatestMoveTimestamp }) {
  const dimensions = useMemo(() => getBoardDimensions(game?.type), [game?.type])
  const numericGameId = toNumericVar(game?.id)
  const { updateCounter } = useGameSubscription()

  const [{ data, fetching, error }, reexecute] = useQuery({
    query: GAME_MOVES_QUERY,
    variables: numericGameId ? { gameId: numericGameId } : undefined,
    pause: !numericGameId,
    requestPolicy: 'cache-and-network',
  })

  // Re-execute query when subscription updates
  useEffect(() => {
    if (updateCounter > 0 && reexecute) {
      reexecute({ requestPolicy: 'network-only' })
    }
  }, [updateCounter, reexecute])

  const moves = data?.moves ?? []
  const swaps = data?.swaps ?? []

  // Extract and pass the latest move or join timestamp to parent
  useEffect(() => {
    if (onLatestMoveTimestamp) {
      if (moves.length > 0) {
        // Moves are ordered by block height ascending, so last one is most recent
        const latestMove = moves[moves.length - 1]
        if (latestMove?.indexer_ts) {
          onLatestMoveTimestamp(latestMove.indexer_ts)
        }
      } else if (data?.joins?.length > 0 && data.joins[0]?.indexer_ts) {
        // If no moves but game was joined, use the join timestamp
        onLatestMoveTimestamp(data.joins[0].indexer_ts)
      }
    }
  }, [moves, data?.joins, onLatestMoveTimestamp])

  const entries = useMemo(() => {
    const list = []

    moves.forEach((move) => {
      let coords = '—'
      const cellIndex = Number(move.cell)
      if (dimensions && Number.isFinite(cellIndex) && cellIndex >= 0) {
        const row = Math.floor(cellIndex / dimensions.cols)
        const col = cellIndex % dimensions.cols
        coords = `R${row }C${col }`
      }
      let desc = coords
      const isGomokuVariant = (game?.type || '').toLowerCase().includes('gomoku')
      if (isGomokuVariant) {
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

    const isGomokuVariant = (game?.type || '').toLowerCase().includes('gomoku')
    if (isGomokuVariant) {
      swaps.forEach((swap) => {
        const op = (swap.operation || '').toLowerCase()
        const choice = (swap.choice || '').toLowerCase()
        let coords = '—'
        const cellIndex = Number(swap.cell)
        if (dimensions && Number.isFinite(cellIndex) && cellIndex >= 0) {
          const row = Math.floor(cellIndex / dimensions.cols)
          const col = cellIndex % dimensions.cols
          coords = `R${row}C${col}`
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
        <div class="game-selection-table" style={{ marginTop: '12px' }}>
          <div class="game-table-wrapper">
            <table style={{ width: '100%', tableLayout: 'auto' }}>
              <thead>
                <tr>
                  {/* <th style={{ textAlign: 'left', padding: '4px 6px' }}>#</th> */}
                  <th style={{ textAlign: 'left', padding: '4px 6px' }}>Player</th>
                  <th style={{ textAlign: 'left', padding: '4px 6px' }}>Move</th>
                  <th style={{ textAlign: 'left', padding: '4px 6px' }}>Time</th>
                </tr>
              </thead>

              <tbody>
                {entries.map(entry => (
                  <tr key={entry.renderKey}>
                    {/* <td style={{ padding: '4px 6px' }}>{entry.turn}</td> */}
                    <td style={{ padding: '4px 6px' }}>{entry.player}</td>
                    <td style={{ textAlign: 'left', padding: '4px 6px' }}>{entry.description}</td>
                    <td style={{ textAlign: 'left', padding: '4px 6px' }}>
                      {entry.timestamp ? formatUTC(entry.timestamp) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </CyberContainer>
  )
}
