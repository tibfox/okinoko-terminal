import { useState, useEffect, useRef, useCallback } from 'preact/hooks'
import {
  useGameLoop,
  useKeyInput,
  useResponsiveFontSize,
  createGrid,
  drawSprite,
  fillRowWithPattern,
  renderGrid,
  checkCollision,
  getSpriteSize,
  randomPick,
  KEY_MAPS,
  GAME_STYLES,
} from './lib/asciiGameEngine.js'

// ASCII Art for the cat (normal and jumping) - compact emoticon style
const CAT_NORMAL = [
  '/\\_/\\',
  '(o.o)',
  '(> <)',
]

const CAT_JUMP = [
  '/\\_/\\',
  '(^.^)',
  ' / \\ ',
]

// Obstacles - Ground
const SAKE_BOTTLE = [
  ' _ ',
  '|酒|',
  '|_|',
]

const ONIGIRI = [
  ' /\\ ',
  '/海\\',
  '----',
]

const DARUMA = [
  ' __ ',
  '(@@)',
  '|福|',
  '(--)',
]

// Obstacles - Flying
const FISH = [
  '><>>',
  ' <\\/',
]

const DANGO = [
  'o',
  'o',
  'o',
  '|',
]

const SHURIKEN = [
  ' \\ / ',
  '--*--',
  ' / \\ ',
]

// Obstacle configs
const GROUND_OBSTACLES = [SAKE_BOTTLE, ONIGIRI, DARUMA]
const FLYING_OBSTACLES = [FISH, DANGO, SHURIKEN]

const GAME_WIDTH = 60
const GAME_HEIGHT = 16
const GROUND_Y = 13
const CAT_X = 5
const GRAVITY = 0.1
const JUMP_VELOCITY = -1.5
const OBSTACLE_SPEED_INITIAL = 0.4
const SPAWN_INTERVAL_INITIAL = 2000
const GRASS_PATTERN = ',."\'`'

/**
 * GameFieldJump - ASCII side-scroller game
 * Cat jumps over obstacles to win!
 * Pass 10 obstacles to win!
 */
export default function GameFieldJump({ onGameComplete }) {
  const [gameState, setGameState] = useState('ready') // ready, playing, won, lost
  const [catY, setCatY] = useState(GROUND_Y)
  const [catVelocity, setCatVelocity] = useState(0)
  const [isJumping, setIsJumping] = useState(false)
  const [obstacles, setObstacles] = useState([])
  const [score, setScore] = useState(0)
  const [obstaclesPassed, setObstaclesPassed] = useState(0)
  const [grassOffset, setGrassOffset] = useState(0)

  const containerRef = useRef(null)
  const spawnTimerRef = useRef(null)
  const obstacleSpeedRef = useRef(OBSTACLE_SPEED_INITIAL)
  const spawnIntervalRef = useRef(SPAWN_INTERVAL_INITIAL)

  // Calculate responsive font size based on container
  const fontSize = useResponsiveFontSize(containerRef, GAME_WIDTH, GAME_HEIGHT)

  // Reset game state
  const resetGame = useCallback(() => {
    setCatY(GROUND_Y)
    setCatVelocity(0)
    setIsJumping(false)
    setObstacles([])
    setScore(0)
    setObstaclesPassed(0)
    setGrassOffset(0)
    obstacleSpeedRef.current = OBSTACLE_SPEED_INITIAL
    spawnIntervalRef.current = SPAWN_INTERVAL_INITIAL
  }, [])

  // Start the game
  const startGame = useCallback(() => {
    resetGame()
    setGameState('playing')
  }, [resetGame])

  // Jump action
  const jump = useCallback(() => {
    if (gameState !== 'playing') {
      if (gameState === 'ready' || gameState === 'won' || gameState === 'lost') {
        startGame()
      }
      return
    }

    if (!isJumping) {
      setCatVelocity(JUMP_VELOCITY)
      setIsJumping(true)
    }
  }, [gameState, isJumping, startGame])

  // Handle keyboard input using the engine
  const handleInput = useCallback((action) => {
    if (action === 'JUMP') {
      jump()
    }
  }, [jump])

  useKeyInput(KEY_MAPS.JUMP, handleInput, true)

  // Spawn obstacles
  useEffect(() => {
    if (gameState !== 'playing') return

    const spawnObstacle = () => {
      const isFlying = Math.random() > 0.5
      const obstaclePool = isFlying ? FLYING_OBSTACLES : GROUND_OBSTACLES
      const sprite = randomPick(obstaclePool)
      const newObstacle = {
        id: Date.now(),
        x: GAME_WIDTH + 5,
        y: isFlying ? GROUND_Y - 1 - Math.floor(Math.random() * 3) : GROUND_Y,
        type: isFlying ? 'flying' : 'ground',
        sprite,
        passed: false,
      }
      setObstacles(prev => [...prev, newObstacle])
      spawnIntervalRef.current = Math.max(800, spawnIntervalRef.current - 50)
    }

    spawnObstacle()
    spawnTimerRef.current = setInterval(spawnObstacle, spawnIntervalRef.current)

    return () => {
      if (spawnTimerRef.current) clearInterval(spawnTimerRef.current)
    }
  }, [gameState])

  // Game loop using the engine
  useGameLoop((deltaTime) => {
    // Update cat position (gravity)
    setCatVelocity(prevVel => {
      const newVel = prevVel + GRAVITY * deltaTime

      setCatY(prevY => {
        const newY = prevY + newVel * deltaTime

        if (newY >= GROUND_Y) {
          setIsJumping(false)
          setCatVelocity(0)
          return GROUND_Y
        }
        return newY
      })

      return newVel
    })

    // Update obstacles
    setObstacles(prev => {
      const updated = prev
        .map(obs => ({
          ...obs,
          x: obs.x - obstacleSpeedRef.current * deltaTime,
        }))
        .filter(obs => obs.x > -15)

      // Check for passed obstacles
      updated.forEach(obs => {
        if (!obs.passed && obs.x < CAT_X - 5) {
          obs.passed = true
          setObstaclesPassed(p => {
            const newPassed = p + 1
            if (newPassed >= 10) {
              setGameState('won')
            }
            return newPassed
          })
          setScore(s => s + 100)
        }
      })

      return updated
    })

    // Update grass offset for scrolling effect
    setGrassOffset(prev => (prev + obstacleSpeedRef.current * deltaTime) % GAME_WIDTH)

    // Increase speed over time
    obstacleSpeedRef.current = Math.min(1.0, obstacleSpeedRef.current + 0.002 * deltaTime)
  }, gameState === 'playing')

  // Collision detection
  useEffect(() => {
    if (gameState !== 'playing') return

    const catSprite = isJumping ? CAT_JUMP : CAT_NORMAL
    const catSize = getSpriteSize(catSprite)
    const catRect = {
      x: CAT_X,
      y: Math.floor(catY),
      width: catSize.width,
      height: catSize.height,
    }

    for (const obs of obstacles) {
      const obsSize = getSpriteSize(obs.sprite)
      const obsRect = {
        x: Math.floor(obs.x),
        y: obs.y,
        width: obsSize.width,
        height: obsSize.height,
      }

      if (checkCollision(catRect, obsRect)) {
        setGameState('lost')
        break
      }
    }
  }, [obstacles, catY, gameState, isJumping])

  // Render the game
  const renderGame = () => {
    const grid = createGrid(GAME_WIDTH, GAME_HEIGHT)

    // Draw ground with scrolling grass
    fillRowWithPattern(grid, GROUND_Y + 1, GRASS_PATTERN, grassOffset)

    // Draw cat
    const catSprite = isJumping ? CAT_JUMP : CAT_NORMAL
    drawSprite(grid, catSprite, CAT_X, Math.floor(catY))

    // Draw obstacles
    obstacles.forEach(obs => {
      drawSprite(grid, obs.sprite, obs.x, obs.y)
    })

    return renderGrid(grid)
  }

  // Dynamic field style with calculated font size
  const fieldStyle = {
    ...GAME_STYLES.field,
    fontSize: `${fontSize}px`,
  }

  return (
    <div ref={containerRef} onClick={jump} style={GAME_STYLES.container}>
      {/* Header */}
      <div style={GAME_STYLES.header}>
        <span>SCORE: {score}</span>
        <span>OBSTACLES: {obstaclesPassed}/10</span>
      </div>

      {/* Game Field */}
      <div style={fieldStyle}>
        {renderGame()}

        {/* Overlay for game states */}
        {gameState !== 'playing' && (
          <div style={GAME_STYLES.overlay}>
            {gameState === 'ready' && (
              <>
                <div style={{ fontSize: '20px', marginBottom: '10px' }}>NEKO JUMP</div>
                <div style={{ marginBottom: '5px' }}>Help the cat avoid</div>
                <div style={{ marginBottom: '5px' }}>flying fish and sake bottles!</div>
                <div style={{ marginBottom: '15px', fontSize: '12px' }}>Pass 10 obstacles to win</div>
                <div style={{ color: 'var(--color-primary)' }}>
                  [SPACE] or [CLICK] to START
                </div>
              </>
            )}
            {gameState === 'won' && (
              <>
                <div style={{ fontSize: '24px', marginBottom: '10px', color: 'var(--color-primary)' }}>
                  YOU WIN!
                </div>
                <div style={{ marginBottom: '5px' }}>Final Score: {score}</div>
                <div style={{ marginBottom: '15px' }}>The cat is safe!</div>
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
                <div style={{ marginBottom: '5px' }}>Obstacles Passed: {obstaclesPassed}/10</div>
                <div style={{ marginBottom: '15px' }}>The cat got hit!</div>
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
        Press SPACE, W, UP ARROW, or CLICK to jump
      </div>
    </div>
  )
}
