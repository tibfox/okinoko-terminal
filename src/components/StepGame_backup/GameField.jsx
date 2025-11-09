// GameField.jsx
import { textStyles } from '@chakra-ui/react/theme'
import { useMemo, useState, useEffect, useRef } from 'preact/hooks'
import { useQuery, useSubscription } from '@urql/preact'
import NeonButton from '../buttons/NeonButton.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHourglassStart, faFlag } from '@fortawesome/free-solid-svg-icons';
import { GAME_MOVES_QUERY, GAME_EVENTS_SUBSCRIPTION, GAME_MOVE_SUBSCRIPTION } from '../../data/inarow_gql.js'
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
export default function GameField({ game, user, onSelectionChange, setParams, handleResign, handleTimeout, isMobile, onStateChange }) {
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
  const fullUser = user.startsWith('hive:') ? user : `hive:${user}`
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
    // Convert to payload format "__gameMove"
    setParams(prev => ({
      ...prev,
      __gameAction: 'g_resign'
    }))
    const confirmResign = window.confirm("Are you sure you want to resign from this game? This action cannot be undone.")
    if (confirmResign) {
      // Update selection to trigger resign action
      setSelected(cells)
      onSelectionChange?.(cells)
      handleResign()
    }
  }
  const handleTimeoutClick = (cells) => {
    // Convert to payload format "__gameMove"
    setParams(prev => ({
      ...prev,
      __gameAction: 'g_timeout'
    }))
    const confirmTimeout = window.confirm("Are you sure you want to timeout your opponent? This action cannot be undone.")
    if (confirmTimeout) {
      // Update selection to trigger timeout action
      setSelected(cells)
      onSelectionChange?.(cells)
      handleTimeout()
    }
  }
  // helper to sync selection and params
  const updateSelection = (cells) => {
    setSelected(cells)
    onSelectionChange?.(cells)
    // Convert to payload format "__gameMove"
    // Convert selection array to string "r,c" or "r1,c1;r2,c2" for swap mode
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
    return (
      <div><h2>Welcome to the Game Arena</h2>
        <p>No game selected yet - this is just your staging area.
          From here, you can choose to <b>Create</b> a new game, <b>Join</b> a game someone else started, or <b>Continue</b> a game you're already part of.
          Pick an option to get started and dive into a match.</p>
        <div style={{ marginTop: '40px' }}>
          <h4>First Move Payment (FMP)</h4>
          <p>Some game creators enable a feature called <b>First Move Payment</b>.
            If it's available, you can choose to pay a small extra amount to secure the first turn.
            Why? Because in many strategy games, going first offers a small tactical advantage.
            If you don't want it, simply leave it off and join the game normally - completely optional.
          </p></div>
        <div style={{ marginTop: '40px' }}>
          <h4>Enjoy your gaming!</h4></div>
      </div>
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
      {!hasOpponent && (
        <div style={{ textAlign: 'center', color: 'var(--color-primary-lighter)', marginBottom: '12px' }}>
          Waiting for an opponent to join…
        </div>
      )}
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
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          aspectRatio: `${size.cols} / ${size.rows}`,
          maxWidth: '100%',
          display: 'grid',
          gridTemplateColumns: `repeat(${size.cols}, 1fr)`,
          gridTemplateRows: `repeat(${size.rows}, 1fr)`,
          gap: '4px'
        }}>
          {!hasOpponent && (
            <div style={{ gridColumn: `span ${size.cols}`, marginBottom: '12px', textAlign: 'center', color: 'var(--color-primary-lighter)' }}>
              Waiting for another player to join…
            </div>
          )}
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
