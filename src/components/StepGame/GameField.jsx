// GameField.jsx
import { textStyles } from '@chakra-ui/react/theme'
import { useMemo, useState, useEffect, useRef, useCallback } from 'preact/hooks'
import { useQuery, useSubscription } from '@urql/preact'
import NeonButton from '../buttons/NeonButton.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHourglassStart, faFlag } from '@fortawesome/free-solid-svg-icons';
import { GAME_MOVES_QUERY, GAME_EVENTS_SUBSCRIPTION, GAME_MOVE_SUBSCRIPTION, PLAYER_LEADERBOARD_QUERY, PLAYER_LEADERBOARD_SEASON_QUERY } from '../../data/inarow_gql.js'
import { GAME_TYPE_OPTIONS } from './gameTypes.js'
const toNumericVar = (value) =>
  value === null || value === undefined ? null : value.toString()
const hasFmp = (value) => {
  if (value === null || value === undefined) return false
  const num = Number(value)
  if (!Number.isNaN(num)) {
    return num > 0
  }
  return false
}
export default function GameField({ game, user, onSelectionChange, setParams, handleResign, handleTimeout, isMobile, onStateChange, defaultGameTypeId }) {
  const size = useMemo(() => {
    if (!game) return null
    if (game.type === "TicTacToe") return { rows: 3, cols: 3 }
    if (game.type === "TicTacToe5" || game.type === "Squava") return { rows: 5, cols: 5 }
    if (game.type === "Connect4") return { rows: 6, cols: 7 }
    if (game.type === "Gomoku") return { rows: 15, cols: 15 }
    return null
  }, [game?.type])
  const allowMultiple = game?.state === 'swap'
  const [selected, setSelected] = useState([])
  const [fallingFrame, setFallingFrame] = useState(null) // { r, c } for C4 animation
  const [boardState, setBoardState] = useState(null)
  const [resolvedRoles, setResolvedRoles] = useState({ playerX: null, playerY: null })
  const [resolvedNextPlayer, setResolvedNextPlayer] = useState(null)
  const [resultBanner, setResultBanner] = useState(null)
  const fallingTimerRef = useRef(null)
  const FRAME_MS = 100
  const SOFT_GLOW_PRIMARY = '0 0 18px var(--color-primary), inset 0 0 12px var(--color-primary)'
  const ULTRA_GLOW = '0 0 50px var(--color-primary), 0 0 30px var(--color-primary), inset 0 0 25px var(--color-primary), inset 0 0 15px var(--color-primary)'
  const numericGameId = game?.id != null ? toNumericVar(game.id) : null
  const totalCells = size ? size.rows * size.cols : 0
  const defaultBoard = size ? '0'.repeat(totalCells) : ''
  const [gameDetails, reexecuteGameDetails] = useQuery({
    query: GAME_MOVES_QUERY,
    pause: !numericGameId,
    variables: numericGameId ? { gameId: numericGameId } : undefined,
    requestPolicy: 'network-only',
  })
  const fullUser = user ? (user.startsWith('hive:') ? user : `hive:${user}`) : null
  const applyTerminalEvent = useCallback((entry) => {
    if (!entry || !fullUser) return
    const formatHandle = (value) => (value ? value.replace(/^hive:/, '') : 'Unknown player')
    const updateBanner = (text, tone) => setResultBanner({ text, tone })

    switch (entry.event_type) {
      case 'won': {
        if (!entry.winner) return
        const isMe = entry.winner === fullUser
        updateBanner(
          isMe ? 'You won the game!' : `${formatHandle(entry.winner)} won the game.`,
          isMe ? 'positive' : 'negative'
        )
        break
      }
      case 'resign': {
        if (!entry.resigner) return
        const isMe = entry.resigner === fullUser
        updateBanner(
          isMe ? 'You resigned from this game.' : `${formatHandle(entry.resigner)} resigned. You win!`,
          isMe ? 'negative' : 'positive'
        )
        break
      }
      case 'timeout': {
        if (!entry.timedout) return
        const isMe = entry.timedout === fullUser
        updateBanner(
          isMe ? 'You lost on timeout.' : `${formatHandle(entry.timedout)} timed out. You win!`,
          isMe ? 'negative' : 'positive'
        )
        break
      }
      case 'draw': {
        updateBanner('Game ended in a draw.', 'neutral')
        break
      }
      default:
        break
    }
  }, [fullUser])

  useSubscription(
    {
      query: GAME_EVENTS_SUBSCRIPTION,
      pause: !numericGameId,
      variables: numericGameId ? { gameId: numericGameId } : undefined,
    },
    (_, event) => {
      if (event && reexecuteGameDetails) {
        reexecuteGameDetails({ requestPolicy: 'network-only' })
      }
      const rows = event?.okinoko_iarv2_all_events ?? []
      rows.forEach(applyTerminalEvent)
      return event
    },
  )
  useSubscription(
    {
      query: GAME_MOVE_SUBSCRIPTION,
      pause: !numericGameId,
      variables: numericGameId ? { gameId: numericGameId } : undefined,
    },
    (_, event) => {
      if (event && reexecuteGameDetails) {
        reexecuteGameDetails({ requestPolicy: 'network-only' })
      }
      return event
    },
  )
  useEffect(() => {
    setBoardState(null)
    setResolvedRoles({ playerX: null, playerY: null })
    setResultBanner(null)
  }, [game?.id])
  useEffect(() => {
    if (!size || !game || !gameDetails.data) {
      return
    }
    const { moves = [], joins = [], swaps = [] } = gameDetails.data
    let computedPlayerX = game.playerX ?? game.creator ?? null
    let computedPlayerY = game.playerY ?? game.opponent ?? null
    const joinInfo = joins[0]
    if (joinInfo?.by) {
      if (hasFmp(joinInfo.fmp)) {
        computedPlayerX = joinInfo.by
        computedPlayerY = game.creator ?? computedPlayerY
      } else if (!computedPlayerY) {
        computedPlayerY = joinInfo.by
      }
    }
    if (game.type === 'Gomoku') {
      swaps.forEach((swap) => {
        const choice = (swap.choice || '').toLowerCase()
        const operation = (swap.operation || '').toLowerCase()
        if (choice === 'color' || operation === 'swap') {
          const tmp = computedPlayerX
          computedPlayerX = computedPlayerY
          computedPlayerY = tmp
        }
      })
    }
    const boardArr = Array(size.rows * size.cols).fill('0')
    let moveIndex = 0
    let lastMoveBy = null
    moves.forEach((move) => {
      const idx = Number(move.cell)
      if (!Number.isFinite(idx) || idx < 0 || idx >= boardArr.length) {
        return
      }
      let value = '0'
      if (computedPlayerX && move.by === computedPlayerX) value = '1'
      else if (computedPlayerY && move.by === computedPlayerY) value = '2'
      else value = moveIndex % 2 === 0 ? '1' : '2'
      boardArr[idx] = value
      moveIndex++
      lastMoveBy = move.by
    })
    setBoardState(boardArr.join(''))
    setResolvedRoles({ playerX: computedPlayerX, playerY: computedPlayerY })
    if (computedPlayerX && computedPlayerY) {
      if (moves.length === 0) {
        setResolvedNextPlayer(computedPlayerX)
      } else {
        setResolvedNextPlayer(lastMoveBy === computedPlayerX ? computedPlayerY : computedPlayerX)
      }
    } else {
      setResolvedNextPlayer(null)
    }
  }, [gameDetails.data, size, game])
  const persistedBoard = typeof game?.board === 'string' ? game.board : ''
  const board = boardState ?? (persistedBoard.length === totalCells ? persistedBoard : defaultBoard)
  const playerX = resolvedRoles.playerX ?? game?.playerX
  const playerY = resolvedRoles.playerY ?? game?.playerY
  const hasOpponent = Boolean(playerX && playerY)
  const isMyTurn =
    hasOpponent &&
    fullUser &&
    resolvedNextPlayer &&
    fullUser === resolvedNextPlayer
  useEffect(() => {
    if (onStateChange) {
      onStateChange({ playerX, playerY, hasOpponent, isMyTurn, nextPlayer: resolvedNextPlayer })
    }
  }, [playerX, playerY, hasOpponent, isMyTurn, resolvedNextPlayer, onStateChange])
  let opponentName = ""
  if (game != null && fullUser != null) {
    opponentName = fullUser === playerX ? playerY : playerX
  }
  const handleResignClick = (cells) => {
    const confirmResign = window.confirm("Are you sure you want to resign from this game? This action cannot be undone.")
    if (!confirmResign) return
    setSelected(cells)
    onSelectionChange?.(cells)
    handleResign?.({
      __gameId: game?.id ?? null,
      __gameAction: 'g_resign',
      __gameCell: undefined,
    })
  }
  const handleTimeoutClick = (cells) => {
    const confirmTimeout = window.confirm("Are you sure you want to timeout your opponent? This action cannot be undone.")
    if (!confirmTimeout) return
    setSelected(cells)
    onSelectionChange?.(cells)
    handleTimeout?.({
      __gameId: game?.id ?? null,
      __gameAction: 'g_timeout',
      __gameCell: undefined,
    })
  }
  // helper to sync selection and params
  const updateSelection = (cells) => {
    setSelected(cells)
    onSelectionChange?.(cells)
    // Convert to payload format "__gameMove"
    const paramMove = cells.length > 1
      ? cells.map(s => `${s.r},${s.c}`).join(';')
      : cells.length === 1
        ? `${cells[0].r}|${cells[0].c}`
        : ''
    setParams(prev => ({
      ...prev,
      __gameCell: paramMove || undefined   // clear if empty
    }))
  }
  useEffect(() => {
    updateSelection([])
    setFallingFrame(null)
  }, [game?.id, game?.state])
  if (!game || !size) {
    return <EmptyGamePanel defaultGameTypeId={defaultGameTypeId} />
  }
  const isSelected = (r, c) => selected.some(s => s.r === r && s.c === c)
  const findC4LandingRow = (col) => {
    for (let r = size.rows - 1; r >= 0; r--) {
      const idx = r * size.cols + col
      if (board.charAt(idx) === '0') return r
    }
    return null
  }
  const toggleCell = (r, c) => {
    if (!hasOpponent || !isMyTurn) return
    // C4: click only on top row; animate falling frame-by-frame
    if (game.type === 'Connect4') {
      // Cancel current animation if any
      if (fallingTimerRef.current) {
        clearTimeout(fallingTimerRef.current)
        fallingTimerRef.current = null
      }
      setFallingFrame(null)
      setSelected([])
      // Only allow clicks on the top row
      if (r !== 0) return
      const landingRow = findC4LandingRow(c)
      if (landingRow == null) return // column is full
      let step = 0
      const steps = landingRow + 1
      const animate = () => {
        setFallingFrame({ r: step, c })
        step++
        if (step < steps) {
          fallingTimerRef.current = setTimeout(animate, FRAME_MS)
        } else {
          // Final landing
          setFallingFrame(null)
          updateSelection([{ r: landingRow, c }])
          fallingTimerRef.current = null
        }
      }
      animate()
      return
    }
    // Non-C4 behavior (respect G/TTT rules)
    const index = r * size.cols + c
    const cellVal = board.charAt(index)
    if (cellVal !== '0') return
    if (allowMultiple) {
      updateSelection(
        exists
          ? prev.filter(s => !(s.r === r && s.c === c))
          : [...prev, { r, c }]
      )
    } else {
      updateSelection([{ r, c }])
    }
  }
  const stoneFillForG = (val) => {
    if (val !== '1' && val !== '2') return null
    const isPlayerXStone = val === '1'
    const isPlayerYStone = val === '2'
    const isMyStone =
      (fullUser === playerX && isPlayerXStone) ||
      (fullUser === playerY && isPlayerYStone)
    return isMyStone ? 'var(--color-primary)' : 'var(--color-primary-darker)'
  }
  const minsAgo = game.lastMoveMinutesAgo;
  const daysAgo = Math.floor(minsAgo / (24 * 60));
  const hoursAgo = Math.floor((minsAgo % (24 * 60)) / 60);
  const minutesAgo = minsAgo % 60;
  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: '10px',
      boxSizing: 'border-box'
    }}>
      {(() => {
        const banner = resultBanner
          ? resultBanner
          : (!hasOpponent ? { text: 'Waiting for another player to join…' } : null)
        if (!banner) return null
        return (
          <div
            style={{
              textAlign: 'center',
              color: 'var(--color-primary-lighter)',
              marginBottom: '16px',
              fontSize: '1.05rem',
              fontWeight: 600,
              letterSpacing: '0.04em',
              background: 'rgba(0, 0, 0, 0.5)',
              padding: '8px 12px',
              borderRadius: '6px',
              display: 'inline-block',
              alignSelf: 'center',
            }}
          >
            {banner.text}
          </div>
        )
      })()}
      {isMobile ? (
        <center>
          {isMyTurn ?
            <NeonButton
              onClick={() => handleResignClick([])}
              style={{ marginBottom: '10px', minWidth: '65%' }}>
              <FontAwesomeIcon icon={faFlag} style={{marginRight: '10px'}}/>
              Resign
            </NeonButton>
            : <NeonButton
              disabled={!hasOpponent || daysAgo < 7}
              onClick={() => handleTimeoutClick([])}
              style={{ marginBottom: '10px', minWidth: '65%' }}>
                <FontAwesomeIcon icon={faHourglassStart} style={{marginRight: '10px'}}/>
              Claim Timeout
            </NeonButton>
          }</center>
      ) : (<center>
        <div>
          <NeonButton
            disabled={!hasOpponent || !isMyTurn}
            onClick={() => handleResignClick([])}
            style={{ marginBottom: '10px', marginRight: '10px', minWidth: '120px' }}>
            <FontAwesomeIcon icon={faFlag} style={{marginRight: '10px'}} />
            Resign
          </NeonButton>
          <NeonButton
            disabled={!hasOpponent || isMyTurn || daysAgo < 7}
            onClick={() => handleTimeoutClick([])}
            style={{ marginBottom: '10px', minWidth: '120px' }}>
              <FontAwesomeIcon icon={faHourglassStart} style={{marginRight: '10px'}}/>
            Claim Timeout
          </NeonButton>
        </div>
      </center>)}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {(() => {
          const overlayBanner = resultBanner ?? (!hasOpponent ? { text: 'Waiting for another player to join…' } : null)
          if (!overlayBanner) return null
          return (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: 'var(--color-primary-lighter)',
              fontSize: '1.15rem',
              fontWeight: 600,
              textAlign: 'center',
              textShadow: '0 0 12px rgba(0,0,0,0.85)',
              pointerEvents: 'none',
              zIndex: 2,
              background: 'rgba(0, 0, 0, 0.55)',
              padding: '10px 18px',
              borderRadius: '8px',
              maxWidth: '80%',
            }}
          >
            {overlayBanner.text}
          </div>
          )
        })()}
        <div style={{
          height: '100%',
          aspectRatio: `${size.cols} / ${size.rows}`,
          maxWidth: '100%',
          display: 'grid',
          gridTemplateColumns: `repeat(${size.cols}, 1fr)`,
          gridTemplateRows: `repeat(${size.rows}, 1fr)`,
          gap: '4px'
        }}>
          {Array.from({ length: size.rows * size.cols }).map((_, i) => {
            const r = Math.floor(i / size.cols)
            const c = i % size.cols
            const val = board.charAt(i)
            const isUsed = val !== '0'
            const selectedCell = isSelected(r, c)
            const isFalling = fallingFrame && fallingFrame.r === r && fallingFrame.c === c
            // Clickability: for C4 allow only top row; otherwise as before
            const clickable = isMyTurn && !isUsed && (
              game.type !== 'Connect4' ? true : r === 0
            )
            // G-type: filled stones with glow; empty calm; selected empty = ultra
            if (game.type === 'Gomoku') {
              const fillColor = stoneFillForG(val)
              let background = 'transparent'
              let boxShadow = 'none'
              if (val !== '0') {
                background = fillColor
                // boxShadow = fillColor === 'var(--color-primary)' ? ULTRA_GLOW : ULTRA_GLOW_DARK
              } else if (selectedCell) {
                background = 'var(--color-primary)'
                // boxShadow = ULTRA_GLOW
              }
              return (
                <div
                  key={`${r}-${c}`}
                  onClick={() => toggleCell(r, c)}
                  style={{
                    aspectRatio: '1 / 1',
                    border: selectedCell ? '4px solid var(--color-primary-lightest)' :
                      val === '0' && !selectedCell ? '1px solid var(--color-primary-darker)' : 'none',
                    background,
                    boxShadow,
                    display: 'flex',
                    borderRadius: '90px',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 'clamp(0.6rem, 1vw, 1rem)',
                    fontWeight: 'bold',
                    cursor: clickable ? 'pointer' : 'not-allowed',
                    transition: 'box-shadow 120ms ease, background 120ms ease'
                  }}
                />
              )
            }
            // C4: frame-by-frame falling animation (soft glow while falling), selected uses ULTRA on landing
            if (game.type === 'Connect4') {
              const isSelectedLanding = selectedCell
              const owningPlayer = val === '1' ? playerX : val === '2' ? playerY : null
              const isMyStone = owningPlayer && owningPlayer === fullUser
              const bgBase =
                isSelectedLanding
                  ? 'var(--color-primary)'   // final landed cell filled
                  : isUsed
                    ? isMyStone
                      ? 'var(--color-primary)'
                      : 'var(--color-primary-darker)'
                    : 'transparent'   // empty or falling stays transparent-ish
              const shadow =
                isFalling
                  ? SOFT_GLOW_PRIMARY  // animation frame: soft glow only
                  : isSelectedLanding
                    ? SOFT_GLOW_PRIMARY       // final position: ULTRA
                    : 'none'
              return (
                <div
                  key={`${r}-${c}`}
                  onClick={() => toggleCell(r, c)}
                  style={{
                    aspectRatio: '1 / 1',
                    border:
                      '1px solid ' + (clickable ? 'var(--color-primary-darker)' : 'var(--color-primary-darkest)'),
                    background: bgBase,
                    boxShadow: shadow,
                    borderRadius: '90px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isUsed
                      ? isMyStone
                        ? 'var(--color-primary)'
                        : 'var(--color-primary-darker)'
                      : (clickable ? 'var(--color-primary)' : '#555'),
                    fontSize: 'clamp(0.6rem, 1vw, 1rem)',
                    fontWeight: 'bold',
                    cursor: clickable ? 'pointer' : 'not-allowed',
                    transition: 'box-shadow 80ms linear, background 80ms linear'
                  }}
                >
                  {val === '1' ? 'X' : val === '2' ? 'O' : ''}
                </div>
              )
            }
            if (game.type == 'Squava') {
              const myLetter = fullUser === playerX ? 'X' : 'O'
              const cellLetter = val === '1' ? 'X' : val === '2' ? 'O' : selectedCell ? myLetter : ''
              return (
                <div
                  key={`${r}-${c}`}
                  onClick={() => toggleCell(r, c)}
                  style={{
                    aspectRatio: '1 / 1',
                    border: selectedCell && !isUsed ? '5px solid var(--color-primary-lightest)' : '1px solid var(--color-primary-darker)',
                    borderRadius: '90px',
                    background: isUsed
                      ? cellLetter == myLetter ? 'var(--color-primary)' : 'var(--color-primary-darkest)'
                      : selectedCell
                        ? 'var(--color-primary)'
                        : 'transparent',
                    boxShadow: selectedCell && !isUsed
                      ? '0 0 10px var(--color-primary), inset 0 0 8px var(--color-primary)'
                      : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isUsed
                      ? cellLetter == myLetter ? 'var(--color-primary-lighter)' : 'var(--color-primary)'
                      : selectedCell
                        ? 'var(--color-primary-darkest)'
                        : '#555',
                    fontSize: 'clamp(0.6rem, 2.5vw, 2.5rem)',
                    cursor: clickable ? 'pointer' : 'not-allowed',
                    transition: 'box-shadow 120ms ease, background 120ms ease'
                  }}
                >
                </div>
              )
            }
            const myLetter = fullUser === playerX ? 'X' : 'O'
            const cellLetter = val === '1' ? 'X' : val === '2' ? 'O' : selectedCell ? myLetter : ''
            return (
              <div
                key={`${r}-${c}`}
                onClick={() => toggleCell(r, c)}
                style={{
                  aspectRatio: '1 / 1',
                  border: '1px solid var(--color-primary-darker)',
                  background: isUsed
                    ? cellLetter == myLetter ? 'var(--color-primary-darker)' : 'var(--color-primary-darkest)'
                    : selectedCell
                      ? 'var(--color-primary)'
                      : 'transparent',
                  boxShadow: selectedCell && !isUsed
                    ? '0 0 10px var(--color-primary), inset 0 0 8px var(--color-primary)'
                    : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isUsed
                    ? cellLetter == myLetter ? 'var(--color-primary-lighter)' : 'var(--color-primary)'
                    : selectedCell
                      ? 'var(--color-primary-darkest)'
                      : '#555',
                  fontSize: 'clamp(0.6rem, 2.5vw, 2.5rem)',
                  cursor: clickable ? 'pointer' : 'not-allowed',
                  transition: 'box-shadow 120ms ease, background 120ms ease'
                }}
              >
                {game.type === 'TicTacToe' || game.type === 'TicTacToe5' ? cellLetter : ""}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const DEFAULT_LEADERBOARD_GAME_TYPE = GAME_TYPE_OPTIONS[0]?.id ?? 1

const LEADERBOARD_FIELD_MAP = {
  ratio: 'win_ratio',
  wins: 'wins',
  games: 'games_played',
  draws: 'draws',
  losses: 'losses',
  active: 'active_games',
}

function EmptyGamePanel({ defaultGameTypeId }) {
  const [activeTab, setActiveTab] = useState('info')
  const [leaderboardScope, setLeaderboardScope] = useState('all')
  const [sortKey, setSortKey] = useState('ratio')
  const [sortDirection, setSortDirection] = useState('desc')
  const selectedType = defaultGameTypeId ?? DEFAULT_LEADERBOARD_GAME_TYPE

  const orderBy = useMemo(() => {
    const field = LEADERBOARD_FIELD_MAP[sortKey] || 'win_ratio'
    const primaryDirection =
      field === 'win_ratio'
        ? sortDirection === 'asc'
          ? 'asc_nulls_last'
          : 'desc_nulls_last'
        : sortDirection
    const base = [{ [field]: primaryDirection }]
    if (field !== 'win_ratio') {
      base.push({ win_ratio: 'desc_nulls_last' })
    }
    base.push({ wins: 'desc' }, { games_played: 'desc' })
    return base
  }, [sortKey, sortDirection])

  const hasSelectedType = selectedType != null
  const leaderboardQuery =
    leaderboardScope === 'season' ? PLAYER_LEADERBOARD_SEASON_QUERY : PLAYER_LEADERBOARD_QUERY
  const leaderboardPaused = activeTab !== 'leaderboard' || !hasSelectedType
  const [{ data, fetching, error }] = useQuery({
    query: leaderboardQuery,
    variables: hasSelectedType
      ? {
          gameType: selectedType,
          orderBy,
          limit: 25,
        }
      : undefined,
    pause: leaderboardPaused,
    requestPolicy: 'cache-and-network',
  })

  const rows =
    data?.okinoko_iarv2_player_stats_by_type ??
    data?.okinoko_iarv2_player_stats_by_type_current_season ??
    []

  const handleSortChange = (nextKey) => {
    if (!LEADERBOARD_FIELD_MAP[nextKey]) return
    if (sortKey === nextKey) {
      setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortKey(nextKey)
      setSortDirection('desc')
    }
  }

  const columnHeaders = [
    { key: 'player', label: 'Player', sortable: false },
    { key: 'win_ratio', label: 'Win Ratio', sortable: true, sortKey: 'ratio' },
    { key: 'wins', label: 'Wins', sortable: true, sortKey: 'wins' },
    { key: 'games_played', label: 'Joined', sortable: true, sortKey: 'games' },
    { key: 'active_games', label: 'Active', sortable: true, sortKey: 'active' },
    { key: 'draws', label: 'Draws', sortable: true, sortKey: 'draws' },
    { key: 'losses', label: 'Losses', sortable: true, sortKey: 'losses' },
  ]

  const formatRatio = (value) => {
    if (value === null || value === undefined) return '–'
    const num = Number(value)
    if (Number.isNaN(num)) return '–'
    return `${(num * 100).toFixed(1)}%`
  }

  const tabButtonStyle = (active) => ({
    flex: 1,
    padding: '10px 12px',
    background: active ? 'var(--color-primary-darkest)' : 'transparent',
    color: active ? 'var(--color-primary-lightest)' : 'var(--color-primary-lighter)',
    border: '1px solid var(--color-primary-darkest)',
    cursor: 'pointer',
    textTransform: 'uppercase',
    fontSize: '0.85rem',
    letterSpacing: '0.05em',
  })

  const infoTab = (
    <div>
      <h2>Welcome to the Game Arena</h2>
      <p>
        No game selected yet — this is your staging area. From here, you can choose to <b>Create</b> a
        new game, <b>Join</b> a game someone else started, or <b>Continue</b> a game you're already
        part of. Pick an option to get started and dive into a match.
      </p>
      <div style={{ marginTop: '40px' }}>
        <h4>First Move Payment (FMP)</h4>
        <p>
          Some game creators enable a feature called <b>First Move Payment</b>. If it's available, you can
          choose to pay a small extra amount to secure the first turn. Why? Because in many strategy games,
          going first offers a small tactical advantage. If you don't want it, leave it off and join the
          game normally — it's completely optional.
        </p>
      </div>
      <div style={{ marginTop: '40px' }}>
        <h4>Enjoy your gaming!</h4>
      </div>
    </div>
  )

  const leaderboardTab = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {!hasSelectedType && (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-primary-lighter)' }}>
          Choose a game type to see leaderboard stats.
        </div>
      )}

      {hasSelectedType && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px', fontSize: '0.85rem' }}>
            <thead>
              <tr>
                {columnHeaders.map((col) => {
                  const isActiveSort = col.sortable && sortKey === col.sortKey
                  const arrow = isActiveSort ? (sortDirection === 'desc' ? '▼' : '▲') : ''
                  return (
                    <th
                      key={col.key}
                      style={{
                        textAlign: col.key === 'player' ? 'left' : 'right',
                        padding: '8px 10px',
                        cursor: col.sortable ? 'pointer' : 'default',
                        color: isActiveSort ? 'var(--color-primary-lightest)' : 'var(--color-primary-lighter)',
                        borderBottom: '1px solid var(--color-primary-darkest)',
                        whiteSpace: 'nowrap',
                        fontSize: '0.8rem',
                      }}
                      onClick={() => col.sortable && handleSortChange(col.sortKey)}
                    >
                      {col.label} {arrow}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {fetching && (
                <tr>
                  <td colSpan={columnHeaders.length} style={{ padding: '18px', textAlign: 'center' }}>
                    Loading leaderboard…
                  </td>
                </tr>
              )}
              {error && !fetching && (
                <tr>
                  <td
                    colSpan={columnHeaders.length}
                    style={{ padding: '18px', textAlign: 'center', color: 'var(--color-error, #ff5c8d)' }}
                  >
                    Failed to load leaderboard. Please try again.
                  </td>
                </tr>
              )}
              {!fetching && !error && rows.length === 0 && (
                <tr>
                  <td colSpan={columnHeaders.length} style={{ padding: '18px', textAlign: 'center' }}>
                    No stats recorded yet for this game type.
                  </td>
                </tr>
              )}
              {!fetching &&
                !error &&
                rows.map((row) => (
                  <tr key={`${row.player}-${row.type}`}>
                    <td style={{ padding: '8px 10px', textAlign: 'left' }}>{row.player?.replace('hive:', '') ?? '—'}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>{formatRatio(row.win_ratio)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>{Number(row.wins ?? 0)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>{Number(row.games_played ?? 0)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>{Number(row.active_games ?? 0)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>{Number(row.draws ?? 0)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>{Number(row.losses ?? 0)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button type="button" style={tabButtonStyle(activeTab === 'info')} onClick={() => setActiveTab('info')}>
          Game Info
        </button>
        <button
          type="button"
          style={tabButtonStyle(activeTab === 'leaderboard')}
          onClick={() => setActiveTab('leaderboard')}
        >
          Leaderboard
        </button>
      </div>
      {activeTab === 'leaderboard' && (
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
          {[
            { key: 'season', label: 'Current Season' },
            { key: 'all', label: 'All Time' },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              style={{
                flex: '0 0 auto',
                padding: '6px 12px',
                border: '1px solid var(--color-primary-darkest)',
                background: leaderboardScope === key ? 'var(--color-primary-darkest)' : 'transparent',
                color: 'var(--color-primary-lightest)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                letterSpacing: '0.04em',
              }}
              onClick={() => setLeaderboardScope(key)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {activeTab === 'info' ? infoTab : leaderboardTab}
      </div>
    </div>
  )
}
