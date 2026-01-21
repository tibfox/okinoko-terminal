import { useState, useEffect, useRef, useCallback, useMemo } from 'preact/hooks'
import {
  useGameLoop,
  useKeyInput,
  useCountdown,
  drawSprite,
  drawChar,
  getSpriteSize,
  randomPick,
  randomInt,
  KEY_MAPS,
  GAME_STYLES,
} from './shared/asciiGameEngine.js'
import GameLayout from './shared/GameLayout.jsx'
import GameInfoPanel from './shared/GameInfoPanel.jsx'
import GameOverlay from './shared/GameOverlay.jsx'
import MobileGamepad from './shared/MobileGamepad.jsx'

// ASCII Art for the cat (normal and jumping) - thin style
const CAT_NORMAL = [
  '/\\',
  'oo',
  '><',
]

const CAT_JUMP = [
  '/\\',
  '^^',
  '/\\',
]

// Obstacles - Ground (ASCII-only for consistent width)
const SAKE_BOTTLE = [
  ' _ ',
  '|S|',
  '|_|',
]

const ONIGIRI = [
  ' /\\ ',
  '/oo\\',
  '----',
]

const DARUMA = [
  ' __ ',
  '(@@)',
  '|##|',
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

// Coin character
const COIN_CHAR = '$'

// Obstacle configs
const GROUND_OBSTACLES = [SAKE_BOTTLE, ONIGIRI, DARUMA]
const FLYING_OBSTACLES = [FISH, DANGO, SHURIKEN]

const GAME_WIDTH = 50
const GAME_HEIGHT = 50
const GROUND_Y = 47
const CAT_X = 8
const GRAVITY = 0.1
const JUMP_VELOCITY = -1.5
const MAX_JUMPS = 3 // Triple jump
const OBSTACLE_SPEED_INITIAL = 0.4
const SPAWN_INTERVAL_INITIAL = 2000
const COIN_SPAWN_INTERVAL = 1500
const GRASS_PATTERN = ',."\'`'

// Pre-compute cat sprite sizes
const CAT_NORMAL_SIZE = getSpriteSize(CAT_NORMAL)
const CAT_JUMP_SIZE = getSpriteSize(CAT_JUMP)

// Pre-allocate reusable grid buffer (avoid allocations every frame)
const gridBuffer = []
for (let y = 0; y < GAME_HEIGHT; y++) {
  gridBuffer.push(new Array(GAME_WIDTH))
}

// Pre-allocate row strings array for join
const rowStrings = new Array(GAME_HEIGHT)

// Fast grid clear and render functions
function clearGrid() {
  for (let y = 0; y < GAME_HEIGHT; y++) {
    const row = gridBuffer[y]
    for (let x = 0; x < GAME_WIDTH; x++) {
      row[x] = ' '
    }
  }
}

function renderGridFast() {
  for (let y = 0; y < GAME_HEIGHT; y++) {
    rowStrings[y] = gridBuffer[y].join('')
  }
  return rowStrings.join('\n')
}

// Game configuration for overlay
const GAME_CONFIG = {
  title: 'NEKO JUMP',
  instructions: ['Triple jump to collect coins!', 'Avoid obstacles!'],
  subtitle: 'Survive as long as you can!',
  lostMessage: 'The cat got hit!',
}

/**
 * GameFieldJump - ASCII side-scroller endless runner
 * Triple jump to collect coins and avoid obstacles!
 * Game ends when the cat hits an obstacle.
 */
export default function GameFieldJump({ onGameComplete }) {
  const [gameState, setGameState] = useState('ready') // ready, countdown, playing, lost
  // Single render trigger - increment to force re-render
  const [renderTick, setRenderTick] = useState(0)

  // Use refs for all frequently-updated game state to avoid re-renders
  const gameRef = useRef({
    catY: GROUND_Y,
    catVelocity: 0,
    jumpsRemaining: MAX_JUMPS,
    obstacles: [],
    coins: [],
    score: 0,
    coinsCollected: 0,
    obstaclesPassed: 0,
    grassOffset: 0,
    obstacleSpeed: OBSTACLE_SPEED_INITIAL,
    spawnInterval: SPAWN_INTERVAL_INITIAL,
  })

  const spawnTimerRef = useRef(null)
  const coinSpawnTimerRef = useRef(null)

  // Check if on mobile device
  const isMobile = useIsMobile()

  // Reset game state
  const resetGame = useCallback(() => {
    const g = gameRef.current
    g.catY = GROUND_Y
    g.catVelocity = 0
    g.jumpsRemaining = MAX_JUMPS
    g.obstacles = []
    g.coins = []
    g.score = 0
    g.coinsCollected = 0
    g.obstaclesPassed = 0
    g.grassOffset = 0
    g.obstacleSpeed = OBSTACLE_SPEED_INITIAL
    g.spawnInterval = SPAWN_INTERVAL_INITIAL
    setRenderTick(t => t + 1)
  }, [])

  // Actually start playing after countdown
  const beginPlaying = useCallback(() => {
    setGameState('playing')
  }, [])

  // Countdown hook
  const { countdown, startCountdown } = useCountdown(3, beginPlaying)

  // Start the game (triggers countdown)
  const startGame = useCallback(() => {
    resetGame()
    setGameState('countdown')
    startCountdown()
  }, [resetGame, startCountdown])

  // Jump action - supports double/triple jump
  const jump = useCallback(() => {
    if (gameState !== 'playing') {
      if (gameState === 'ready' || gameState === 'lost') {
        startGame()
      }
      return
    }

    const g = gameRef.current
    if (g.jumpsRemaining > 0) {
      g.catVelocity = JUMP_VELOCITY
      g.jumpsRemaining--
    }
  }, [gameState, startGame])

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
      const g = gameRef.current
      const isFlying = Math.random() > 0.5
      const obstaclePool = isFlying ? FLYING_OBSTACLES : GROUND_OBSTACLES
      const sprite = randomPick(obstaclePool)
      const newObstacle = {
        id: Date.now(),
        x: GAME_WIDTH + 5,
        y: isFlying ? GROUND_Y - 1 - Math.floor(Math.random() * 3) : GROUND_Y,
        type: isFlying ? 'flying' : 'ground',
        sprite,
        size: getSpriteSize(sprite),
        passed: false,
      }
      g.obstacles.push(newObstacle)
      g.spawnInterval = Math.max(800, g.spawnInterval - 50)
    }

    spawnObstacle()
    spawnTimerRef.current = setInterval(spawnObstacle, gameRef.current.spawnInterval)

    return () => {
      if (spawnTimerRef.current) clearInterval(spawnTimerRef.current)
    }
  }, [gameState])

  // Spawn coins in the sky
  useEffect(() => {
    if (gameState !== 'playing') return

    const spawnCoin = () => {
      const g = gameRef.current
      const newCoin = {
        id: Date.now() + Math.random(),
        x: GAME_WIDTH + 5,
        y: randomInt(GROUND_Y - 20, GROUND_Y - 5),
      }
      g.coins.push(newCoin)
    }

    spawnCoin()
    coinSpawnTimerRef.current = setInterval(spawnCoin, COIN_SPAWN_INTERVAL)

    return () => {
      if (coinSpawnTimerRef.current) clearInterval(coinSpawnTimerRef.current)
    }
  }, [gameState])

  // Game loop - all updates in one place, single render trigger
  useGameLoop((deltaTime) => {
    const g = gameRef.current

    // Update cat physics
    g.catVelocity += GRAVITY * deltaTime
    g.catY += g.catVelocity * deltaTime

    // Ground collision
    if (g.catY >= GROUND_Y) {
      g.catY = GROUND_Y
      g.catVelocity = 0
      g.jumpsRemaining = MAX_JUMPS
    }

    // Update obstacles (mutate in place for performance)
    const speed = g.obstacleSpeed * deltaTime
    for (let i = g.obstacles.length - 1; i >= 0; i--) {
      const obs = g.obstacles[i]
      obs.x -= speed

      // Check if passed
      if (!obs.passed && obs.x < CAT_X - 5) {
        obs.passed = true
        g.obstaclesPassed++
        g.score += 100
      }

      // Remove off-screen
      if (obs.x < -15) {
        g.obstacles.splice(i, 1)
      }
    }

    // Update coins (mutate in place)
    for (let i = g.coins.length - 1; i >= 0; i--) {
      const coin = g.coins[i]
      coin.x -= speed

      // Remove off-screen
      if (coin.x < -5) {
        g.coins.splice(i, 1)
      }
    }

    // Update grass offset
    g.grassOffset = (g.grassOffset + speed) % GAME_WIDTH

    // Increase speed over time
    g.obstacleSpeed = Math.min(1.0, g.obstacleSpeed + 0.002 * deltaTime)

    // Collision detection (integrated into game loop)
    const isInAir = g.catY < GROUND_Y
    const catSize = isInAir ? CAT_JUMP_SIZE : CAT_NORMAL_SIZE
    const catLeft = CAT_X
    const catRight = CAT_X + catSize.width
    const catTop = Math.floor(g.catY) - catSize.height + 1
    const catBottom = Math.floor(g.catY)

    // Check obstacle collisions
    for (const obs of g.obstacles) {
      const obsLeft = Math.floor(obs.x)
      const obsRight = obsLeft + obs.size.width
      const obsTop = obs.y - obs.size.height + 1
      const obsBottom = obs.y

      if (catRight > obsLeft && catLeft < obsRight &&
          catBottom >= obsTop && catTop <= obsBottom) {
        setGameState('lost')
        return
      }
    }

    // Check coin collisions
    for (let i = g.coins.length - 1; i >= 0; i--) {
      const coin = g.coins[i]
      const coinX = Math.floor(coin.x)

      if (catRight > coinX && catLeft < coinX + 1 &&
          catBottom >= coin.y && catTop <= coin.y) {
        g.coins.splice(i, 1)
        g.score += 5
        g.coinsCollected++
      }
    }

    // Trigger single render
    setRenderTick(t => t + 1)
  }, gameState === 'playing')

  // Render the game using pre-allocated buffer
  const renderGame = useCallback(() => {
    const g = gameRef.current

    // Clear grid (reuse buffer)
    clearGrid()

    // Draw ground with scrolling grass (inline for performance)
    const grassRow = gridBuffer[GROUND_Y + 1]
    if (grassRow) {
      const patternLen = GRASS_PATTERN.length
      const offset = g.grassOffset
      for (let x = 0; x < GAME_WIDTH; x++) {
        const idx = Math.floor((x + offset) % patternLen)
        grassRow[x] = GRASS_PATTERN[idx]
      }
    }

    // Draw coins
    for (const coin of g.coins) {
      drawChar(gridBuffer, COIN_CHAR, coin.x, coin.y)
    }

    // Draw cat
    const isInAir = g.catY < GROUND_Y
    const catSprite = isInAir ? CAT_JUMP : CAT_NORMAL
    drawSprite(gridBuffer, catSprite, CAT_X, Math.floor(g.catY))

    // Draw obstacles
    for (const obs of g.obstacles) {
      drawSprite(gridBuffer, obs.sprite, obs.x, obs.y)
    }

    return renderGridFast()
  }, [])

  // Mobile controls config
  const mobileControlsConfig = useMemo(() => ({
    showDpad: true,
    showUp: false,
    showDown: false,
    showLeft: false,
    showRight: false,
    dpadOpacity: 0.2,
    actionButtons: [{ label: 'JUMP', onPress: jump }],
  }), [jump])

  // Info panel wrapper that reads from ref
  const InfoPanelWrapper = useCallback(() => {
    const g = gameRef.current
    return <GameInfoPanel items={[
      { label: 'SCORE', value: g.score },
      { label: 'COINS', value: g.coinsCollected },
      { label: 'JUMPS', value: `${g.jumpsRemaining}/${MAX_JUMPS}` },
    ]} />
  }, [])

  // Get overlay config for lost state
  const getOverlayConfig = useCallback(() => {
    if (gameState !== 'lost') return GAME_CONFIG
    const g = gameRef.current
    return {
      ...GAME_CONFIG,
      lostStats: [
        { label: 'Score', value: `${g.score} | Coins: ${g.coinsCollected}` },
        { label: 'Obstacles Passed', value: g.obstaclesPassed },
      ],
    }
  }, [gameState])

  // Dummy keysHeldRef for MobileGamepad (Jump only uses onPress)
  const keysHeldRef = useRef({})

  // MobileControls component
  const MobileControls = useCallback(() => (
    <MobileGamepad keysHeldRef={keysHeldRef} config={mobileControlsConfig} />
  ), [mobileControlsConfig])

  return (
    <GameLayout
      gameWidth={GAME_WIDTH}
      gameHeight={GAME_HEIGHT}
      renderGame={renderGame}
      InfoPanel={InfoPanelWrapper}
      MobileControls={MobileControls}
      onFieldClick={jump}
      overlayContent={<GameOverlay gameState={gameState} countdown={countdown} gameConfig={getOverlayConfig()} />}
    />
  )
}
