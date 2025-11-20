// GameField.jsx
import { textStyles } from '@chakra-ui/react/theme'
import { useMemo, useState, useEffect, useRef, useCallback } from 'preact/hooks'
import { useQuery, useSubscription } from '@urql/preact'
import NeonButton from '../buttons/NeonButton.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHourglassStart, faFlag } from '@fortawesome/free-solid-svg-icons'
import {
  GAME_MOVES_QUERY,
  GAME_EVENTS_SUBSCRIPTION,
  GAME_MOVE_SUBSCRIPTION,
} from '../../data/inarow_gql.js'
import EmptyGamePanel from './components/EmptyGamePanel.jsx'
import { getBoardDimensions } from './utils/boardDimensions.js'

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
  onExecuteAction,
  pendingAction,
}) {
  const size = useMemo(() => getBoardDimensions(game?.type), [game?.type])
  const allowMultiple = false
  const [selected, setSelected] = useState([])
  const [fallingFrame, setFallingFrame] = useState(null) // { r, c } for C4 animation
  const [boardState, setBoardState] = useState(null)
  const [resolvedRoles, setResolvedRoles] = useState({ playerX: null, playerY: null })
  const [resolvedNextPlayer, setResolvedNextPlayer] = useState(game?.nextTurnPlayer ?? null)
  const [serverMoveType, setServerMoveType] = useState(game?.moveType ?? 'm')
  const [resultBanner, setResultBanner] = useState(null)
  const [isAddingExtra, setIsAddingExtra] = useState(false)
  const [extraPlacements, setExtraPlacements] = useState([])
  const [awaitingAddChoice, setAwaitingAddChoice] = useState(false)
  const [isSubmittingAddChoice, setIsSubmittingAddChoice] = useState(false)
  const boardWrapperRef = useRef(null)
  const [boardSize, setBoardSize] = useState(null)
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
  const swapEvents = useMemo(() => {
    const raw = gameDetails.data?.swaps
    return Array.isArray(raw) ? raw : []
  }, [gameDetails.data?.swaps])
  const hasAddChoice = useMemo(
    () =>
      swapEvents.some(
        (swap) =>
          (swap.operation || '').toLowerCase() === 'choose' &&
          (swap.choice || '').toLowerCase() === 'add',
      ),
    [swapEvents],
  )
  const fullUser = user ? (user.startsWith('hive:') ? user : `hive:${user}`) : null
  const normalizeId = (value) => (value || '').replace(/^hive:/i, '').toLowerCase()
  const normalizedFullUser = normalizeId(fullUser)
  const applyTerminalEvent = useCallback(
    (entry) => {
      if (!entry || !fullUser) return
      const updateBanner = (text, tone) => setResultBanner({ text, tone })

      switch (entry.event_type) {
        case 'won': {
          if (!entry.winner) return
          const isMe = entry.winner === fullUser
          updateBanner(
            isMe
              ? 'You won the game!'
              : `${formatUserHandle(entry.winner)} won the game.`,
            isMe ? 'positive' : 'negative',
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
    },
    [fullUser],
  )

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
    const {
      moves = [],
      joins = [],
      stateinfo = [],
    } = gameDetails.data
    const stateMeta = stateinfo[0]
    let computedPlayerX =
      stateMeta?.x_player ?? game.playerX ?? game.creator ?? null
    let computedPlayerY =
      stateMeta?.o_player ?? game.playerY ?? game.opponent ?? null
    const joinInfo = joins[0]
    if (!stateMeta && joinInfo?.by) {
      if (hasFmp(joinInfo.fmp)) {
        computedPlayerX = joinInfo.by
        computedPlayerY = game.creator ?? computedPlayerY
      } else if (!computedPlayerY) {
        computedPlayerY = joinInfo.by
      }
    }
    const boardArr = Array(size.rows * size.cols).fill('0')
    const isGomoku = (game?.type || '').toLowerCase() === 'gomoku'
    if (isGomoku) {
      swapEvents
        .filter((swap) => {
          const op = (swap.operation || '').toLowerCase()
          return op === 'place' || op === 'add'
        })
        .forEach((swap) => {
          const idx = Number(swap.cell)
          if (!Number.isFinite(idx) || idx < 0 || idx >= boardArr.length) {
            return
          }
          boardArr[idx] = Number(swap.color) === 2 ? '2' : '1'
        })
    }
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
    const nextFromState = stateMeta?.next_turn_player ?? game?.nextTurnPlayer
    if (nextFromState) {
      setResolvedNextPlayer(nextFromState)
    } else if (computedPlayerX && computedPlayerY) {
      setResolvedNextPlayer(
        moves.length === 0
          ? computedPlayerX
          : lastMoveBy === computedPlayerX
            ? computedPlayerY
            : computedPlayerX,
      )
    } else {
      setResolvedNextPlayer(null)
    }
    if (stateMeta?.movetype) {
      setServerMoveType(stateMeta.movetype)
    } else if (game?.moveType) {
      setServerMoveType(game.moveType)
    } else {
      setServerMoveType('m')
    }
  }, [gameDetails.data, size, game, swapEvents])
  const persistedBoard = typeof game?.board === 'string' ? game.board : ''
  const isCompactGrid = true

  const board = boardState ?? (persistedBoard.length === totalCells ? persistedBoard : defaultBoard)
  const playerX = resolvedRoles.playerX ?? game?.playerX
  const playerY = resolvedRoles.playerY ?? game?.playerY
  const normalizedPlayerX = normalizeId(playerX)
  const normalizedPlayerY = normalizeId(playerY)
  const hasOpponent = Boolean(playerX && playerY)
  const normalizedMoveType = (serverMoveType || game?.moveType || 'm') || 'm'
  const swapStage = normalizedMoveType.toLowerCase()
  const isSwapDecisionPhase = game?.type === 'Gomoku' && swapStage === 's_2'
  const isSwapFinalChoicePhase = game?.type === 'Gomoku' && swapStage === 's_3'
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
  const handleSwapDecision = async (choice) => {
    if (choice === 'add') return
    if (!onExecuteAction || !game?.id) return
    await onExecuteAction({
      __gameId: game.id,
      __gameAction: 'g_swap',
      __gameSwapOp: 'choose',
      __gameSwapArgs: [choice],
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
  function syncSwapAddParams(placements) {
    setParams((prev) => ({
      ...prev,
      __gameAction: placements.length === 2 ? 'g_swap' : undefined,
      __gameSwapOp: placements.length === 2 ? 'add' : undefined,
      __gameSwapArgs:
        placements.length === 2
          ? placements.map((entry) => `${entry.r}-${entry.c}-${entry.color}`)
          : undefined,
    }))
  }
  useEffect(() => {
    updateSelection([])
    setExtraPlacements([])
    setIsAddingExtra(false)
    setFallingFrame(null)
    setAwaitingAddChoice(false)
  }, [game?.id, game?.state])

  useEffect(() => {
    const allowExtras = swapStage === 's_2' && hasAddChoice
    if (allowExtras) {
      if (!isAddingExtra) {
        setIsAddingExtra(true)
        setExtraPlacements([])
        syncSwapAddParams([])
      }
      setAwaitingAddChoice(false)
    } else if (isAddingExtra) {
      setIsAddingExtra(false)
      setExtraPlacements([])
      setSelected([])
      syncSwapAddParams([])
    }
    if (!allowExtras) {
      setIsSubmittingAddChoice(false)
      if (!hasAddChoice && awaitingAddChoice) {
        setAwaitingAddChoice(false)
      }
    }
  }, [swapStage, hasAddChoice, isAddingExtra, awaitingAddChoice])

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
  const highlightedCells = isAddingExtra ? extraPlacements : selected
  const isSelected = (r, c) => highlightedCells.some((s) => s.r === r && s.c === c)
  const findC4LandingRow = (col) => {
    for (let r = size.rows - 1; r >= 0; r--) {
      const idx = r * size.cols + col
      if (board.charAt(idx) === '0') return r
    }
    return null
  }
  const renumberPlacements = (placements) =>
    placements.map((entry, idx) => ({
      ...entry,
      color: idx === 0 ? 1 : 2,
    }))

  const toggleCell = (r, c) => {
    if (isSwapDecisionPhase && !isAddingExtra) return
    if (isAddingExtra) {
      const already = extraPlacements.some((entry) => entry.r === r && entry.c === c)
      if (already) {
        const remainingRaw = extraPlacements.filter((entry) => !(entry.r === r && entry.c === c))
        const remaining = renumberPlacements(remainingRaw)
        setExtraPlacements(remaining)
        setSelected(remaining.map(({ r, c }) => ({ r, c })))
        syncSwapAddParams(remaining)
        return
      }
      if (!hasOpponent || extraPlacements.length >= 2) return
      const cellIndex = r * size.cols + c
      if (board.charAt(cellIndex) !== '0') return
      const nextColor = extraPlacements.length === 0 ? 1 : 2
      const nextPlacements = [...extraPlacements, { r, c, color: nextColor }]
      setExtraPlacements(nextPlacements)
      setSelected(nextPlacements.map(({ r, c }) => ({ r, c })))
      syncSwapAddParams(nextPlacements)
      return
    }
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

  const minsAgo = game.lastMoveMinutesAgo
  const daysAgo = Math.floor(minsAgo / (24 * 60))

  const disableSwapChoiceButtons = pendingAction || isSubmittingAddChoice || awaitingAddChoice
  const swapDecisionOverlay = isSwapDecisionPhase && isMyTurn && !isAddingExtra ? (
    <div
      style={{
        position: 'absolute',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.85)',
        border: '1px solid var(--color-primary)',
        borderRadius: '10px',
        padding: '18px',
        zIndex: 5,
        width: isMobile ? 'calc(100% - 40px)' : 'auto',
        maxWidth: '420px',
        textAlign: 'center',
        boxShadow: '0 0 20px rgba(0,0,0,0.8)',
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: '12px' }}>Swap Opening Decision</div>
      <div style={{ fontSize: '0.85rem', marginBottom: '14px' }}>
        Choose whether to keep the layout, swap roles, or place two more stones.
      </div>
      {awaitingAddChoice && (
        <div
          style={{
            marginBottom: '10px',
            fontSize: '0.85rem',
            color: 'var(--color-primary-lightest)',
          }}
        >
          Waiting for add decision confirmation…
        </div>
      )}
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '10px',
          justifyContent: 'center',
        }}
      >
        <NeonButton disabled={disableSwapChoiceButtons} onClick={() => handleSwapDecision('stay')}>
          Stay
        </NeonButton>
        <NeonButton disabled={disableSwapChoiceButtons} onClick={() => handleSwapDecision('swap')}>
          Swap Roles
        </NeonButton>
        <NeonButton
          disabled={disableSwapChoiceButtons}
          onClick={async () => {
            if (!onExecuteAction || !game?.id) return
            setAwaitingAddChoice(true)
            setIsSubmittingAddChoice(true)
            try {
              await onExecuteAction({
                __gameId: game.id,
                __gameAction: 'g_swap',
                __gameSwapOp: 'choose',
                __gameSwapArgs: ['add'],
              })
            } catch (err) {
              console.error('Failed to start extra placements', err)
              setAwaitingAddChoice(false)
            } finally {
              setIsSubmittingAddChoice(false)
            }
          }}
        >
          Place Two More
        </NeonButton>
      </div>
    </div>
  ) : null

  const swapFinalOverlay = isSwapFinalChoicePhase && isMyTurn ? (
    <div
      style={{
        position: 'absolute',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.85)',
        border: '1px solid var(--color-primary)',
        borderRadius: '10px',
        padding: '18px',
        zIndex: 5,
        width: isMobile ? 'calc(100% - 40px)' : 'auto',
        maxWidth: '420px',
        textAlign: 'center',
        boxShadow: '0 0 20px rgba(0,0,0,0.8)',
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: '12px' }}>Swap Final Decision</div>
      <div style={{ fontSize: '0.85rem', marginBottom: '14px' }}>
        The opponent added two stones. Choose your final color.
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '10px',
          justifyContent: 'center',
        }}
      >
        <NeonButton
          disabled={pendingAction}
          onClick={() =>
            onExecuteAction?.({
              __gameId: game.id,
              __gameAction: 'g_swap',
              __gameSwapOp: 'color',
              __gameSwapArgs: ['1'],
            })
          }
        >
          Play as X
        </NeonButton>
        <NeonButton
          disabled={pendingAction}
          onClick={() =>
            onExecuteAction?.({
              __gameId: game.id,
              __gameAction: 'g_swap',
              __gameSwapOp: 'color',
              __gameSwapArgs: ['2'],
            })
          }
        >
          Play as O
        </NeonButton>
      </div>
    </div>
  ) : null

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
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between' }}>
          <NeonButton
            onClick={() => handleResignClick([])}
            style={{ marginBottom: '10px', flex: 1 }}
          >
            <FontAwesomeIcon icon={faFlag} style={{ marginRight: '10px' }} />
            Resign
          </NeonButton>

          <NeonButton
            disabled={!hasOpponent || daysAgo < 7}
            onClick={() => handleTimeoutClick([])}
            style={{ marginBottom: '10px', flex: 1 }}
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
        {swapDecisionOverlay || swapFinalOverlay}
        {(() => {
          const overlayBanner =
            resultBanner ?? (!hasOpponent ? { text: 'Waiting for another player to join…' } : null)
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
              const selectedCell = isSelected(r, c)
              const clickable = isMyTurn && val === '0'
              const draftPlacement =
                isAddingExtra &&
                extraPlacements.find((entry) => entry.r === r && entry.c === c)
console.log({ normalizedFullUser, normalizedPlayerX, normalizedPlayerY  })
              return (
                <GomokuCell
                  key={`${r}-${c}`}
                  selected={selectedCell}
                  clickable={clickable}
                  isMobile={isMobile}
                  val={val}
                  draftPlacement={draftPlacement}
                  normalizedFullUser={normalizedFullUser}
                  normalizedPlayerX={normalizedPlayerX}
                  normalizedPlayerY={normalizedPlayerY}
                  onClick={() => toggleCell(r, c)}
                />
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function GomokuCell({
  selected,
  clickable,
  val,
  isMobile,
  onClick,
  draftPlacement,
  normalizedFullUser,
  normalizedPlayerX,
  normalizedPlayerY,
}) {
  const myLetter = normalizedFullUser && normalizedPlayerX === normalizedFullUser ? 'X' : 'O'
  const cellLetter = val === '1' ? 'X' : val === '2' ? 'O' : selected ? myLetter : ''
  const owner = val === '1' ? normalizedPlayerX : val === '2' ? normalizedPlayerY : null
  const isMine = owner && normalizedFullUser && owner === normalizedFullUser
  const fillColor = owner ? (isMine ? 'var(--color-primary)' : 'var(--color-primary-darkest)') : null
  const fgColor = owner ? (isMine ? 'black' : 'var(--color-primary-lighter)') : null
  const background =
    fillColor || (draftPlacement || selected ? 'var(--color-primary)' : 'transparent')
  const glyph = cellLetter === 'X' ? '*' : cellLetter === 'O' ? '@' : ''
  return (
    <div
      class={!isMobile && (`board-cell ${clickable ? 'clickable' : ''}`)}
      onClick={onClick}
      style={{
        aspectRatio: '1 / 1',
        border: selected
          ? '2px solid var(--color-primary-lightest)'
          : val === '0'
            ? '1px solid var(--color-primary-darker)'
            : 'none',
        background,
        boxShadow: 'none',
        display: 'flex',
        borderRadius: '50px',
        alignItems: 'center',
        justifyContent: 'center',
        color: fgColor,
        
        // fontWeight: 'bold',
        cursor: clickable ? 'pointer' : 'not-allowed',
        transition: 'box-shadow 0.3s ease, background 0.3s ease',
      }}
    >
      <span class="pixel-ttt-font" style={{ color: fgColor, fontSize: '1.2rem' }}>{glyph}</span>
    </div>
  )
}
