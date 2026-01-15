import { useState, useRef, useCallback } from 'preact/hooks'
import {
  useGameLoop,
  useBufferedKeyInput,
  useCountdown,
  useIsMobile,
  randomInt,
  KEY_MAPS,
  DIRECTIONS,
  GAME_STYLES,
} from './lib/asciiGameEngine.js'
import PixelCanvas from './PixelCanvas.jsx'

// Square playing field (in grid cells)
const GAME_WIDTH = 30
const GAME_HEIGHT = 30
const CELL_SIZE = 8 // Each cell is 8x8 pixels
const INITIAL_SPEED = 6 // Moves per second
const SPEED_INCREMENT = 0.15
const MAX_SPEED = 14

// Colors for pixel graphics (using CSS custom properties via computed values)
// These map to --color-primary-* variables
const COLORS = {
  background: '#000000',
  wall: 'var(--color-primary-darker, #1a4a1a)',
  snakeHead: 'var(--color-primary, #00ff00)',
  snakeBody: 'var(--color-primary-dark, #00cc00)',
  snakeBodyGhost: 'var(--color-primary-light, #66ff66)',
  snakeTail: 'var(--color-primary-darker, #009900)',
  food: 'var(--color-primary, #00ff00)',
  foodAlt: 'var(--color-primary-light, #66ff66)',
  powerUp: 'var(--color-primary-light, #66ff66)',
  powerUpAlt: 'var(--color-primary, #00ff00)',
}

// Power-up settings
const WALL_WALK_DURATION = 10 // seconds
const POWER_UP_SPAWN_CHANCE = 0.15 // 15% chance to spawn power-up instead of food
const TWO_FOOD_CHANCE = 0.25 // 25% chance to spawn 2 foods instead of 1
const POWER_UP_LIFETIME = 10 // seconds before power-up disappears
const FOOD_BONUS_TIME = 5 // seconds to eat food for bonus points

// Scoring
const FOOD_SCORE = 5
const FOOD_BONUS_SCORE = 10
const POWER_UP_SCORE = 20

// Pixel art patterns (8x8 grids represented as arrays of 1s and 0s)
const PIXEL_PATTERNS = {
  snakeHead: [
    [0,0,1,1,1,1,0,0],
    [0,1,1,1,1,1,1,0],
    [1,1,0,1,1,0,1,1],
    [1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1],
    [1,1,0,1,1,0,1,1],
    [0,1,1,1,1,1,1,0],
    [0,0,1,1,1,1,0,0],
  ],
  snakeBody: [
    [0,1,1,1,1,1,1,0],
    [1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1],
    [0,1,1,1,1,1,1,0],
  ],
  snakeTail: [
    [0,0,0,1,1,0,0,0],
    [0,0,1,1,1,1,0,0],
    [0,1,1,1,1,1,1,0],
    [1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1],
    [0,1,1,1,1,1,1,0],
    [0,0,1,1,1,1,0,0],
    [0,0,0,1,1,0,0,0],
  ],
  food: [
    [0,0,0,1,1,0,0,0],
    [0,0,1,1,1,1,0,0],
    [0,1,1,1,1,1,1,0],
    [1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1],
    [0,1,1,1,1,1,1,0],
    [0,0,1,1,1,1,0,0],
    [0,0,0,1,1,0,0,0],
  ],
  powerUp: [
    [0,0,0,1,1,0,0,0],
    [0,0,1,0,0,1,0,0],
    [0,1,0,1,1,0,1,0],
    [1,0,1,1,1,1,0,1],
    [1,0,1,1,1,1,0,1],
    [0,1,0,1,1,0,1,0],
    [0,0,1,0,0,1,0,0],
    [0,0,0,1,1,0,0,0],
  ],
}

/**
 * GameFieldSnakePixel - Classic Snake game with pixel graphics
 * Collect treats to grow! Hit a wall and it's game over.
 */
export default function GameFieldSnakePixel({ onGameComplete }) {
  const [gameState, setGameState] = useState('ready') // ready, playing, lost
  const [snake, setSnake] = useState([{ x: 15, y: 15 }])
  const [direction, setDirection] = useState(DIRECTIONS.RIGHT)
  const [nextDirection, setNextDirection] = useState(DIRECTIONS.RIGHT)
  const [foods, setFoods] = useState([{ x: 7, y: 5, isPowerUp: false, spawnTime: Date.now() }])
  const [score, setScore] = useState(0)
  const [speed, setSpeed] = useState(INITIAL_SPEED)
  const [wallWalkTimeLeft, setWallWalkTimeLeft] = useState(0) // seconds remaining
  const [animTick, setAnimTick] = useState(0) // for animations

  const moveAccumulatorRef = useRef(0)
  const wallWalkTimerRef = useRef(null)
  const wallWalkTimeLeftRef = useRef(0)
  const foodTimerRef = useRef(null)

  // Keep ref in sync with state for use in game loop
  wallWalkTimeLeftRef.current = wallWalkTimeLeft

  // Check if on mobile device
  const isMobile = useIsMobile()

  // Spawn food at random position not on snake, not on borders, and not on existing food
  const spawnFood = useCallback((currentSnake, existingFoods = [], forcePowerUp = false, noPowerUp = false) => {
    let newX, newY
    let attempts = 0
    do {
      newX = randomInt(2, GAME_WIDTH - 2)
      newY = randomInt(2, GAME_HEIGHT - 2)
      attempts++
    } while (
      attempts < 100 &&
      (currentSnake.some(seg => seg.x === newX && seg.y === newY) ||
       existingFoods.some(f => f.x === newX && f.y === newY))
    )

    // Decide if this should be a power-up
    const isPowerUp = !noPowerUp && (forcePowerUp || Math.random() < POWER_UP_SPAWN_CHANCE)
    const now = Date.now()

    return {
      x: newX,
      y: newY,
      isPowerUp,
      spawnTime: now,
    }
  }, [])

  // Spawn 1-2 foods randomly (25% chance for 2 foods)
  const spawnFoods = useCallback((currentSnake, isFirstSpawn = false) => {
    const count = isFirstSpawn ? 1 : (Math.random() < TWO_FOOD_CHANCE ? 2 : 1)
    const newFoods = []
    for (let i = 0; i < count; i++) {
      // First spawn should never be a power-up
      const noPowerUp = isFirstSpawn && i === 0
      newFoods.push(spawnFood(currentSnake, newFoods, false, noPowerUp))
    }
    return newFoods
  }, [spawnFood])

  // Track last direction to prevent 180-degree turns properly with buffered input
  const lastAppliedDirectionRef = useRef(DIRECTIONS.RIGHT)

  // Reset game state
  const resetGame = useCallback(() => {
    const initialSnake = [{ x: 15, y: 15 }]
    setSnake(initialSnake)
    setDirection(DIRECTIONS.RIGHT)
    setNextDirection(DIRECTIONS.RIGHT)
    setFoods(spawnFoods(initialSnake, true)) // First spawn: single food, no power-up
    setScore(0)
    setSpeed(INITIAL_SPEED)
    setWallWalkTimeLeft(0)
    setAnimTick(0)
    if (wallWalkTimerRef.current) {
      clearInterval(wallWalkTimerRef.current)
      wallWalkTimerRef.current = null
    }
    if (foodTimerRef.current) {
      clearInterval(foodTimerRef.current)
      foodTimerRef.current = null
    }
    moveAccumulatorRef.current = 0
    lastAppliedDirectionRef.current = DIRECTIONS.RIGHT
  }, [spawnFoods])

  // Activate wall-walk power-up
  const activateWallWalk = useCallback(() => {
    setWallWalkTimeLeft(WALL_WALK_DURATION)

    // Clear any existing timer
    if (wallWalkTimerRef.current) {
      clearInterval(wallWalkTimerRef.current)
    }

    // Start countdown timer
    wallWalkTimerRef.current = setInterval(() => {
      setWallWalkTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(wallWalkTimerRef.current)
          wallWalkTimerRef.current = null
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  // Actually start playing after countdown
  const beginPlaying = useCallback(() => {
    setGameState('playing')

    // Start food timer for power-up animation and expiration
    if (foodTimerRef.current) {
      clearInterval(foodTimerRef.current)
    }
    foodTimerRef.current = setInterval(() => {
      // Update animation tick for power-up blinking
      setAnimTick(prev => prev + 1)

      // Remove expired power-ups
      const now = Date.now()
      setFoods(prevFoods => {
        const filtered = prevFoods.filter(f => {
          if (f.isPowerUp) {
            const age = (now - f.spawnTime) / 1000
            return age < POWER_UP_LIFETIME
          }
          return true
        })
        return filtered
      })
    }, 500) // Update every 500ms for smooth animation
  }, [])

  // Countdown hook
  const { countdown, startCountdown } = useCountdown(3, beginPlaying)

  // Start the game (triggers countdown)
  const startGame = useCallback(() => {
    resetGame()
    setGameState('countdown')
    startCountdown()
  }, [resetGame, startCountdown])

  // Buffered input for direction changes
  const { consumeOne } = useBufferedKeyInput(KEY_MAPS.ARROWS_AND_WASD, true)

  // Handle direction input (used by mobile controls)
  const handleInput = useCallback((action) => {
    if (gameState !== 'playing') {
      if (gameState === 'ready' || gameState === 'won' || gameState === 'lost') {
        startGame()
      }
      return
    }

    const newDir = DIRECTIONS[action]
    if (!newDir) return

    // Prevent 180-degree turns based on last applied direction
    const lastDir = lastAppliedDirectionRef.current
    if (newDir.x !== 0 && lastDir.x !== 0) return
    if (newDir.y !== 0 && lastDir.y !== 0) return

    setNextDirection(newDir)
    lastAppliedDirectionRef.current = newDir
  }, [gameState, startGame])

  // Game loop
  useGameLoop((deltaTime) => {
    // Accumulate time for movement
    moveAccumulatorRef.current += deltaTime * speed / 60

    if (moveAccumulatorRef.current < 1) return
    moveAccumulatorRef.current = 0

    // Process ONE buffered input right before moving
    // Validate against current ACTUAL direction to prevent 180-degree turns
    const bufferedAction = consumeOne()
    let moveDirection = nextDirection

    if (bufferedAction) {
      const newDir = DIRECTIONS[bufferedAction]
      if (newDir) {
        // Prevent 180-degree turns - check against CURRENT direction
        const isValid = !(newDir.x !== 0 && direction.x !== 0) && !(newDir.y !== 0 && direction.y !== 0)
        if (isValid) {
          moveDirection = newDir
          setNextDirection(newDir)
        }
      }
    }

    // Apply direction change
    setDirection(moveDirection)

    setSnake(prevSnake => {
      const head = prevSnake[0]
      let newHead = {
        x: head.x + moveDirection.x,
        y: head.y + moveDirection.y,
      }

      // Check wall collision
      const hitWall = newHead.x <= 0 || newHead.x >= GAME_WIDTH - 1 ||
                      newHead.y <= 0 || newHead.y >= GAME_HEIGHT - 1

      if (hitWall) {
        if (wallWalkTimeLeftRef.current > 0) {
          // Wall-walk active: wrap around to opposite side
          if (newHead.x <= 0) newHead.x = GAME_WIDTH - 2
          else if (newHead.x >= GAME_WIDTH - 1) newHead.x = 1
          if (newHead.y <= 0) newHead.y = GAME_HEIGHT - 2
          else if (newHead.y >= GAME_HEIGHT - 1) newHead.y = 1
        } else {
          // No wall-walk: game over
          setGameState('lost')
          return prevSnake
        }
      }

      // Check self-collision
      if (prevSnake.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
        setGameState('lost')
        return prevSnake
      }

      // Check food collision - check against all foods
      const eatenFoodIndex = foods.findIndex(f => newHead.x === f.x && newHead.y === f.y)
      const ateFood = eatenFoodIndex !== -1
      const eatenFood = ateFood ? foods[eatenFoodIndex] : null

      let newSnake
      if (ateFood) {
        newSnake = [newHead, ...prevSnake]

        // Calculate score based on food type and time
        if (eatenFood.isPowerUp) {
          setScore(s => s + POWER_UP_SCORE)
          activateWallWalk()
        } else {
          // Regular food: bonus if eaten within 5 seconds
          const foodAge = (Date.now() - eatenFood.spawnTime) / 1000
          const points = foodAge <= FOOD_BONUS_TIME ? FOOD_BONUS_SCORE : FOOD_SCORE
          setScore(s => s + points)
        }

        setSpeed(s => Math.min(MAX_SPEED, s + SPEED_INCREMENT))

        // Remove eaten food and spawn new foods (1-2)
        setFoods(prevFoods => {
          const remaining = prevFoods.filter((_, i) => i !== eatenFoodIndex)
          // If no foods left, spawn 1-2 new ones
          if (remaining.length === 0) {
            return spawnFoods(newSnake)
          }
          // Otherwise just spawn 1 replacement
          return [...remaining, spawnFood(newSnake, remaining)]
        })
      } else {
        newSnake = [newHead, ...prevSnake.slice(0, -1)]
      }

      return newSnake
    })
  }, gameState === 'playing')

  // Render callback for PixelCanvas
  const handleRender = useCallback((ctx, helpers) => {
    const wallWalkActive = wallWalkTimeLeft > 0

    // Draw thin border walls (0.5 cell width) with holes when ghost mode is active
    const wallColor = COLORS.wall

    // Generate gaps for ghost mode (every 3rd cell, excluding corners)
    const horizontalGaps = wallWalkActive
      ? Array.from({ length: GAME_WIDTH }, (_, i) => i).filter(i => i % 3 === 0 && i > 0 && i < GAME_WIDTH - 1)
      : []
    const verticalGaps = wallWalkActive
      ? Array.from({ length: GAME_HEIGHT }, (_, i) => i).filter(i => i % 3 === 0 && i > 0 && i < GAME_HEIGHT - 1)
      : []

    // Draw thin borders on all sides
    helpers.drawThinBorder('top', GAME_WIDTH, 0, wallColor, horizontalGaps)
    helpers.drawThinBorder('bottom', GAME_WIDTH, 0, wallColor, horizontalGaps)
    helpers.drawThinBorder('left', GAME_HEIGHT, 0, wallColor, verticalGaps)
    helpers.drawThinBorder('right', GAME_HEIGHT, 0, wallColor, verticalGaps)

    // Draw all foods with animation
    foods.forEach(food => {
      if (food.isPowerUp) {
        // Animate power-up color
        const color = animTick % 2 === 0 ? COLORS.powerUp : COLORS.powerUpAlt
        helpers.drawPattern(PIXEL_PATTERNS.powerUp, food.x, food.y, color)
      } else {
        // Regular food with subtle pulse
        const color = animTick % 4 < 2 ? COLORS.food : COLORS.foodAlt
        helpers.drawPattern(PIXEL_PATTERNS.food, food.x, food.y, color)
      }
    })

    // Draw snake
    snake.forEach((seg, i) => {
      let pattern, color
      if (i === 0) {
        pattern = PIXEL_PATTERNS.snakeHead
        color = COLORS.snakeHead
      } else if (i === snake.length - 1) {
        pattern = PIXEL_PATTERNS.snakeTail
        color = COLORS.snakeTail
      } else {
        pattern = PIXEL_PATTERNS.snakeBody
        color = wallWalkActive ? COLORS.snakeBodyGhost : COLORS.snakeBody
      }
      helpers.drawPattern(pattern, seg.x, seg.y, color)
    })
  }, [snake, foods, wallWalkTimeLeft, animTick])

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
        <span style={GAME_STYLES.infoPanelLabel}>LENGTH</span>
        <span style={GAME_STYLES.infoPanelValue}>{snake.length}</span>
      </div>
      {wallWalkTimeLeft > 0 && (
        <div style={GAME_STYLES.infoPanelMobileItem}>
          <span style={{ ...GAME_STYLES.infoPanelLabel, color: '#ff6b6b' }}>GHOST</span>
          <span style={{ ...GAME_STYLES.infoPanelValue, color: '#ff6b6b' }}>{wallWalkTimeLeft}s</span>
        </div>
      )}
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
        <button
          style={GAME_STYLES.dpadButton}
          onTouchStart={(e) => { e.preventDefault(); handleInput('UP') }}
          onClick={() => handleInput('UP')}
        >▲</button>
        <div /> {/* Empty top-right */}
        <button
          style={GAME_STYLES.dpadButton}
          onTouchStart={(e) => { e.preventDefault(); handleInput('LEFT') }}
          onClick={() => handleInput('LEFT')}
        >◀</button>
        <div style={GAME_STYLES.dpadCenter} /> {/* Center */}
        <button
          style={GAME_STYLES.dpadButton}
          onTouchStart={(e) => { e.preventDefault(); handleInput('RIGHT') }}
          onClick={() => handleInput('RIGHT')}
        >▶</button>
        <div /> {/* Empty bottom-left */}
        <button
          style={GAME_STYLES.dpadButton}
          onTouchStart={(e) => { e.preventDefault(); handleInput('DOWN') }}
          onClick={() => handleInput('DOWN')}
        >▼</button>
        <div /> {/* Empty bottom-right */}
      </div>

      {/* Action Buttons (Right) - Snake has no action buttons, just placeholder */}
      <div style={GAME_STYLES.actionButtons}>
        <div style={{ opacity: 0.3, fontSize: '10px', color: 'var(--color-primary-darker)' }}>
          D-PAD ONLY
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
          <div style={{ fontSize: '20px', marginBottom: '10px' }}>JASHOKU PIXEL</div>
          <div style={{ marginBottom: '5px' }}>Collect treats and grow!</div>
          <div style={{ marginBottom: '15px', fontSize: '12px' }}>How long can you survive?</div>
          <div style={{ color: 'var(--color-primary)' }}>
            [SPACE] to START
          </div>
        </>
      )
    }

    if (gameState === 'lost') {
      return (
        <>
          <div style={{ fontSize: '24px', marginBottom: '10px', color: '#ff6b6b' }}>
            GAME OVER
          </div>
          <div style={{ marginBottom: '5px' }}>Score: {score}</div>
          <div style={{ marginBottom: '5px' }}>Length: {snake.length}</div>
          <div style={{ marginBottom: '15px' }}>The snake crashed!</div>
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
        gridWidth={GAME_WIDTH}
        gridHeight={GAME_HEIGHT}
        cellSize={CELL_SIZE}
        backgroundColor={COLORS.background}
        onRender={handleRender}
        onClick={handleClick}
        renderDeps={[snake, foods, wallWalkTimeLeft, animTick]}
        overlay={getOverlayContent()}
      />
      {isMobile && <MobileControls />}
    </div>
  )
}
