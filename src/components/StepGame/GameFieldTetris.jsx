import { useState, useEffect, useRef, useCallback } from 'preact/hooks'
import {
  useGameLoop,
  useKeyInput,
  useResponsiveFontSize,
  useIsMobile,
  randomInt,
  GAME_STYLES,
} from './lib/asciiGameEngine.js'

const BOARD_WIDTH = 10
const BOARD_HEIGHT = 20
const INITIAL_DROP_SPEED = 2 // rows per second
const SOFT_DROP_MULTIPLIER = 10
const LINES_PER_LEVEL = 10
const MAX_LEVEL = 10

// Tetromino shapes (relative coordinates from center)
// Using Japanese kanji for visual appeal - each kanji renders as 2 character widths
const TETROMINOS = {
  I: {
    shape: [[0, -1], [0, 0], [0, 1], [0, 2]],
    char: '水', // Water - I piece
  },
  O: {
    shape: [[0, 0], [1, 0], [0, 1], [1, 1]],
    char: '金', // Gold - O piece
  },
  T: {
    shape: [[-1, 0], [0, 0], [1, 0], [0, 1]],
    char: '花', // Flower - T piece
  },
  S: {
    shape: [[0, 0], [1, 0], [-1, 1], [0, 1]],
    char: '草', // Grass - S piece
  },
  Z: {
    shape: [[-1, 0], [0, 0], [0, 1], [1, 1]],
    char: '火', // Fire - Z piece
  },
  J: {
    shape: [[-1, 0], [0, 0], [1, 0], [1, 1]],
    char: '風', // Wind - J piece
  },
  L: {
    shape: [[-1, 0], [0, 0], [1, 0], [-1, 1]],
    char: '土', // Earth - L piece
  },
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

  const containerRef = useRef(null)
  const dropAccumulatorRef = useRef(0)
  const softDropRef = useRef(false)
  const keysHeldRef = useRef({ left: false, right: false })
  const moveAccumulatorRef = useRef(0)

  // Check if on mobile device
  const isMobile = useIsMobile()

  // Calculate responsive font size based on container
  // Each kanji is 2 chars wide, board is 10 cells = 20 chars + 10 for next piece area
  const displayWidth = BOARD_WIDTH * 2 + 10
  const displayHeight = BOARD_HEIGHT + 1
  const fontSize = useResponsiveFontSize(containerRef, displayWidth, displayHeight)

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
    softDropRef.current = false
    keysHeldRef.current = { left: false, right: false }
    moveAccumulatorRef.current = 0
  }, [getRandomPiece])

  // Start game
  const startGame = useCallback(() => {
    resetGame()
    setGameState('playing')
  }, [resetGame])

  // Spawn first piece when game starts
  useEffect(() => {
    if (gameState === 'playing' && !currentPiece) {
      spawnPiece()
    }
  }, [gameState, currentPiece, spawnPiece])

  // Handle input
  const handleKeyDown = useCallback((action) => {
    if (gameState !== 'playing') {
      if (action === 'START') {
        startGame()
      }
      return
    }

    if (!currentPiece) return

    if (action === 'LEFT') {
      keysHeldRef.current.left = true
      if (isValidPosition(board, currentPiece.shape, pieceX - 1, pieceY)) {
        setPieceX(x => x - 1)
      }
    }
    if (action === 'RIGHT') {
      keysHeldRef.current.right = true
      if (isValidPosition(board, currentPiece.shape, pieceX + 1, pieceY)) {
        setPieceX(x => x + 1)
      }
    }
    if (action === 'DOWN') {
      softDropRef.current = true
    }
    if (action === 'ROTATE') {
      const rotated = rotateShape(currentPiece.shape)
      // Try rotation, with wall kicks
      const kicks = [0, -1, 1, -2, 2]
      for (const kick of kicks) {
        if (isValidPosition(board, rotated, pieceX + kick, pieceY)) {
          setCurrentPiece(p => ({ ...p, shape: rotated }))
          setPieceX(x => x + kick)
          break
        }
      }
    }
    if (action === 'DROP') {
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

      if (clearedCount > 0) {
        const lineScore = [0, 100, 300, 500, 800][clearedCount] * level
        setScore(s => s + lineScore)
        setLines(l => {
          const newLines = l + clearedCount
          const newLevel = Math.min(MAX_LEVEL, Math.floor(newLines / LINES_PER_LEVEL) + 1)
          setLevel(newLevel)
          return newLines
        })
      }

      setCurrentPiece(null)
    }
  }, [gameState, currentPiece, board, pieceX, pieceY, startGame, level])

  // Track key releases
  useEffect(() => {
    if (gameState !== 'playing') return

    const handleKeyUp = (e) => {
      if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        keysHeldRef.current.left = false
      }
      if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        keysHeldRef.current.right = false
      }
      if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        softDropRef.current = false
      }
    }

    window.addEventListener('keyup', handleKeyUp)
    return () => window.removeEventListener('keyup', handleKeyUp)
  }, [gameState])

  const keyMap = {
    ArrowLeft: 'LEFT', a: 'LEFT', A: 'LEFT',
    ArrowRight: 'RIGHT', d: 'RIGHT', D: 'RIGHT',
    ArrowDown: 'DOWN', s: 'DOWN', S: 'DOWN',
    ArrowUp: 'ROTATE', w: 'ROTATE', W: 'ROTATE',
    Space: 'DROP',
  }

  useKeyInput(keyMap, handleKeyDown, true)

  // Game loop
  useGameLoop((deltaTime) => {
    if (!currentPiece) {
      spawnPiece()
      return
    }

    // Auto-repeat movement
    if (keysHeldRef.current.left || keysHeldRef.current.right) {
      moveAccumulatorRef.current += deltaTime
      if (moveAccumulatorRef.current >= 8) {
        moveAccumulatorRef.current = 0
        const dir = keysHeldRef.current.left ? -1 : 1
        if (isValidPosition(board, currentPiece.shape, pieceX + dir, pieceY)) {
          setPieceX(x => x + dir)
        }
      }
    }

    // Drop speed increases with level
    const dropSpeed = (INITIAL_DROP_SPEED + (level - 1) * 0.5) *
      (softDropRef.current ? SOFT_DROP_MULTIPLIER : 1)

    dropAccumulatorRef.current += deltaTime * dropSpeed / 60

    if (dropAccumulatorRef.current >= 1) {
      dropAccumulatorRef.current = 0

      if (isValidPosition(board, currentPiece.shape, pieceX, pieceY + 1)) {
        setPieceY(y => y + 1)
        if (softDropRef.current) {
          setScore(s => s + 1)
        }
      } else {
        // Lock piece
        const newBoard = placePiece(board, currentPiece.shape, pieceX, pieceY, currentPiece.char)
        const { board: clearedBoard, clearedCount } = clearLines(newBoard)
        setBoard(clearedBoard)

        if (clearedCount > 0) {
          const lineScore = [0, 100, 300, 500, 800][clearedCount] * level
          setScore(s => s + lineScore)
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

  // Render game as a string
  // Each kanji takes 2 visual character cells, so we use full-width space for empty cells
  const renderGame = () => {
    const rows = []
    const EMPTY = '　' // Full-width space to match kanji width
    const GHOST = '囗' // Ghost piece indicator (empty box kanji)

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

    // Header row with NEXT label
    rows.push(EMPTY.repeat(BOARD_WIDTH) + '│ NEXT')

    // Board rows with next piece preview on the side
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      let rowStr = ''

      for (let x = 0; x < BOARD_WIDTH; x++) {
        const cell = displayBoard[y][x]
        if (cell) {
          rowStr += cell // Kanji takes 2 visual cells
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
      rowStr += '│'
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
            previewStr += EMPTY
          }
        }
        rowStr += previewStr
      }

      rows.push(rowStr)
    }

    return rows.join('\n')
  }

  const handleClick = useCallback(() => {
    if (gameState !== 'playing') {
      startGame()
    }
  }, [gameState, startGame])

  // Dynamic field style with calculated font size
  const fieldStyle = {
    ...GAME_STYLES.field,
    fontSize: `${fontSize}px`,
  }

  return (
    <div ref={containerRef} onClick={handleClick} style={GAME_STYLES.container}>
      {/* Header */}
      <div style={{ ...GAME_STYLES.header, fontSize: '1.05rem' }}>
        <span>SCORE: {score}</span>
        <span>LEVEL: {level} | LINES: {lines}</span>
      </div>

      {/* Game Field with Instructions on the right */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
        <div style={fieldStyle}>
          {renderGame()}

          {/* Overlay for game states */}
          {gameState !== 'playing' && (
            <div style={GAME_STYLES.overlay}>
              {gameState === 'ready' && (
                <>
                  <div style={{ fontSize: '20px', marginBottom: '10px' }}>KANJI TETRIS</div>
                  <div style={{ marginBottom: '5px' }}>Stack the kanji blocks!</div>
                  <div style={{ marginBottom: '15px', fontSize: '12px' }}>Clear lines to score</div>
                  <div style={{ color: 'var(--color-primary)' }}>
                    [SPACE] to START
                  </div>
                </>
              )}
              {gameState === 'lost' && (
                <>
                  <div style={{ fontSize: '24px', marginBottom: '10px', color: '#ff6b6b' }}>
                    GAME OVER
                  </div>
                  <div style={{ marginBottom: '5px' }}>Score: {score}</div>
                  <div style={{ marginBottom: '5px' }}>Level: {level} | Lines: {lines}</div>
                  <div style={{ marginBottom: '15px' }}>The blocks reached the top!</div>
                  <div style={{ color: 'var(--color-primary)' }}>
                    [SPACE] or [CLICK] to TRY AGAIN
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Instructions - hidden on mobile */}
        {!isMobile && (
          <div style={{
            ...GAME_STYLES.instructions,
            marginTop: 0,
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            whiteSpace: 'nowrap',
          }}>
            <div>ARROWS/WASD:</div>
            <div>Move & Rotate</div>
            <div style={{ marginTop: '8px' }}>SPACE:</div>
            <div>Hard Drop</div>
            <div style={{ marginTop: '8px' }}>DOWN:</div>
            <div>Soft Drop</div>
          </div>
        )}
      </div>

      {/* Mobile Controls - only shown on touch devices */}
      {isMobile && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          maxWidth: '320px',
          marginTop: '10px',
          gap: '8px',
        }}>
          {/* Left side: Left + Rotate */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              style={{ ...GAME_STYLES.mobileButton, width: '44px', height: '44px', fontSize: '18px' }}
              onTouchStart={(e) => { e.preventDefault(); keysHeldRef.current.left = true; handleKeyDown('LEFT') }}
              onTouchEnd={(e) => { e.preventDefault(); keysHeldRef.current.left = false }}
              onTouchCancel={(e) => { e.preventDefault(); keysHeldRef.current.left = false }}
              onClick={() => handleKeyDown('LEFT')}
            >◀</button>
            <button
              style={{ ...GAME_STYLES.mobileButton, width: '44px', height: '44px', fontSize: '16px' }}
              onTouchStart={(e) => { e.preventDefault(); handleKeyDown('ROTATE') }}
              onClick={() => handleKeyDown('ROTATE')}
            >↻</button>
          </div>

          {/* Center: Down + Drop */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
            <button
              style={{ ...GAME_STYLES.mobileButton, width: '60px', height: '36px', fontSize: '12px' }}
              onTouchStart={(e) => { e.preventDefault(); handleKeyDown('DROP') }}
              onClick={() => handleKeyDown('DROP')}
            >DROP</button>
            <button
              style={{ ...GAME_STYLES.mobileButton, width: '44px', height: '44px', fontSize: '18px' }}
              onTouchStart={(e) => { e.preventDefault(); softDropRef.current = true }}
              onTouchEnd={(e) => { e.preventDefault(); softDropRef.current = false }}
              onTouchCancel={(e) => { e.preventDefault(); softDropRef.current = false }}
              onClick={() => handleKeyDown('DOWN')}
            >▼</button>
          </div>

          {/* Right side: Right */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              style={{ ...GAME_STYLES.mobileButton, width: '44px', height: '44px', fontSize: '18px' }}
              onTouchStart={(e) => { e.preventDefault(); keysHeldRef.current.right = true; handleKeyDown('RIGHT') }}
              onTouchEnd={(e) => { e.preventDefault(); keysHeldRef.current.right = false }}
              onTouchCancel={(e) => { e.preventDefault(); keysHeldRef.current.right = false }}
              onClick={() => handleKeyDown('RIGHT')}
            >▶</button>
          </div>
        </div>
      )}
    </div>
  )
}
