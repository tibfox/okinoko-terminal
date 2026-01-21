import { useState, useRef, useCallback } from 'preact/hooks'
import {
  useGameLoop,
  useBufferedKeyInput,
  useCountdown,
  createGrid,
  drawChar,
  renderGrid,
  randomInt,
  KEY_MAPS,
  DIRECTIONS,
  GAME_STYLES,
} from './shared/asciiGameEngine.js'
import GameLayout from './shared/GameLayout.jsx'
import GameInfoPanel from './shared/GameInfoPanel.jsx'
import GameOverlay from './shared/GameOverlay.jsx'

// Square playing field
const GAME_WIDTH = 30
const GAME_HEIGHT = 30
const INITIAL_SPEED = 6 // Moves per second
const SPEED_INCREMENT = 0.15
const MAX_SPEED = 14

// Japanese food items as collectibles (single-width ASCII characters)
const FOOD_CHARS = ['*', '#', '+', '$', '%', '&']

// Snake body characters
const SNAKE_HEAD = '@'
const SNAKE_BODY = 'o'
const SNAKE_TAIL = '~'
const SNAKE_BODY_POWERED = '*' // Body character when wall-walk is active

// Power-up settings
const POWER_UP_CHARS = ['.', '?'] // Alternates between these
const WALL_WALK_DURATION = 10 // seconds
const POWER_UP_SPAWN_CHANCE = 0.15 // 15% chance to spawn power-up instead of food
const TWO_FOOD_CHANCE = 0.25 // 25% chance to spawn 2 foods instead of 1
const POWER_UP_LIFETIME = 10 // seconds before power-up disappears
const FOOD_BONUS_TIME = 5 // seconds to eat food for bonus points

// Scoring
const FOOD_SCORE = 5
const FOOD_BONUS_SCORE = 10
const POWER_UP_SCORE = 20

// Game configuration for overlay
const GAME_CONFIG = {
  title: 'JASHOKU',
  instructions: ['Collect treats and grow!'],
  subtitle: 'How long can you survive?',
  lostMessage: 'The snake crashed!',
}

/**
 * GameFieldSnake - Classic Snake game with Japanese theme
 * Collect treats to grow! Hit a wall and it's game over.
 */
export default function GameFieldSnake({ onGameComplete }) {
  const [gameState, setGameState] = useState('ready') // ready, playing, lost
  const [snake, setSnake] = useState([{ x: 15, y: 15 }])
  const [direction, setDirection] = useState(DIRECTIONS.RIGHT)
  const [nextDirection, setNextDirection] = useState(DIRECTIONS.RIGHT)
  const [foods, setFoods] = useState([{ x: 7, y: 5, char: '*' }])
  const [score, setScore] = useState(0)
  const [speed, setSpeed] = useState(INITIAL_SPEED)
  const [wallWalkTimeLeft, setWallWalkTimeLeft] = useState(0) // seconds remaining
  const [animTick, setAnimTick] = useState(0) // for power-up animation

  const moveAccumulatorRef = useRef(0)
  const wallWalkTimerRef = useRef(null)
  const wallWalkTimeLeftRef = useRef(0)
  const foodTimerRef = useRef(null)

  // Keep ref in sync with state for use in game loop
  wallWalkTimeLeftRef.current = wallWalkTimeLeft

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
      char: isPowerUp ? POWER_UP_CHARS[0] : FOOD_CHARS[randomInt(0, FOOD_CHARS.length)],
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
  const { consumeOne, clear: clearBuffer } = useBufferedKeyInput(KEY_MAPS.ARROWS_AND_WASD, true)

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

  // Render the game with ASCII border
  const renderGame = () => {
    const grid = createGrid(GAME_WIDTH, GAME_HEIGHT)
    const wallWalkActive = wallWalkTimeLeft > 0

    // Draw border using ASCII characters
    // Use '.' for horizontal and ':' for vertical walls when wall-walk is active
    const wallHoriz = wallWalkActive ? '.' : '-'
    const wallVert = wallWalkActive ? ':' : '|'
    const wallCorner = wallWalkActive ? '.' : '+'

    for (let x = 0; x < GAME_WIDTH; x++) {
      grid[0][x] = wallHoriz
      grid[GAME_HEIGHT - 1][x] = wallHoriz
    }
    for (let y = 0; y < GAME_HEIGHT; y++) {
      grid[y][0] = wallVert
      grid[y][GAME_WIDTH - 1] = wallVert
    }
    grid[0][0] = wallCorner
    grid[0][GAME_WIDTH - 1] = wallCorner
    grid[GAME_HEIGHT - 1][0] = wallCorner
    grid[GAME_HEIGHT - 1][GAME_WIDTH - 1] = wallCorner

    // Draw all foods (power-ups animate between . and ?)
    foods.forEach(food => {
      let char = food.char
      if (food.isPowerUp) {
        // Animate power-up character
        char = POWER_UP_CHARS[animTick % POWER_UP_CHARS.length]
      }
      drawChar(grid, char, food.x, food.y)
    })

    // Draw snake - use powered-up body when wall-walk is active
    snake.forEach((seg, i) => {
      let char
      if (i === 0) {
        char = SNAKE_HEAD
      } else if (i === snake.length - 1) {
        char = SNAKE_TAIL
      } else {
        char = wallWalkActive ? SNAKE_BODY_POWERED : SNAKE_BODY
      }
      drawChar(grid, char, seg.x, seg.y)
    })

    return renderGrid(grid)
  }

  const handleClick = useCallback(() => {
    if (gameState !== 'playing' && gameState !== 'countdown') {
      startGame()
    }
  }, [gameState, startGame])

  // Info Panel component - Snake has dynamic items based on power-up state
  const InfoPanel = useCallback(() => {
    const items = [
      { label: 'SCORE', value: score },
      { label: 'LENGTH', value: snake.length },
    ]
    if (wallWalkTimeLeft > 0) {
      items.push({ label: 'GHOST', value: `${wallWalkTimeLeft}s` })
    }
    items.push({ label: 'TOKENS', value: 100 })
    return <GameInfoPanel items={items} />
  }, [score, snake.length, wallWalkTimeLeft])

  // Mobile Controls component - Snake uses D-pad only, no action buttons
  const MobileControls = useCallback(() => (
    <div style={GAME_STYLES.gamepad}>
      {/* D-Pad (Left) */}
      <div style={GAME_STYLES.dpad}>
        <div />
        <button
          style={GAME_STYLES.dpadButton}
          onTouchStart={(e) => { e.preventDefault(); handleInput('UP') }}
          onClick={() => handleInput('UP')}
        >▲</button>
        <div />
        <button
          style={GAME_STYLES.dpadButton}
          onTouchStart={(e) => { e.preventDefault(); handleInput('LEFT') }}
          onClick={() => handleInput('LEFT')}
        >◀</button>
        <div style={GAME_STYLES.dpadCenter} />
        <button
          style={GAME_STYLES.dpadButton}
          onTouchStart={(e) => { e.preventDefault(); handleInput('RIGHT') }}
          onClick={() => handleInput('RIGHT')}
        >▶</button>
        <div />
        <button
          style={GAME_STYLES.dpadButton}
          onTouchStart={(e) => { e.preventDefault(); handleInput('DOWN') }}
          onClick={() => handleInput('DOWN')}
        >▼</button>
        <div />
      </div>

      {/* Action Buttons (Right) - Snake has no action buttons, just placeholder */}
      <div style={GAME_STYLES.actionButtons}>
        <div style={{ opacity: 0.3, fontSize: '10px', color: 'var(--color-primary-darker)' }}>
          D-PAD ONLY
        </div>
      </div>
    </div>
  ), [handleInput])

  // Get overlay config for lost state
  const getOverlayConfig = useCallback(() => {
    if (gameState !== 'lost') return GAME_CONFIG
    return {
      ...GAME_CONFIG,
      lostStats: [
        { label: 'Score', value: score },
        { label: 'Length', value: snake.length },
      ],
    }
  }, [gameState, score, snake.length])

  return (
    <GameLayout
      gameWidth={GAME_WIDTH}
      gameHeight={GAME_HEIGHT}
      renderGame={renderGame}
      InfoPanel={InfoPanel}
      MobileControls={MobileControls}
      onFieldClick={handleClick}
      overlayContent={<GameOverlay gameState={gameState} countdown={countdown} gameConfig={getOverlayConfig()} />}
    />
  )
}
