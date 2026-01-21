import { useState, useEffect, useRef, useCallback } from 'preact/hooks'
import {
  useGameLoop,
  useHeldKeys,
  useBufferedKeyInput,
  useCountdown,
  randomInt,
  GAME_STYLES,
} from './shared/asciiGameEngine.js'
import GameLayout from './shared/GameLayout.jsx'
import GameInfoPanel from './shared/GameInfoPanel.jsx'
import GameOverlay from './shared/GameOverlay.jsx'

// Key map for buffered input (left/right movement)
const TETRIS_MOVE_KEYS = {
  ArrowLeft: 'LEFT', a: 'LEFT', A: 'LEFT', KeyA: 'LEFT',
  ArrowRight: 'RIGHT', d: 'RIGHT', D: 'RIGHT', KeyD: 'RIGHT',
}

const BOARD_WIDTH = 10
const BOARD_HEIGHT = 20
const INITIAL_DROP_SPEED = 2 // rows per second
const SOFT_DROP_MULTIPLIER = 10
const LINES_PER_LEVEL = 10
const MAX_LEVEL = 10

// Block character for all pieces
const BLOCK_CHAR = '#'

// Tetromino shapes (relative coordinates from center)
const TETROMINOS = {
  I: {
    shape: [[0, -1], [0, 0], [0, 1], [0, 2]],
    char: BLOCK_CHAR,
  },
  O: {
    shape: [[0, 0], [1, 0], [0, 1], [1, 1]],
    char: BLOCK_CHAR,
  },
  T: {
    shape: [[-1, 0], [0, 0], [1, 0], [0, 1]],
    char: BLOCK_CHAR,
  },
  S: {
    shape: [[0, 0], [1, 0], [-1, 1], [0, 1]],
    char: BLOCK_CHAR,
  },
  Z: {
    shape: [[-1, 0], [0, 0], [0, 1], [1, 1]],
    char: BLOCK_CHAR,
  },
  J: {
    shape: [[-1, 0], [0, 0], [1, 0], [1, 1]],
    char: BLOCK_CHAR,
  },
  L: {
    shape: [[-1, 0], [0, 0], [1, 0], [-1, 1]],
    char: BLOCK_CHAR,
  },
}

const TETROMINO_KEYS = Object.keys(TETROMINOS)

// Game configuration for overlay
const GAME_CONFIG = {
  title: 'TETRIS',
  instructions: ['Stack the blocks!'],
  subtitle: 'Clear lines to score',
  lostTitle: 'GAME ENDED',
  lostMessage: 'The blocks reached the top!',
}

// Rotate a piece clockwise
const rotateShape = (shape) => {
  return shape.map(([x, y]) => [-y, x])
}

// Check if position is valid
const isValidPosition = (board, shape, x, y) => {
  return shape.every(([dx, dy]) => {
    const newX = x + dx
    const newY = y + dy
    return (
      newX >= 0 &&
      newX < BOARD_WIDTH &&
      newY < BOARD_HEIGHT &&
      (newY < 0 || !board[newY][newX])
    )
  })
}

// Place piece on board
const placePiece = (board, shape, x, y, char) => {
  const newBoard = board.map(row => [...row])
  shape.forEach(([dx, dy]) => {
    const newX = x + dx
    const newY = y + dy
    if (newY >= 0 && newY < BOARD_HEIGHT && newX >= 0 && newX < BOARD_WIDTH) {
      newBoard[newY][newX] = char
    }
  })
  return newBoard
}

// Clear completed lines
const clearLines = (board) => {
  const newBoard = board.filter(row => row.some(cell => !cell))
  const clearedCount = BOARD_HEIGHT - newBoard.length

  // Add empty rows at top
  while (newBoard.length < BOARD_HEIGHT) {
    newBoard.unshift(Array(BOARD_WIDTH).fill(null))
  }

  return { board: newBoard, clearedCount }
}

/**
 * GameFieldTetris - Classic Tetris with Japanese kanji blocks
 */
export default function GameFieldTetris({ onGameComplete }) {
  const [gameState, setGameState] = useState('ready')
  const [board, setBoard] = useState(() =>
    Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(null))
  )
  const [currentPiece, setCurrentPiece] = useState(null)
  const [pieceX, setPieceX] = useState(4)
  const [pieceY, setPieceY] = useState(-1)
  const [nextPiece, setNextPiece] = useState(null)
  const [score, setScore] = useState(0)
  const [lines, setLines] = useState(0)
  const [level, setLevel] = useState(1)

  const dropAccumulatorRef = useRef(0)
  const moveAccumulatorRef = useRef(0)

  // Board is 10 cells wide + border (2) + next piece area (8) = 20
  // Height is BOARD_HEIGHT (20) + 2 for borders = 22
  const displayWidth = 20
  const displayHeight = 22

  // Generate random piece
  const getRandomPiece = useCallback(() => {
    const key = TETROMINO_KEYS[randomInt(0, TETROMINO_KEYS.length)]
    return { ...TETROMINOS[key], key }
  }, [])

  // Spawn new piece
  const spawnPiece = useCallback(() => {
    const piece = nextPiece || getRandomPiece()
    setCurrentPiece(piece)
    setPieceX(4)
    setPieceY(-1)
    setNextPiece(getRandomPiece())

    // Check game over
    if (!isValidPosition(board, piece.shape, 4, 0)) {
      setGameState('lost')
    }
  }, [board, nextPiece, getRandomPiece])

  // Reset game
  const resetGame = useCallback(() => {
    const emptyBoard = Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(null))
    setBoard(emptyBoard)
    setCurrentPiece(null)
    setNextPiece(getRandomPiece())
    setPieceX(4)
    setPieceY(-1)
    setScore(0)
    setLines(0)
    setLevel(1)
    dropAccumulatorRef.current = 0
    moveAccumulatorRef.current = 0
  }, [getRandomPiece])

  // Actually start playing after countdown
  const beginPlaying = useCallback(() => {
    setGameState('playing')
  }, [])

  // Countdown hook
  const { countdown, startCountdown, isCountingDown } = useCountdown(3, beginPlaying)

  // Start game (triggers countdown)
  const startGame = useCallback(() => {
    resetGame()
    setGameState('countdown')
    startCountdown()
  }, [resetGame, startCountdown])

  // Spawn first piece when game starts
  useEffect(() => {
    if (gameState === 'playing' && !currentPiece) {
      spawnPiece()
    }
  }, [gameState, currentPiece, spawnPiece])

  // Handle rotate and hard drop actions
  const handleRotate = useCallback(() => {
    if (gameState !== 'playing' || !currentPiece) return

    // O piece (square) doesn't need rotation - it looks the same
    if (currentPiece.key === 'O') return

    const rotated = rotateShape(currentPiece.shape)
    // Try rotation, with wall kicks (only horizontal kicks)
    const kicks = [0, -1, 1, -2, 2]
    for (const kick of kicks) {
      if (isValidPosition(board, rotated, pieceX + kick, pieceY)) {
        setCurrentPiece(p => ({ ...p, shape: rotated }))
        setPieceX(pieceX + kick) // Use absolute value, not functional update
        return // Exit after successful rotation
      }
    }
    // If no valid position found, don't rotate
  }, [gameState, currentPiece, board, pieceX, pieceY])

  const handleHardDrop = useCallback(() => {
    if (gameState !== 'playing' || !currentPiece) return

    // Hard drop
    let newY = pieceY
    while (isValidPosition(board, currentPiece.shape, pieceX, newY + 1)) {
      newY++
    }
    setPieceY(newY)
    // Lock immediately
    const newBoard = placePiece(board, currentPiece.shape, pieceX, newY, currentPiece.char)
    const { board: clearedBoard, clearedCount } = clearLines(newBoard)
    setBoard(clearedBoard)

    // 1 point for placing a block
    setScore(s => s + 1)

    if (clearedCount > 0) {
      // 20 points per line cleared
      setScore(s => s + clearedCount * 20)
      setLines(l => {
        const newLines = l + clearedCount
        const newLevel = Math.min(MAX_LEVEL, Math.floor(newLines / LINES_PER_LEVEL) + 1)
        setLevel(newLevel)
        return newLines
      })
    }

    setCurrentPiece(null)
  }, [gameState, currentPiece, board, pieceX, pieceY])

  // Handle single-press actions (rotate, hard drop, start game)
  // Standard actions: 'up' = rotate, 'action' = hard drop
  const handleKeyAction = useCallback((action) => {
    if (action === 'up') {
      handleRotate()
    } else if (action === 'action') {
      if (gameState !== 'playing' && gameState !== 'countdown') {
        startGame()
      } else if (gameState === 'playing') {
        handleHardDrop()
      }
    }
  }, [handleRotate, handleHardDrop, gameState, startGame])

  // Track held keys for continuous movement (down for soft drop)
  // Uses standard actions: down (held), up (rotate), action (hard drop)
  const keysHeldRef = useHeldKeys(['down', 'up', 'action'], { onKeyDown: handleKeyAction })

  // Buffered input for left/right movement - ensures every press is registered
  const { consumeOne: consumeMoveInput, addAction: addMoveAction } = useBufferedKeyInput(TETRIS_MOVE_KEYS, gameState === 'playing')

  // Game loop
  useGameLoop((deltaTime) => {
    if (!currentPiece) {
      spawnPiece()
      return
    }

    // Process buffered movement input - consume all buffered moves for responsive feel
    // We need to track the current position locally to avoid stale state issues
    let currentX = pieceX
    let moveAction = consumeMoveInput()
    while (moveAction) {
      const dir = moveAction === 'LEFT' ? -1 : 1
      if (isValidPosition(board, currentPiece.shape, currentX + dir, pieceY)) {
        currentX += dir
      }
      moveAction = consumeMoveInput()
    }
    // Apply final position if it changed
    if (currentX !== pieceX) {
      setPieceX(currentX)
    }

    // Drop speed increases with level (soft drop when 'down' key held)
    const isSoftDrop = keysHeldRef.current.down
    const dropSpeed = (INITIAL_DROP_SPEED + (level - 1) * 0.5) *
      (isSoftDrop ? SOFT_DROP_MULTIPLIER : 1)

    dropAccumulatorRef.current += deltaTime * dropSpeed / 60

    if (dropAccumulatorRef.current >= 1) {
      dropAccumulatorRef.current = 0

      if (isValidPosition(board, currentPiece.shape, pieceX, pieceY + 1)) {
        setPieceY(y => y + 1)
      } else {
        // Lock piece
        const newBoard = placePiece(board, currentPiece.shape, pieceX, pieceY, currentPiece.char)
        const { board: clearedBoard, clearedCount } = clearLines(newBoard)
        setBoard(clearedBoard)

        // 1 point for placing a block
        setScore(s => s + 1)

        if (clearedCount > 0) {
          // 20 points per line cleared
          setScore(s => s + clearedCount * 20)
          setLines(l => {
            const newLines = l + clearedCount
            const newLevel = Math.min(MAX_LEVEL, Math.floor(newLines / LINES_PER_LEVEL) + 1)
            setLevel(newLevel)
            return newLines
          })
        }

        setCurrentPiece(null)
      }
    }
  }, gameState === 'playing')

  // Render game as ASCII string
  const renderGame = () => {
    const rows = []
    const EMPTY = ' '
    const GHOST = ':'

    // Create a display board that includes current piece
    const displayBoard = board.map(row => [...row])

    // Add current piece to display
    if (currentPiece) {
      currentPiece.shape.forEach(([dx, dy]) => {
        const x = pieceX + dx
        const y = pieceY + dy
        if (y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH) {
          displayBoard[y][x] = currentPiece.char
        }
      })
    }

    // Calculate ghost piece position
    let ghostY = pieceY
    if (currentPiece) {
      while (isValidPosition(board, currentPiece.shape, pieceX, ghostY + 1)) {
        ghostY++
      }
    }

    // Top border with NEXT label
    rows.push('+' + '-'.repeat(BOARD_WIDTH) + '+ NEXT')

    // Board rows with next piece preview on the side
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      let rowStr = '|'

      for (let x = 0; x < BOARD_WIDTH; x++) {
        const cell = displayBoard[y][x]
        if (cell) {
          rowStr += cell
        } else {
          // Check if this is a ghost piece position
          let isGhost = false
          if (currentPiece && ghostY > pieceY) {
            for (const [dx, dy] of currentPiece.shape) {
              if (pieceX + dx === x && ghostY + dy === y) {
                isGhost = true
                break
              }
            }
          }
          rowStr += isGhost ? GHOST : EMPTY
        }
      }

      // Add border and next piece preview on rows 1-5
      rowStr += '|'
      if (nextPiece && y >= 1 && y <= 5) {
        const previewY = y - 2 // Center the piece vertically
        let previewStr = ' '
        for (let px = -2; px <= 2; px++) {
          let found = false
          for (const [dx, dy] of nextPiece.shape) {
            if (dx === px && dy === previewY) {
              previewStr += nextPiece.char
              found = true
              break
            }
          }
          if (!found) {
            previewStr += ' '
          }
        }
        rowStr += previewStr
      }

      rows.push(rowStr)
    }

    // Bottom border
    rows.push('+' + '-'.repeat(BOARD_WIDTH) + '+')

    return rows.join('\n')
  }

  const handleClick = useCallback(() => {
    if (gameState !== 'playing' && gameState !== 'countdown') {
      startGame()
    }
  }, [gameState, startGame])

  // Info Panel component
  const InfoPanel = useCallback(() => (
    <GameInfoPanel items={[
      { label: 'SCORE', value: score },
      { label: 'LINES', value: lines },
      { label: 'TOKENS', value: 100 },
    ]} />
  ), [score, lines])

  // Mobile Controls component - Tetris has custom controls (left/right/down d-pad, ROT/DROP buttons)
  const MobileControls = useCallback(() => (
    <div style={GAME_STYLES.gamepad}>
      {/* D-Pad (Left) */}
      <div style={GAME_STYLES.dpad}>
        <div />
        <div />
        <div />
        <button
          style={GAME_STYLES.dpadButton}
          onTouchStart={(e) => { e.preventDefault(); addMoveAction('LEFT') }}
        >◀</button>
        <div style={GAME_STYLES.dpadCenter} />
        <button
          style={GAME_STYLES.dpadButton}
          onTouchStart={(e) => { e.preventDefault(); addMoveAction('RIGHT') }}
        >▶</button>
        <div />
        <button
          style={GAME_STYLES.dpadButton}
          onTouchStart={(e) => { e.preventDefault(); keysHeldRef.current.down = true }}
          onTouchEnd={(e) => { e.preventDefault(); keysHeldRef.current.down = false }}
          onTouchCancel={(e) => { e.preventDefault(); keysHeldRef.current.down = false }}
        >▼</button>
        <div />
      </div>

      {/* Action Buttons (Right) */}
      <div style={GAME_STYLES.actionButtons}>
        <div style={GAME_STYLES.actionButtonRow}>
          <button
            style={GAME_STYLES.actionButton}
            onTouchStart={(e) => { e.preventDefault(); handleRotate() }}
          >ROT</button>
        </div>
        <div style={GAME_STYLES.actionButtonRow}>
          <button
            style={GAME_STYLES.actionButton}
            onTouchStart={(e) => { e.preventDefault(); handleHardDrop() }}
          >DROP</button>
        </div>
      </div>
    </div>
  ), [addMoveAction, handleRotate, handleHardDrop])

  // Get overlay config for lost state
  const getOverlayConfig = useCallback(() => {
    if (gameState !== 'lost') return GAME_CONFIG
    return {
      ...GAME_CONFIG,
      lostStats: [
        { label: 'Score', value: score },
        { label: 'Level', value: `${level} | Lines: ${lines}` },
      ],
    }
  }, [gameState, score, level, lines])

  return (
    <GameLayout
      gameWidth={displayWidth}
      gameHeight={displayHeight}
      renderGame={renderGame}
      InfoPanel={InfoPanel}
      MobileControls={MobileControls}
      onFieldClick={handleClick}
      overlayContent={<GameOverlay gameState={gameState} countdown={countdown} gameConfig={getOverlayConfig()} />}
    />
  )
}
