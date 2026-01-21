import { useState, useEffect, useRef, useCallback } from 'preact/hooks'
import {
  useGameLoop,
  useHeldKeys,
  useBufferedKeyInput,
  useCountdown,
  useIsMobile,
  randomInt,
  GAME_STYLES,
} from './shared/asciiGameEngine.js'
import PixelCanvas from './shared/PixelCanvas.jsx'

// Key map for buffered input (left/right movement)
const TETRIS_MOVE_KEYS = {
  ArrowLeft: 'LEFT', a: 'LEFT', A: 'LEFT', KeyA: 'LEFT',
  ArrowRight: 'RIGHT', d: 'RIGHT', D: 'RIGHT', KeyD: 'RIGHT',
}

const BOARD_WIDTH = 10
const BOARD_HEIGHT = 20
const CELL_SIZE = 8
const INITIAL_DROP_SPEED = 2 // rows per second
const SOFT_DROP_MULTIPLIER = 10
const LINES_PER_LEVEL = 10
const MAX_LEVEL = 10

// Border thickness in pixels (half a cell)
const BORDER_THICKNESS = Math.floor(CELL_SIZE / 2) // 4 pixels for 8px cells

// Display dimensions - add 1 cell for borders (0.5 cell top + 0.5 cell bottom = 1 cell)
const PREVIEW_WIDTH = 5
const DISPLAY_WIDTH = BOARD_WIDTH + 1 + PREVIEW_WIDTH // board + border + preview area
const DISPLAY_HEIGHT = BOARD_HEIGHT + 1 // board + border space (top + bottom)

// Colors for pixel graphics (using CSS custom properties)
const COLORS = {
  background: '#000000',
  border: 'var(--color-primary-darker, #1a4a1a)',
  ghost: 'var(--color-primary-darker, #1a4a1a)',
  block: 'var(--color-primary, #00ff00)',
  blockLight: 'var(--color-primary-light, #66ff66)',
  blockDark: 'var(--color-primary-dark, #00cc00)',
}

// Pixel art patterns for tetrominoes (8x8)
const BLOCK_PATTERN = [
  [1,1,1,1,1,1,1,0],
  [1,1,1,1,1,1,0,0],
  [1,1,1,1,1,0,0,0],
  [1,1,1,1,1,0,0,0],
  [1,1,1,1,1,0,0,0],
  [1,1,0,0,0,0,0,0],
  [1,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
]

const GHOST_PATTERN = [
  [0,1,1,1,1,1,1,0],
  [1,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,1],
  [0,1,1,1,1,1,1,0],
]

// Small block pattern for preview (4x4 scaled to fit)
const SMALL_BLOCK_PATTERN = [
  [1,1,1,1,1,1,0,0],
  [1,1,1,1,1,0,0,0],
  [1,1,1,1,0,0,0,0],
  [1,1,1,0,0,0,0,0],
  [1,1,0,0,0,0,0,0],
  [1,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0],
]

// Tetromino shapes (relative coordinates from center)
const TETROMINOS = {
  I: { shape: [[0, -1], [0, 0], [0, 1], [0, 2]] },
  O: { shape: [[0, 0], [1, 0], [0, 1], [1, 1]] },
  T: { shape: [[-1, 0], [0, 0], [1, 0], [0, 1]] },
  S: { shape: [[0, 0], [1, 0], [-1, 1], [0, 1]] },
  Z: { shape: [[-1, 0], [0, 0], [0, 1], [1, 1]] },
  J: { shape: [[-1, 0], [0, 0], [1, 0], [1, 1]] },
  L: { shape: [[-1, 0], [0, 0], [1, 0], [-1, 1]] },
}

const TETROMINO_KEYS = Object.keys(TETROMINOS)

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
const placePiece = (board, shape, x, y) => {
  const newBoard = board.map(row => [...row])
  shape.forEach(([dx, dy]) => {
    const newX = x + dx
    const newY = y + dy
    if (newY >= 0 && newY < BOARD_HEIGHT && newX >= 0 && newX < BOARD_WIDTH) {
      newBoard[newY][newX] = true
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
 * GameFieldTetrisPixel - Classic Tetris with pixel graphics
 */
export default function GameFieldTetrisPixel({ onGameComplete }) {
  const [gameState, setGameState] = useState('ready')
  const [board, setBoard] = useState(() =>
    Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(null))
  )
  const [currentPiece, setCurrentPiece] = useState(null)
  const [pieceX, setPieceX] = useState(4)
  const [pieceY, setPieceY] = useState(-1)
  const [nextPieces, setNextPieces] = useState([]) // Queue of next 3 pieces
  const [score, setScore] = useState(0)
  const [lines, setLines] = useState(0)
  const [level, setLevel] = useState(1)

  const dropAccumulatorRef = useRef(0)

  // Check if on mobile device
  const isMobile = useIsMobile()

  // Generate random piece
  const getRandomPiece = useCallback(() => {
    const key = TETROMINO_KEYS[randomInt(0, TETROMINO_KEYS.length)]
    return { ...TETROMINOS[key], key }
  }, [])

  // Spawn new piece from queue
  const spawnPiece = useCallback(() => {
    // Get piece from front of queue
    const piece = nextPieces[0] || getRandomPiece()
    setCurrentPiece(piece)
    setPieceX(4)
    setPieceY(-1)

    // Shift queue and add new piece at the end
    setNextPieces(prev => {
      const newQueue = prev.length > 0 ? prev.slice(1) : []
      while (newQueue.length < 3) {
        newQueue.push(getRandomPiece())
      }
      return newQueue
    })

    // Check game over
    if (!isValidPosition(board, piece.shape, 4, 0)) {
      setGameState('lost')
    }
  }, [board, nextPieces, getRandomPiece])

  // Reset game
  const resetGame = useCallback(() => {
    const emptyBoard = Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(null))
    setBoard(emptyBoard)
    setCurrentPiece(null)
    // Initialize queue with 3 pieces
    setNextPieces([getRandomPiece(), getRandomPiece(), getRandomPiece()])
    setPieceX(4)
    setPieceY(-1)
    setScore(0)
    setLines(0)
    setLevel(1)
    dropAccumulatorRef.current = 0
  }, [getRandomPiece])

  // Actually start playing after countdown
  const beginPlaying = useCallback(() => {
    setGameState('playing')
  }, [])

  // Countdown hook
  const { countdown, startCountdown } = useCountdown(3, beginPlaying)

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
        setPieceX(pieceX + kick)
        return
      }
    }
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
    const newBoard = placePiece(board, currentPiece.shape, pieceX, newY)
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
  const keysHeldRef = useHeldKeys(['down', 'up', 'action'], { onKeyDown: handleKeyAction })

  // Buffered input for left/right movement
  const { consumeOne: consumeMoveInput, addAction: addMoveAction } = useBufferedKeyInput(TETRIS_MOVE_KEYS, gameState === 'playing')

  // Game loop
  useGameLoop((deltaTime) => {
    if (!currentPiece) {
      spawnPiece()
      return
    }

    // Process buffered movement input
    let currentX = pieceX
    let moveAction = consumeMoveInput()
    while (moveAction) {
      const dir = moveAction === 'LEFT' ? -1 : 1
      if (isValidPosition(board, currentPiece.shape, currentX + dir, pieceY)) {
        currentX += dir
      }
      moveAction = consumeMoveInput()
    }
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
        const newBoard = placePiece(board, currentPiece.shape, pieceX, pieceY)
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

  // Render callback for PixelCanvas
  const handleRender = useCallback((ctx, helpers) => {
    const ctx2d = helpers.getContext()

    // Helper to draw a pattern with pixel offset for border
    const drawBlockAt = (pattern, gridX, gridY, color) => {
      const pixelX = BORDER_THICKNESS + gridX * CELL_SIZE
      const pixelY = BORDER_THICKNESS + gridY * CELL_SIZE
      helpers.setFillStyle(color)
      for (let py = 0; py < pattern.length; py++) {
        for (let px = 0; px < (pattern[0]?.length || 0); px++) {
          if (pattern[py][px]) {
            ctx2d.fillRect(pixelX + px, pixelY + py, 1, 1)
          }
        }
      }
    }

    // Draw thin borders around the board area
    // Top border
    helpers.setFillStyle(COLORS.border)
    ctx2d.fillRect(0, 0, (BOARD_WIDTH + 1) * CELL_SIZE, BORDER_THICKNESS)
    // Bottom border
    ctx2d.fillRect(0, BORDER_THICKNESS + BOARD_HEIGHT * CELL_SIZE, (BOARD_WIDTH + 1) * CELL_SIZE, BORDER_THICKNESS)
    // Left border
    ctx2d.fillRect(0, 0, BORDER_THICKNESS, DISPLAY_HEIGHT * CELL_SIZE)
    // Right border (at board edge, separating from preview)
    ctx2d.fillRect(BORDER_THICKNESS + BOARD_WIDTH * CELL_SIZE, 0, BORDER_THICKNESS, DISPLAY_HEIGHT * CELL_SIZE)

    // Draw board cells (offset by border thickness)
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        const cell = board[y][x]
        if (cell) {
          drawBlockAt(BLOCK_PATTERN, x, y, COLORS.block)
        }
      }
    }

    // Calculate ghost piece position
    let ghostY = pieceY
    if (currentPiece) {
      while (isValidPosition(board, currentPiece.shape, pieceX, ghostY + 1)) {
        ghostY++
      }

      // Draw ghost piece
      if (ghostY > pieceY) {
        currentPiece.shape.forEach(([dx, dy]) => {
          const x = pieceX + dx
          const y = ghostY + dy
          if (y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH) {
            drawBlockAt(GHOST_PATTERN, x, y, COLORS.ghost)
          }
        })
      }

      // Draw current piece
      currentPiece.shape.forEach(([dx, dy]) => {
        const x = pieceX + dx
        const y = pieceY + dy
        if (y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH) {
          drawBlockAt(BLOCK_PATTERN, x, y, COLORS.blockLight)
        }
      })
    }

    // Draw next 3 pieces preview (stacked vertically, in the preview area)
    // Preview area starts after the board + right border
    const previewStartX = BOARD_WIDTH + 1
    nextPieces.forEach((piece, index) => {
      if (!piece) return
      const previewCenterX = previewStartX + 2
      const previewCenterY = 1 + index * 5 // Stack with 5 cells spacing
      piece.shape.forEach(([dx, dy]) => {
        helpers.drawPattern(SMALL_BLOCK_PATTERN, previewCenterX + dx, previewCenterY + dy, COLORS.blockDark)
      })
    })
  }, [board, currentPiece, pieceX, pieceY, nextPieces])

  const handleClick = useCallback(() => {
    if (gameState !== 'playing' && gameState !== 'countdown') {
      startGame()
    }
  }, [gameState, startGame])

  // Info Panel component
  const InfoPanel = () => (
    <div style={GAME_STYLES.infoPanelMobile}>
      <div style={GAME_STYLES.infoPanelMobileItem}>
        <span style={GAME_STYLES.infoPanelLabel}>SCORE</span>
        <span style={GAME_STYLES.infoPanelValue}>{score}</span>
      </div>
      <div style={GAME_STYLES.infoPanelMobileItem}>
        <span style={GAME_STYLES.infoPanelLabel}>LINES</span>
        <span style={GAME_STYLES.infoPanelValue}>{lines}</span>
      </div>
      <div style={GAME_STYLES.infoPanelMobileItem}>
        <span style={GAME_STYLES.infoPanelLabel}>LEVEL</span>
        <span style={GAME_STYLES.infoPanelValue}>{level}</span>
      </div>
      <div style={GAME_STYLES.infoPanelMobileItem}>
        <span style={GAME_STYLES.infoPanelLabel}>TOKENS</span>
        <span style={GAME_STYLES.infoPanelValue}>100</span>
      </div>
    </div>
  )

  // Mobile Controls component
  const MobileControls = () => (
    <div style={GAME_STYLES.gamepad}>
      {/* D-Pad (Left) */}
      <div style={GAME_STYLES.dpad}>
        <div /> {/* Empty top-left */}
        <div /> {/* Empty top - no up needed */}
        <div /> {/* Empty top-right */}
        <button
          style={GAME_STYLES.dpadButton}
          onTouchStart={(e) => { e.preventDefault(); addMoveAction('LEFT') }}
        >◀</button>
        <div style={GAME_STYLES.dpadCenter} /> {/* Center */}
        <button
          style={GAME_STYLES.dpadButton}
          onTouchStart={(e) => { e.preventDefault(); addMoveAction('RIGHT') }}
        >▶</button>
        <div /> {/* Empty bottom-left */}
        <button
          style={GAME_STYLES.dpadButton}
          onTouchStart={(e) => { e.preventDefault(); keysHeldRef.current.down = true }}
          onTouchEnd={(e) => { e.preventDefault(); keysHeldRef.current.down = false }}
          onTouchCancel={(e) => { e.preventDefault(); keysHeldRef.current.down = false }}
        >▼</button>
        <div /> {/* Empty bottom-right */}
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
  )

  // Overlay content for different game states
  const getOverlayContent = () => {
    if (gameState === 'playing') return null

    if (gameState === 'countdown') {
      return (
        <div style={{ fontSize: '48px', color: 'var(--color-primary)' }}>
          {countdown}
        </div>
      )
    }

    if (gameState === 'ready') {
      return (
        <>
          <div style={{ fontSize: '20px', marginBottom: '10px' }}>TETRIS PIXEL</div>
          <div style={{ marginBottom: '5px' }}>Stack the blocks!</div>
          <div style={{ marginBottom: '15px', fontSize: '12px' }}>Clear lines to score</div>
          <div style={{ color: 'var(--color-primary)' }}>
            [SPACE] to START
          </div>
        </>
      )
    }

    if (gameState === 'lost') {
      return (
        <>
          <div style={{ fontSize: '24px', marginBottom: '10px', color: 'var(--color-primary)' }}>
            GAME ENDED
          </div>
          <div style={{ marginBottom: '5px' }}>Score: {score}</div>
          <div style={{ marginBottom: '5px' }}>Level: {level} | Lines: {lines}</div>
          <div style={{ marginBottom: '15px' }}>The blocks reached the top!</div>
          <div style={{ color: 'var(--color-primary)' }}>
            [SPACE] or [CLICK] to TRY AGAIN
          </div>
        </>
      )
    }

    return null
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        width: '100%',
        height: '100%',
      }}
    >
      <InfoPanel />
      <PixelCanvas
        gridWidth={DISPLAY_WIDTH}
        gridHeight={DISPLAY_HEIGHT}
        cellSize={CELL_SIZE}
        backgroundColor={COLORS.background}
        onRender={handleRender}
        onClick={handleClick}
        renderDeps={[board, currentPiece, pieceX, pieceY, nextPieces]}
        overlay={getOverlayContent()}
      />
      {isMobile && <MobileControls />}
    </div>
  )
}
