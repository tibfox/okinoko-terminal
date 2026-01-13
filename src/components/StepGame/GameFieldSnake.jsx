import { useState, useEffect, useRef, useCallback } from 'preact/hooks'
import {
  useGameLoop,
  useKeyInput,
  useResponsiveFontSize,
  useIsMobile,
  createGrid,
  drawChar,
  renderGrid,
  randomInt,
  KEY_MAPS,
  DIRECTIONS,
  GAME_STYLES,
} from './lib/asciiGameEngine.js'

// Square playing field (adjusted for char aspect ratio ~2:1)
const GAME_WIDTH = 40
const GAME_HEIGHT = 20
const INITIAL_SPEED = 8 // Moves per second
const SPEED_INCREMENT = 0.5
const MAX_SPEED = 20
const WIN_LENGTH = 30
const VERTICAL_SPEED_FACTOR = 0.6 // Slow down vertical movement to match visual speed

// Japanese food items as collectibles (single-width ASCII characters)
const FOOD_CHARS = ['*', '#', '+', '$', '%', '&']

// Snake body characters
const SNAKE_HEAD = '@'
const SNAKE_BODY = 'o'
const SNAKE_TAIL = '~'

/**
 * GameFieldSnake - Classic Snake game with Japanese theme
 * Collect treats to grow! Hit a wall and it's game over.
 */
export default function GameFieldSnake({ onGameComplete }) {
  const [gameState, setGameState] = useState('ready') // ready, playing, won, lost
  const [snake, setSnake] = useState([{ x: 15, y: 10 }])
  const [direction, setDirection] = useState(DIRECTIONS.RIGHT)
  const [nextDirection, setNextDirection] = useState(DIRECTIONS.RIGHT)
  const [food, setFood] = useState({ x: 25, y: 10, char: '*' })
  const [score, setScore] = useState(0)
  const [speed, setSpeed] = useState(INITIAL_SPEED)

  const containerRef = useRef(null)
  const moveAccumulatorRef = useRef(0)

  // Check if on mobile device
  const isMobile = useIsMobile()

  // Calculate responsive font size based on container
  const fontSize = useResponsiveFontSize(containerRef, GAME_WIDTH, GAME_HEIGHT)

  // Spawn food at random position not on snake and not on borders
  const spawnFood = useCallback((currentSnake) => {
    let newX, newY
    let attempts = 0
    do {
      newX = randomInt(2, GAME_WIDTH - 2)
      newY = randomInt(2, GAME_HEIGHT - 2)
      attempts++
    } while (
      attempts < 100 &&
      currentSnake.some(seg => seg.x === newX && seg.y === newY)
    )

    return {
      x: newX,
      y: newY,
      char: FOOD_CHARS[randomInt(0, FOOD_CHARS.length)],
    }
  }, [])

  // Reset game state
  const resetGame = useCallback(() => {
    const initialSnake = [{ x: 15, y: 10 }]
    setSnake(initialSnake)
    setDirection(DIRECTIONS.RIGHT)
    setNextDirection(DIRECTIONS.RIGHT)
    setFood(spawnFood(initialSnake))
    setScore(0)
    setSpeed(INITIAL_SPEED)
    moveAccumulatorRef.current = 0
  }, [spawnFood])

  // Start the game
  const startGame = useCallback(() => {
    resetGame()
    setGameState('playing')
  }, [resetGame])

  // Handle direction input
  const handleInput = useCallback((action) => {
    if (gameState !== 'playing') {
      if (gameState === 'ready' || gameState === 'won' || gameState === 'lost') {
        startGame()
      }
      return
    }

    const newDir = DIRECTIONS[action]
    if (!newDir) return

    // Prevent 180-degree turns
    setDirection(currentDir => {
      if (newDir.x !== 0 && currentDir.x !== 0) return currentDir
      if (newDir.y !== 0 && currentDir.y !== 0) return currentDir
      setNextDirection(newDir)
      return currentDir
    })
  }, [gameState, startGame])

  useKeyInput(KEY_MAPS.ARROWS_AND_WASD, handleInput, true)

  // Game loop
  useGameLoop((deltaTime) => {
    // Accumulate time for movement
    // Apply vertical speed factor when moving up/down to match visual speed
    const isVertical = nextDirection.y !== 0
    const speedMultiplier = isVertical ? VERTICAL_SPEED_FACTOR : 1
    moveAccumulatorRef.current += deltaTime * speed * speedMultiplier / 60

    if (moveAccumulatorRef.current < 1) return
    moveAccumulatorRef.current = 0

    // Apply queued direction change
    setDirection(nextDirection)

    setSnake(prevSnake => {
      const head = prevSnake[0]
      const newHead = {
        x: head.x + nextDirection.x,
        y: head.y + nextDirection.y,
      }

      // Check wall collision (old-school snake - hitting wall = game over)
      if (newHead.x <= 0 || newHead.x >= GAME_WIDTH - 1 ||
          newHead.y <= 0 || newHead.y >= GAME_HEIGHT - 1) {
        setGameState('lost')
        return prevSnake
      }

      // Check self-collision
      if (prevSnake.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
        setGameState('lost')
        return prevSnake
      }

      // Check food collision
      const ateFood = newHead.x === food.x && newHead.y === food.y

      let newSnake
      if (ateFood) {
        newSnake = [newHead, ...prevSnake]
        setScore(s => s + 100)
        setSpeed(s => Math.min(MAX_SPEED, s + SPEED_INCREMENT))

        // Check win condition
        if (newSnake.length >= WIN_LENGTH) {
          setGameState('won')
        } else {
          setFood(spawnFood(newSnake))
        }
      } else {
        newSnake = [newHead, ...prevSnake.slice(0, -1)]
      }

      return newSnake
    })
  }, gameState === 'playing')

  // Render the game with ASCII border
  const renderGame = () => {
    const grid = createGrid(GAME_WIDTH, GAME_HEIGHT)

    // Draw border
    for (let x = 0; x < GAME_WIDTH; x++) {
      grid[0][x] = '─'
      grid[GAME_HEIGHT - 1][x] = '─'
    }
    for (let y = 0; y < GAME_HEIGHT; y++) {
      grid[y][0] = '│'
      grid[y][GAME_WIDTH - 1] = '│'
    }
    grid[0][0] = '┌'
    grid[0][GAME_WIDTH - 1] = '┐'
    grid[GAME_HEIGHT - 1][0] = '└'
    grid[GAME_HEIGHT - 1][GAME_WIDTH - 1] = '┘'

    // Draw food
    drawChar(grid, food.char, food.x, food.y)

    // Draw snake
    snake.forEach((seg, i) => {
      let char
      if (i === 0) {
        char = SNAKE_HEAD
      } else if (i === snake.length - 1) {
        char = SNAKE_TAIL
      } else {
        char = SNAKE_BODY
      }
      drawChar(grid, char, seg.x, seg.y)
    })

    return renderGrid(grid)
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
      <div style={GAME_STYLES.header}>
        <span>SCORE: {score}</span>
        <span>LENGTH: {snake.length}/{WIN_LENGTH}</span>
      </div>

      {/* Game Field */}
      <div style={fieldStyle}>
        {renderGame()}

        {/* Overlay for game states */}
        {gameState !== 'playing' && (
          <div style={GAME_STYLES.overlay}>
            {gameState === 'ready' && (
              <>
                <div style={{ fontSize: '20px', marginBottom: '10px' }}>HEBI (Snake)</div>
                <div style={{ marginBottom: '5px' }}>Collect treats and grow!</div>
                <div style={{ marginBottom: '15px', fontSize: '12px' }}>Reach length {WIN_LENGTH} to win</div>
                <div style={{ color: 'var(--color-primary)' }}>
                  [ARROWS/WASD] to move, [SPACE] to START
                </div>
              </>
            )}
            {gameState === 'won' && (
              <>
                <div style={{ fontSize: '24px', marginBottom: '10px', color: 'var(--color-primary)' }}>
                  OMEDETO! (Congrats!)
                </div>
                <div style={{ marginBottom: '5px' }}>Final Score: {score}</div>
                <div style={{ marginBottom: '15px' }}>The snake is full!</div>
                <div style={{ color: 'var(--color-primary)' }}>
                  [SPACE] or [CLICK] to PLAY AGAIN
                </div>
              </>
            )}
            {gameState === 'lost' && (
              <>
                <div style={{ fontSize: '24px', marginBottom: '10px', color: '#ff6b6b' }}>
                  GAME OVER
                </div>
                <div style={{ marginBottom: '5px' }}>Score: {score}</div>
                <div style={{ marginBottom: '5px' }}>Length: {snake.length}/{WIN_LENGTH}</div>
                <div style={{ marginBottom: '15px' }}>The snake crashed!</div>
                <div style={{ color: 'var(--color-primary)' }}>
                  [SPACE] or [CLICK] to TRY AGAIN
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div style={GAME_STYLES.instructions}>
        Use ARROWS or WASD to move | Don't hit the walls!
      </div>

      {/* Mobile Controls - only shown on touch devices */}
      {isMobile && (
        <div style={{ ...GAME_STYLES.mobileControls, display: 'flex' }}>
          <div style={GAME_STYLES.mobileControlRow}>
            <button
              style={GAME_STYLES.mobileButton}
              onTouchStart={(e) => { e.preventDefault(); handleInput('UP') }}
              onClick={() => handleInput('UP')}
            >▲</button>
          </div>
          <div style={GAME_STYLES.mobileControlRow}>
            <button
              style={GAME_STYLES.mobileButton}
              onTouchStart={(e) => { e.preventDefault(); handleInput('LEFT') }}
              onClick={() => handleInput('LEFT')}
            >◀</button>
            <button
              style={GAME_STYLES.mobileButton}
              onTouchStart={(e) => { e.preventDefault(); handleInput('DOWN') }}
              onClick={() => handleInput('DOWN')}
            >▼</button>
            <button
              style={GAME_STYLES.mobileButton}
              onTouchStart={(e) => { e.preventDefault(); handleInput('RIGHT') }}
              onClick={() => handleInput('RIGHT')}
            >▶</button>
          </div>
        </div>
      )}
    </div>
  )
}
