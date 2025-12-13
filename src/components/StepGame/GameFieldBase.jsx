// GameField.jsx
import { textStyles } from '@chakra-ui/react/theme'
import { useMemo, useState, useEffect, useRef, useCallback } from 'preact/hooks'
import { useQuery } from '@urql/preact'
import NeonButton from '../buttons/NeonButton.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHourglassStart, faFlag, faCirclePlay, faTrophy, faHandshake, faClock, faHandPeace } from '@fortawesome/free-solid-svg-icons'
import { GAME_MOVES_QUERY } from '../../data/inarow_gql.js'
import EmptyGamePanel from './components/EmptyGamePanel.jsx'
import { getBoardDimensions } from './utils/boardDimensions.js'
import { useGameSubscription } from './providers/GameSubscriptionProvider.jsx'
import { playBeep } from '../../lib/beep.js'

const BOARD_MAX_DIMENSION = 'min(90vmin, calc(100vh - 220px))'
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

const formatUserHandle = (value) =>
  value ? value.replace(/^hive:/, '') : 'Unknown player'

export default function GameField({
  game,
  user,
  onSelectionChange,
  setParams,
  handleResign,
  handleTimeout,
  isMobile,
  onStateChange,
  defaultGameTypeId,
  gameDescription,
}) {
  const size = useMemo(() => getBoardDimensions(game?.type), [game?.type])
  const allowMultiple = game?.state === 'swap'
  const [selected, setSelected] = useState([])
  const [fallingFrame, setFallingFrame] = useState(null) // { r, c } for C4 animation
  const [boardState, setBoardState] = useState(null)
  const [resolvedRoles, setResolvedRoles] = useState({ playerX: null, playerY: null })
  const [resolvedNextPlayer, setResolvedNextPlayer] = useState(null)
  const [resultBanner, setResultBanner] = useState(null)
  const boardWrapperRef = useRef(null)
  const [boardSize, setBoardSize] = useState(null)
  const fallingTimerRef = useRef(null)
  const FRAME_MS = 100
  const SOFT_GLOW_PRIMARY = '0 0 18px var(--color-primary), inset 0 0 12px var(--color-primary)'
  const ULTRA_GLOW = '0 0 50px var(--color-primary), 0 0 30px var(--color-primary), inset 0 0 25px var(--color-primary), inset 0 0 15px var(--color-primary)'
  const numericGameId = game?.id != null ? toNumericVar(game.id) : null
  const totalCells = size ? size.rows * size.cols : 0
  const defaultBoard = size ? '0'.repeat(totalCells) : ''
  const { updateCounter, lastEvent } = useGameSubscription()
  const [gameDetails, reexecuteGameDetails] = useQuery({
    query: GAME_MOVES_QUERY,
    pause: !numericGameId,
    variables: numericGameId ? { gameId: numericGameId } : undefined,
    requestPolicy: 'cache-and-network',
  })
  const fullUser = user ? (user.startsWith('hive:') ? user : `hive:${user}`) : null
  const applyTerminalEvent = useCallback(
    (entry) => {
      if (!entry || !fullUser) return
      const updateBanner = (text, tone, icon) => setResultBanner({ text, tone, icon })

      switch (entry.event_type) {
        case 'won': {
          if (!entry.winner) return
          const isMe = entry.winner === fullUser
          updateBanner(
            isMe
              ? 'You won the game!'
              : `${formatUserHandle(entry.winner)} won the game.`,
            isMe ? 'positive' : 'negative',
            faTrophy,
          )
          break
        }
        case 'resign': {
          if (!entry.resigner) return
          const isMe = entry.resigner === fullUser
          updateBanner(
            isMe
              ? 'You resigned from this game.'
              : `${formatUserHandle(entry.resigner)} resigned. You win!`,
            isMe ? 'negative' : 'positive',
            faHandPeace,
          )
          break
        }
        case 'timeout': {
          if (!entry.timedout) return
          const isMe = entry.timedout === fullUser
          updateBanner(
            isMe
              ? 'You lost on timeout.'
              : `${formatUserHandle(entry.timedout)} timed out. You win!`,
            isMe ? 'negative' : 'positive',
            faClock,
          )
          break
        }
        case 'draw': {
          updateBanner('Game ended in a draw.', 'neutral', faHandshake)
          break
        }
        default:
          break
      }
    },
    [fullUser],
  )

  // Re-execute query when subscription updates
  useEffect(() => {
    if (updateCounter > 0 && reexecuteGameDetails) {
      console.log('[GameFieldBase] Subscription update detected, counter:', updateCounter)
      reexecuteGameDetails({ requestPolicy: 'network-only' })
    }
  }, [updateCounter, reexecuteGameDetails])

  // Process terminal events (won, draw, resign, timeout)
  useEffect(() => {
    if (!gameDetails.data?.terminal_events) return
    const terminalEvents = gameDetails.data.terminal_events
    if (terminalEvents.length > 0) {
      const latestEvent = terminalEvents[0]
      applyTerminalEvent(latestEvent)
    }
  }, [gameDetails.data?.terminal_events, applyTerminalEvent])

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
  const isCompactGrid =
    game?.type === 'Gomoku' || game?.type === 'Connect4'

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
  useEffect(() => {
    if (game?.id) {
      playBeep(800, 25, 'square')
    }
  }, [game?.id])
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
  const coordsEqual = (a, b) => {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i += 1) {
      if (a[i].r !== b[i].r || a[i].c !== b[i].c) return false
    }
    return true
  }
  // helper to sync selection and params
  const updateSelection = (cells) => {
    setSelected((prevSel) => {
      if (coordsEqual(prevSel, cells)) return prevSel
      onSelectionChange?.(cells)
      // Convert to payload format "__gameMove"
      const paramMove = cells.length > 1
        ? cells.map(s => `${s.r},${s.c}`).join(';')
        : cells.length === 1
          ? `${cells[0].r}|${cells[0].c}`
          : ''
      const nextCell = paramMove || undefined
      setParams(prev => {
        if (prev?.__gameCell === nextCell) return prev
        return {
          ...prev,
          __gameCell: nextCell   // clear if empty
        }
      })
      return cells
    })
  }
  useEffect(() => {
    updateSelection([])
    setFallingFrame(null)
  }, [game?.id, game?.state])

  useEffect(() => {
    if (!boardWrapperRef.current || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      const { width, height } = entry.contentRect
      setBoardSize(Math.min(width, height))
    })
    observer.observe(boardWrapperRef.current)
    return () => observer.disconnect()
  }, [])
  if (!game || !size) {
    return (
      <EmptyGamePanel
        defaultGameTypeId={defaultGameTypeId}
        description={gameDescription}
      />
    )
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
          playBeep(1000, 25, 'square')
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
    playBeep(1000, 25, 'square')
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
  const minsAgo = game.lastMoveMinutesAgo
  const daysAgo = Math.floor(minsAgo / (24 * 60))
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

        const isGameEnd = banner.tone === 'positive' || banner.tone === 'negative' || banner.tone === 'neutral'

        return (
          <div
            style={{
              textAlign: 'center',
              color: 'var(--color-primary-lighter)',
              marginBottom: '16px',
              fontSize: isGameEnd ? (isMobile ? '0.91rem' : '1.4rem') : '1.05rem',
              fontWeight: 600,
              letterSpacing: '0.04em',
              background: 'rgba(0, 0, 0, 0.5)',
              padding: isGameEnd ? (isMobile ? '12px 20px' : '20px 32px') : '8px 12px',
              borderRadius: '12px',
              display: isGameEnd ? 'flex' : 'inline-block',
              alignItems: 'center',
              gap: isGameEnd ? (isMobile ? '12px' : '20px') : '0',
              alignSelf: 'center',
              border: isGameEnd ? '2px solid var(--color-primary)' : 'none',
              boxShadow: isGameEnd ? '0 0 30px var(--color-primary)' : 'none',
            }}
          >
            {banner.icon && (
              <FontAwesomeIcon
                icon={banner.icon}
                style={{
                  fontSize: isMobile ? '2.5rem' : '4rem',
                  filter: 'drop-shadow(0 0 10px var(--color-primary))',
                  flexShrink: 0,
                }}
              />
            )}
            <span>{banner.text}</span>
          </div>
        )
      })()}

      {/* Turn indicator */}
      {hasOpponent && !resultBanner && (
        <div
          style={{
            textAlign: 'center',
            color: 'var(--color-primary-lighter)',
            marginBottom: '0px',
            fontSize: isMobile ? '0.95rem' : '1.1rem',
            fontWeight: 600,
            letterSpacing: '0.04em',
            padding: isMobile ? '0px 0px' : '10px 16px',
            alignSelf: 'center',
            background: isMobile ? 'transparent' : 'rgba(0, 0, 0, 0.5)',
            borderRadius: isMobile ? '0' : '6px',
          }}
        >
          <strong>Turn:</strong> {isMyTurn ? (
            <>
              <FontAwesomeIcon icon={faCirclePlay} style={{ marginLeft: '8px', marginRight: '6px' }} />
              your turn
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faHourglassStart} style={{ marginLeft: '8px', marginRight: '6px' }} />
              {resolvedNextPlayer ? formatUserHandle(resolvedNextPlayer) : opponentName || 'opponent'}
            </>
          )}
        </div>
      )}

      {isMobile ? (
        <div style={{ display: 'flex', gap: '10px', marginTop: '0px', marginBottom: '10px', justifyContent: 'center' }}>
      <NeonButton
        onClick={() => handleResignClick([])}
        style={{ flex: 1 }}
      >
        <FontAwesomeIcon icon={faFlag} style={{ marginRight: '10px' }} />
            Resign
          </NeonButton>

          <NeonButton
            disabled={!hasOpponent || daysAgo < 7}
            onClick={() => handleTimeoutClick([])}
            style={{ flex: 1 }}
          >
        <FontAwesomeIcon icon={faHourglassStart} style={{ marginRight: '10px' }} />
        Claim Timeout
      </NeonButton>
    </div>
      ) : null}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {(() => {
          // Only show overlay for "waiting for player" (not for game end states)
          const overlayBanner =
            !hasOpponent ? { text: 'Waiting for another player to join…' } : null
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
        <div
          ref={boardWrapperRef}
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isMobile ? '0 10px 10px' : '0',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              width: boardSize ? `${boardSize}px` : 'min(100%, 90vmin)',
              // let content define the height for these dense grids
              height: isCompactGrid ? 'auto' : (boardSize ? `${boardSize}px` : 'auto'),
              maxWidth: BOARD_MAX_DIMENSION,
              maxHeight: BOARD_MAX_DIMENSION,
              aspectRatio: isCompactGrid ? undefined : `${size.cols} / ${size.rows}`,
              display: 'grid',
              gridTemplateColumns: `repeat(${size.cols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${size.rows}, minmax(0, 1fr))`,
              gap: isCompactGrid ? '0' : '10px',
              alignContent: 'start',
            }}
          >
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
                    class={!isMobile && (`board-cell ${clickable ? 'clickable' : ''}`)}
                    onClick={() => toggleCell(r, c)}
                    style={{
                      aspectRatio: '1 / 1',
                      border: val === '0' && !selectedCell ? '1px solid var(--color-primary-darker)' : 'none',
                      boxShadow: selectedCell
                        ? 'inset 0 0 0 2px var(--color-primary-lightest)'
                        : 'none',
                      background,
                      boxShadow,
                      display: 'flex',
                      borderRadius: '50px',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: clickable ? 'pointer' : 'not-allowed',
                      transition: 'box-shadow 1s ease, background 1s ease'
                    }}
                  />
                )
              }
              // C4: frame-by-frame falling animation (soft glow while falling), selected uses ULTRA on landing
              if (game.type === 'Connect4') {
                const isSelectedLanding = selectedCell
                const isPlayerXStone = val === '1'
                const isPlayerYStone = val === '2'
                const isMyStone =
                  (fullUser === playerX && isPlayerXStone) ||
                  (fullUser === playerY && isPlayerYStone)
                const bgBase =
                  isSelectedLanding
                    ? 'var(--color-primary)'   // final landed cell filled
                    : isUsed
                      ? isMyStone
                        ? 'var(--color-primary)'
                        : 'var(--color-primary-darkest)'
                      : 'transparent'   // empty or falling stays transparent-ish
                const shadow =
                  isFalling
                    ? SOFT_GLOW_PRIMARY  // animation frame: soft glow only
                    : 'none'
                // : isSelectedLanding
                //   ? SOFT_GLOW_PRIMARY       // final position: ULTRA
                //   : 'none'
                const borderdef = isSelectedLanding ?
                  '4px solid var(--color-primary-lightest)' :
                  isFalling ? '2px solid var(--color-primary-lightest)' :
                    '1px solid ' + (clickable ? 'var(--color-primary-darker)' : 'var(--color-primary-darkest)');
                return (
                  <div
                    key={`${r}-${c}`}
                    class={!isMobile && (`board-cell ${clickable ? 'clickable' : ''}`)}
                    onClick={() => toggleCell(r, c)}
                    style={{
                      aspectRatio: '1 / 1',
                      border:
                        borderdef,
                      //  border: 'none',
                      background: bgBase,
                      boxShadow: shadow,
                      borderRadius: '90px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: clickable ? 'pointer' : 'not-allowed',
                      transition: 'box-shadow 10ms linear, background 500ms linear'
                    }}
                  />
                )
              }
              if (game.type == 'Squava') {
                const myLetter = fullUser === playerX ? 'X' : 'O'
                const cellLetter = val === '1' ? 'X' : val === '2' ? 'O' : selectedCell ? myLetter : ''
                return (
                  <div
                    key={`${r}-${c}`}
                    class={!isMobile && (`board-cell ${clickable ? 'clickable' : ''}`)}
                    onClick={() => toggleCell(r, c)}
                    style={{
                      aspectRatio: '1 / 1',
                      border: selectedCell && !isUsed ? '5px solid var(--color-primary-lightest)' : '1px solid var(--color-primary-darker)',
                      borderRadius: '20px',
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
                    {/* <span class="pixel-ttt-font">{!selectedCell ? "" : cellLetter == "X" ? "*" : "@"}</span> */}
                  </div>
                )
              }
              const myLetter = fullUser === playerX ? 'X' : 'O'
              const cellLetter = val === '1' ? 'X' : val === '2' ? 'O' : selectedCell ? myLetter : ''
              return (
                <div
                  key={`${r}-${c}`}
                  class={!isMobile && (`board-cell ${clickable ? 'clickable' : ''}`)}
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
                    fontSize: isMobile ? 'clamp(1.2rem, 10vw, 4rem)' : 'clamp(1.2rem, 3vw, 4rem)',
                    cursor: clickable ? 'pointer' : 'not-allowed',
                    transition: 'box-shadow 120ms ease, background 120ms ease',
                    fontFamily:
                      game.type === 'TicTacToe' || game.type === 'TicTacToe5'
                        ? "'Press Start 2P', monospace"
                        : 'inherit',
                  }}
                >
                  {(game.type === 'TicTacToe' || game.type === 'TicTacToe5') && (
                    <span class="pixel-ttt-font" style={{
                      color: 'black'
                       
                    }}>{cellLetter}</span>
                  )}
                </div>
              )

            })}
          </div>
        </div>
      </div>
    </div>


  )
}
