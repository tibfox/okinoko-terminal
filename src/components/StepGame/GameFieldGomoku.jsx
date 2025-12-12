// GameField.jsx
import { textStyles } from '@chakra-ui/react/theme'
import { useMemo, useState, useEffect, useRef, useCallback } from 'preact/hooks'
import { useQuery } from '@urql/preact'
import NeonButton from '../buttons/NeonButton.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHourglassStart, faFlag, faCirclePlay, faTrophy, faHandshake, faClock, faHandPeace } from '@fortawesome/free-solid-svg-icons'
import {
  GAME_MOVES_QUERY,
} from '../../data/inarow_gql.js'
import EmptyGamePanel from './components/EmptyGamePanel.jsx'
import { getBoardDimensions } from './utils/boardDimensions.js'
import { useGameSubscription } from './providers/GameSubscriptionProvider.jsx'
import { playBeep } from '../../lib/beep.js'

const BOARD_MAX_DIMENSION = 'min(90vmin, calc(100vh - 220px))'
const isGomokuVariantType = (type) => {
  const key = String(type || '').trim().toLowerCase()
  return (
    key === 'gomoku' ||
    key === 'gomokofreestyle' ||
    key === 'gomoku freestyle' ||
    key === '3' ||
    key === '6' ||
    key.includes('gomoku')
  )
}
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
  onSwapInfoChange,
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
  const [swapPlacements, setSwapPlacements] = useState([])
  const disableSwapChoiceButtons = pendingAction
  const boardWrapperRef = useRef(null)
  const [boardSize, setBoardSize] = useState(null)
  const fallingTimerRef = useRef(null)
  const lastSwapInfoRef = useRef(null)
  const FRAME_MS = 100
  const SOFT_GLOW_PRIMARY = '0 0 18px var(--color-primary), inset 0 0 12px var(--color-primary)'
  const ULTRA_GLOW = '0 0 50px var(--color-primary), 0 0 30px var(--color-primary), inset 0 0 25px var(--color-primary), inset 0 0 15px var(--color-primary)'
  const numericGameId = game?.id != null ? toNumericVar(game.id) : null
  const totalCells = size ? size.rows * size.cols : 0
  const defaultBoard = size ? '0'.repeat(totalCells) : ''
  const { updateCounter } = useGameSubscription()
  const [gameDetails, reexecuteGameDetails] = useQuery({
    query: GAME_MOVES_QUERY,
    pause: !numericGameId,
    variables: numericGameId ? { gameId: numericGameId } : undefined,
    requestPolicy: 'cache-and-network',
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
  const countSwapColors = useCallback((placements) => {
    return placements.reduce(
      (acc, entry) => {
        if (entry.color === 2) acc.o += 1
        else acc.x += 1
        return acc
      },
      { x: 0, o: 0 },
    )
  }, [])

  const determineNextSwapColor = useCallback(
    (placements) => {
      if (placements.length === 0) return 1 // First stone must be X
      if (placements.length === 1) {
        // Second stone should be the opposite of the first to follow X, O, X
        return placements[0].color === 1 ? 2 : 1
      }
      if (placements.length === 2) {
        // If we already have X then O, cap with an X; otherwise fall back to counts to stay valid
        if (placements[0].color === 1 && placements[1].color === 2) {
          return 1
        }
        const counts = countSwapColors(placements)
        if (counts.x < 2) return 1
        if (counts.o < 1) return 2
        return null
      }
      return null
    },
    [countSwapColors],
  )
  const fullUser = user ? (user.startsWith('hive:') ? user : `hive:${user}`) : null
  const normalizeId = (value) => (value || '').replace(/^hive:/i, '').toLowerCase()
  const normalizedFullUser = normalizeId(fullUser)
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
    if (isGomokuVariantType(game?.type)) {
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
    } else if (game?.state) {
      setServerMoveType(game.state)
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
  const normalizedMoveTypeRaw =
    serverMoveType ||
    game?.moveType ||
    game?.state ||
    'm'
  const normalizedMoveType = typeof normalizedMoveTypeRaw === 'string'
    ? normalizedMoveTypeRaw.trim().toLowerCase()
    : String(normalizedMoveTypeRaw || 'm')
  const swapStageRaw = normalizedMoveType
  const swapStageKeyBase = swapStageRaw.replace(/[^a-z0-9]/g, '')

  // Check if swap phases are complete by looking for a final color choice
  const hasSwapCompleted = swapEvents.some(
    (swap) => {
      const op = (swap.operation || '').toLowerCase()
      const choice = (swap.choice || '').toLowerCase()
      const isColorOp = op === 'color'
      const isChooseWithStayOrSwap = op === 'choose' && (choice === 'stay' || choice === 'swap')
      console.log('[GameFieldGomoku] Checking swap event:', { op, choice, isColorOp, isChooseWithStayOrSwap })
      return isColorOp || isChooseWithStayOrSwap
    }
  )
  console.log('[GameFieldGomoku] hasSwapCompleted:', hasSwapCompleted, 'swapEvents:', swapEvents)

  const swapStageKey =
    isGomokuVariantType(game?.type) && (!swapStageKeyBase || swapStageKeyBase === 'm') && !hasSwapCompleted
      ? 'swap'
      : swapStageKeyBase
  const isSwapPlacementPhase =
    isGomokuVariantType(game?.type) &&
    (
      swapStageKey === 's1' ||
      swapStageKey === 'swap' ||
      swapStageKey === 'swap1'
    )
  const isSwapDecisionPhase =
    isGomokuVariantType(game?.type) &&
    (swapStageKey === 's2' || swapStageKey === 'swap2')
  const isSwapFinalChoicePhase =
    isGomokuVariantType(game?.type) &&
    (swapStageKey === 's3' || swapStageKey === 'swap3')
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
  const handleSwapDecision = useCallback(
    async (choice) => {
      if (choice === 'add') return
      if (!onExecuteAction || !game?.id) return
      await onExecuteAction({
        __gameId: game.id,
        __gameAction: 'g_swap',
        __gameSwapOp: 'choose',
        __gameSwapArgs: [choice],
      })
    },
    [game?.id, onExecuteAction],
  )
  // helper to sync selection and params
  const coordsEqual = useCallback((a, b) => {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i += 1) {
      if (a[i].r !== b[i].r || a[i].c !== b[i].c) return false
    }
    return true
  }, [])
  const updateSelection = useCallback((cells) => {
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
  }, [coordsEqual, onSelectionChange, setParams])
  function syncSwapAddParams(placements) {
    const nextAction = placements.length === 2 ? 'g_swap' : undefined
    const nextOp = placements.length === 2 ? 'add' : undefined
    const nextArgs =
      placements.length === 2
        ? placements.map((entry) => `${entry.r}-${entry.c}-${entry.color}`)
        : undefined
    const nextArgsKey = Array.isArray(nextArgs) ? nextArgs.join(';') : null
    setParams((prev = {}) => {
      const prevArgsKey = Array.isArray(prev.__gameSwapArgs) ? prev.__gameSwapArgs.join(';') : null
      if (
        prev.__gameAction === nextAction &&
        prev.__gameSwapOp === nextOp &&
        prevArgsKey === nextArgsKey
      ) {
        return prev
      }
      return {
        ...prev,
        __gameAction: nextAction,
        __gameSwapOp: nextOp,
        __gameSwapArgs: nextArgs,
      }
    })
  }
  function syncSwapPlaceParams(placements) {
    const nextAction = placements.length === 3 ? 'g_swap' : undefined
    const nextOp = placements.length === 3 ? 'place' : undefined
    const nextArgs =
      placements.length === 3
        ? placements.map((entry) => `${entry.r}-${entry.c}-${entry.color}`)
        : undefined
    const nextArgsKey = Array.isArray(nextArgs) ? nextArgs.join(';') : null
    setParams((prev = {}) => {
      const prevArgsKey = Array.isArray(prev.__gameSwapArgs) ? prev.__gameSwapArgs.join(';') : null
      if (
        prev.__gameAction === nextAction &&
        prev.__gameSwapOp === nextOp &&
        prevArgsKey === nextArgsKey &&
        prev.__gameCell === undefined
      ) {
        return prev
      }
      return {
        ...prev,
        __gameCell: undefined,
        __gameAction: nextAction,
        __gameSwapOp: nextOp,
        __gameSwapArgs: nextArgs,
      }
    })
  }
  const startSwapAdd = useCallback(() => {
    if (!isSwapDecisionPhase || !isMyTurn) return
    if (isAddingExtra) return
    setIsAddingExtra(true)
    setExtraPlacements([])
    updateSelection([])
    syncSwapAddParams([])
  }, [isSwapDecisionPhase, isMyTurn, isAddingExtra, updateSelection])

  useEffect(() => {
    updateSelection([])
    setExtraPlacements([])
    setIsAddingExtra(false)
    setFallingFrame(null)
    setSwapPlacements([])
    if (game?.id) {
      playBeep(800, 25, 'square')
    }
  }, [game?.id])

  const prevSwapStageRef = useRef(null)
  useEffect(() => {
    const inAddStage = swapStageKey === 's2' || swapStageKey === 'swap2'
    const prevStage = prevSwapStageRef.current
    prevSwapStageRef.current = swapStageKey

    // entering add decision stage: start clean, stay locked until user clicks "Place Two More"
    if (inAddStage && prevStage !== swapStageKey) {
      // Only reset if we're transitioning into this stage from a different stage
      if (isAddingExtra || extraPlacements.length > 0) {
        setIsAddingExtra(false)
        setExtraPlacements([])
        updateSelection([])
        syncSwapAddParams([])
      }
      return
    }

    // Don't interfere if user is actively in "place two more" mode
    if (inAddStage && isAddingExtra) {
      return
    }

    if (!inAddStage && prevStage && isAddingExtra) {
      setIsAddingExtra(false)
      setExtraPlacements([])
      updateSelection([])
      syncSwapAddParams([])
    }
  }, [swapStageKey, isMyTurn, isAddingExtra, extraPlacements.length, updateSelection])

  useEffect(() => {
    if (!isSwapPlacementPhase) {
      if (swapPlacements.length) {
        setSwapPlacements([])
        syncSwapPlaceParams([])
        updateSelection([])
      }
      return
    }
    // keep selection in sync with placements during the opening phase
    const coordsOnly = swapPlacements.map(({ r, c }) => ({ r, c }))
    updateSelection(coordsOnly)
    syncSwapPlaceParams(swapPlacements)
  }, [isSwapPlacementPhase, swapPlacements])

  const swapInfoPayload = useMemo(() => {
    if (!isGomokuVariantType(game?.type)) {
      return null
    }
    const labelStone = (color) => (color === 2 ? 'O' : 'X')
    if (isSwapPlacementPhase) {
      const counts = countSwapColors(swapPlacements)
      const remainingParts = []
      if (counts.x < 2) remainingParts.push(`${2 - counts.x} X`)
      if (counts.o < 1) remainingParts.push(`${1 - counts.o} O`)
      const nextColor = determineNextSwapColor(swapPlacements)
      return {
        active: true,
        waitingText: isMyTurn ? 'Swap Opening' : 'Swap Opening (opponent placing)',
        description: 'Place three stones (two X, one O) to start the Swap2 opening.',
        remaining: remainingParts.length ? `Remaining: ${remainingParts.join(' and ')}` : 'All swap stones placed',
        nextStone: nextColor ? `Next stone: ${labelStone(nextColor)}` : undefined,
      }
    }
    if (isAddingExtra) {
      const nextColor = extraPlacements.length === 0 ? 1 : extraPlacements.length === 1 ? 2 : null
      return {
        active: true,
        waitingText: isMyTurn ? 'Swap Add Phase' : 'Swap Add Phase (opponent placing)',
        description: 'Place two extra stones; the opponent will pick their final color.',
        remaining: extraPlacements.length < 2 ? `Remaining: ${2 - extraPlacements.length} stones` : 'Ready to submit',
        nextStone: nextColor ? `Next stone: ${labelStone(nextColor)}` : undefined,
      }
    }
    if (isSwapDecisionPhase) {
      const actionsDisabled = pendingAction || !isMyTurn
      const noop = () => {}
      return {
        active: true,
        waitingText: isMyTurn ? 'Swap Decision' : 'Waiting for opponent swap decision…',
        description: 'Choose to stay, swap colors, or place two extra stones.',
        actions: {
          disabled: actionsDisabled,
          onStay: isMyTurn ? () => handleSwapDecision('stay') : noop,
          onSwap: isMyTurn ? () => handleSwapDecision('swap') : noop,
          onAdd: isMyTurn ? startSwapAdd : noop,
        },
      }
    }
    if (isSwapFinalChoicePhase) {
      return {
        active: true,
        waitingText: isMyTurn ? 'Swap Final Choice' : 'Waiting for opponent color choice…',
        description: 'Opponent placed two extra stones. Pick your final color.',
      }
    }
    return null
  }, [
    game?.type,
    isSwapPlacementPhase,
    isSwapDecisionPhase,
    isSwapFinalChoicePhase,
    isMyTurn,
    swapPlacements,
    extraPlacements,
    isAddingExtra,
    countSwapColors,
    determineNextSwapColor,
    disableSwapChoiceButtons,
    handleSwapDecision,
    startSwapAdd,
  ])

  useEffect(() => {
    if (!onSwapInfoChange) return
    const serialized =
      swapInfoPayload === null ? 'null' : JSON.stringify(swapInfoPayload)
    if (lastSwapInfoRef.current === serialized) return
    lastSwapInfoRef.current = serialized
    onSwapInfoChange(swapInfoPayload)
  }, [onSwapInfoChange, swapInfoPayload])

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
  const isExtraModeActive = isAddingExtra || extraPlacements.length > 0
  const highlightedCells = isExtraModeActive ? extraPlacements : selected
  const swapHighlightedCells = isSwapPlacementPhase ? swapPlacements : highlightedCells
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
    if (isSwapDecisionPhase && !isExtraModeActive) return
    const index = r * size.cols + c
    const cellVal = board.charAt(index)
    if (isSwapPlacementPhase) {
      if (!isMyTurn) return
      if (cellVal !== '0') return
      const already = swapPlacements.some((entry) => entry.r === r && entry.c === c)
      if (already) {
        const remaining = swapPlacements.filter((entry) => !(entry.r === r && entry.c === c))
        setSwapPlacements(remaining)
        return
      }
      if (swapPlacements.length >= 3) return
      const nextColor = determineNextSwapColor(swapPlacements)
      if (nextColor == null) return
      const next = [...swapPlacements, { r, c, color: nextColor }]
      setSwapPlacements(next)
      playBeep(1000, 25, 'square')
      return
    }
    if (isAddingExtra) {
      const already = extraPlacements.some((entry) => entry.r === r && entry.c === c)
      if (already) {
        const remainingRaw = extraPlacements.filter((entry) => !(entry.r === r && entry.c === c))
        const remaining = renumberPlacements(remainingRaw)
        setExtraPlacements(remaining)
        updateSelection(remaining.map(({ r, c }) => ({ r, c })))
        syncSwapAddParams(remaining)
        return
      }
      if (!hasOpponent || extraPlacements.length >= 2) return
      const cellIndex = r * size.cols + c
      if (board.charAt(cellIndex) !== '0') return
      const nextColor = extraPlacements.length === 0 ? 1 : 2
      const nextPlacements = [...extraPlacements, { r, c, color: nextColor }]
      setExtraPlacements(nextPlacements)
      updateSelection(nextPlacements.map(({ r, c }) => ({ r, c })))
      syncSwapAddParams(nextPlacements)
      playBeep(1000, 25, 'square')
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
          playBeep(1000, 25, 'square')
          fallingTimerRef.current = null
        }
      }
      animate()
      return
    }
    // Non-C4 behavior (respect G/TTT rules)
    if (cellVal !== '0') return
    if (allowMultiple) {
      const exists = selected.some((s) => s.r === r && s.c === c)
      const next = exists
        ? selected.filter((s) => !(s.r === r && s.c === c))
        : [...selected, { r, c }]
      updateSelection(next)
    } else {
      updateSelection([{ r, c }])
    }
    playBeep(1000, 25, 'square')
  }

  const minsAgo = game.lastMoveMinutesAgo
  const daysAgo = Math.floor(minsAgo / (24 * 60))
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
      <div style={{ fontWeight: 600, marginBottom: '12px' }}>Swap Decision</div>
      <div style={{ fontSize: '0.85rem', marginBottom: '14px' }}>
        Choose to stay, swap colors, or place two extra stones.
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
          onClick={() => handleSwapDecision('stay')}
        >
          Stay
        </NeonButton>
        <NeonButton
          disabled={pendingAction}
          onClick={() => handleSwapDecision('swap')}
        >
          Swap
        </NeonButton>
        <NeonButton
          disabled={pendingAction}
          onClick={startSwapAdd}
        >
          Place Two More
        </NeonButton>
      </div>
    </div>
  ) : null

  const swapLockedOverlay = null

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
            marginBottom: '16px',
            fontSize: isMobile ? '0.95rem' : '1.1rem',
            fontWeight: 600,
            letterSpacing: '0.04em',
            padding: isMobile ? '6px 12px' : '10px 16px',
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
        {swapLockedOverlay}
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
              const selectedCell = swapHighlightedCells.some((s) => s.r === r && s.c === c)
              const clickable = isMyTurn && val === '0'
              const draftPlacement =
                (isAddingExtra &&
                  extraPlacements.find((entry) => entry.r === r && entry.c === c)) ||
                (isSwapPlacementPhase &&
                  swapPlacements.find((entry) => entry.r === r && entry.c === c))
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
  const draftLetter = draftPlacement ? (draftPlacement.color === 2 ? 'O' : 'X') : null
  const cellLetter =
    val === '1'
      ? 'X'
      : val === '2'
        ? 'O'
        : draftLetter ?? (selected ? myLetter : '')
  const owner = val === '1' ? normalizedPlayerX : val === '2' ? normalizedPlayerY : null
  const isMine = owner && normalizedFullUser && owner === normalizedFullUser
  const isDraft = Boolean(draftPlacement)
  const fillColor = owner
    ? isMine
      ? 'var(--color-primary)'
      : 'var(--color-primary-darkest)'
    : isDraft
      ? draftPlacement.color === 2
        ? 'var(--color-primary-darkest)'
        : 'var(--color-primary)'
      : null
  const fgColor = owner
    ? isMine
      ? 'black'
      : 'var(--color-primary-lighter)'
    : isDraft
      ? 'black'
      : 'black'
  const background = fillColor || (selected ? 'var(--color-primary)' : 'transparent')
  const glyph = cellLetter === 'X' ? '*' : cellLetter === 'O' ? '@' : ''
  return (
    <div
      class={!isMobile && (`board-cell ${clickable ? 'clickable' : ''}`)}
      onClick={onClick}
      style={{
        aspectRatio: '1 / 1',
        border:
          val === '0' && !selected && !draftPlacement
            ? '1px solid var(--color-primary-darker)'
            : 'none',
        boxShadow: selected || draftPlacement
          ? 'inset 0 0 0 2px var(--color-primary-lightest)'
          : 'none',
        background,
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
