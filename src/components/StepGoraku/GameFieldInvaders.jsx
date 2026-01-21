import { useState, useRef, useCallback } from 'preact/hooks'
import {
  useGameLoop,
  useHeldKeys,
  useCountdown,
  createGrid,
  drawSprite,
  drawChar,
  renderGrid,
  checkCollision,
  clamp,
} from './shared/asciiGameEngine.js'
import GameLayout from './shared/GameLayout.jsx'
import GameInfoPanel from './shared/GameInfoPanel.jsx'
import GameOverlay from './shared/GameOverlay.jsx'
import MobileGamepad from './shared/MobileGamepad.jsx'

const GAME_WIDTH = 50
const GAME_HEIGHT = 50
const PLAYER_Y = GAME_HEIGHT - 3
const PLAYER_SPEED = 0.5
const BULLET_SPEED = 0.8
const ENEMY_SPEED_INITIAL = 0.15
const ENEMY_DROP = 0.5 // Slower descent
const SHOOT_COOLDOWN = 15 // frames

// Player ship (torii gate shape)
const PLAYER_SPRITE = [
  ' /|\\ ',
  '/===\\',
]

// Enemy sprites (yokai-themed)
const ENEMY_SPRITES = [
  // Oni (demon)
  [
    '/\\o/\\',
    '\\===/',
  ],
  // Kappa (turtle creature)
  [
    ' @_@ ',
    '<===>'
  ],
  // Tengu (long-nose goblin)
  [
    ' >o< ',
    '/vvv\\'
  ],
]

// Bullet
const BULLET_CHAR = '|'
const ENEMY_BULLET_CHAR = '.'

// Speed increases more gradually for endless mode
const SPEED_INCREMENT_PER_WAVE = 0.008

// Game configuration for overlay
const GAME_CONFIG = {
  title: 'YOKAI INVADERS',
  instructions: ['Defend against the yokai!'],
  subtitle: 'Survive as long as you can',
  lostTitle: 'GAME ENDED',
  lostMessage: 'The yokai won!',
}

/**
 * GameFieldInvaders - Space Invaders with Japanese yokai theme
 * Defend against waves of yokai!
 */
export default function GameFieldInvaders({ onGameComplete }) {
  const [gameState, setGameState] = useState('ready')
  const [playerX, setPlayerX] = useState(GAME_WIDTH / 2 - 2)
  const [bullets, setBullets] = useState([])
  const [enemyBullets, setEnemyBullets] = useState([])
  const [enemies, setEnemies] = useState([])
  const [enemyDirection, setEnemyDirection] = useState(1)
  const [score, setScore] = useState(0)
  const [wave, setWave] = useState(1)
  const [lives, setLives] = useState(3)

  const shootCooldownRef = useRef(0)
  const enemySpeedRef = useRef(ENEMY_SPEED_INITIAL)

  // Initialize enemies for a wave
  const initEnemies = useCallback((waveNum) => {
    const rows = Math.min(3 + Math.floor(waveNum / 2), 5)
    const cols = Math.min(6 + waveNum, 10)
    const newEnemies = []

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        newEnemies.push({
          id: `${row}-${col}`,
          x: 3 + col * 5,
          y: 2 + row * 3,
          type: row % 3,
          alive: true,
        })
      }
    }

    return newEnemies
  }, [])

  // Reset game state
  const resetGame = useCallback(() => {
    setPlayerX(GAME_WIDTH / 2 - 2)
    setBullets([])
    setEnemyBullets([])
    setEnemies(initEnemies(1))
    setEnemyDirection(1)
    setScore(0)
    setWave(1)
    setLives(3)
    shootCooldownRef.current = 0
    enemySpeedRef.current = ENEMY_SPEED_INITIAL
  }, [initEnemies])

  // Actually start playing after countdown
  const beginPlaying = useCallback(() => {
    setGameState('playing')
  }, [])

  // Countdown hook
  const { countdown, startCountdown, isCountingDown } = useCountdown(3, beginPlaying)

  // Start the game (triggers countdown)
  const startGame = useCallback(() => {
    resetGame()
    setGameState('countdown')
    startCountdown()
  }, [resetGame, startCountdown])

  // Handle single-press actions (start game on shoot when not playing)
  // Standard actions: 'up' and 'action' both used for shooting
  const handleKeyAction = useCallback((action) => {
    if ((action === 'up' || action === 'action') && gameState !== 'playing' && gameState !== 'countdown') {
      startGame()
    }
  }, [gameState, startGame])

  // Track held keys for continuous movement
  // Uses standard actions: left, right (movement), up and action (shooting)
  const keysHeldRef = useHeldKeys(['left', 'right', 'up', 'action'], { onKeyDown: handleKeyAction })

  // Game loop
  useGameLoop((deltaTime) => {
    // Player movement
    if (keysHeldRef.current.left) {
      setPlayerX(x => clamp(x - PLAYER_SPEED * deltaTime, 1, GAME_WIDTH - 6))
    }
    if (keysHeldRef.current.right) {
      setPlayerX(x => clamp(x + PLAYER_SPEED * deltaTime, 1, GAME_WIDTH - 6))
    }

    // Shooting (both 'up' and 'action' keys trigger shooting)
    shootCooldownRef.current = Math.max(0, shootCooldownRef.current - deltaTime)
    const isShooting = keysHeldRef.current.up || keysHeldRef.current.action
    if (isShooting && shootCooldownRef.current <= 0) {
      setBullets(prev => [...prev, {
        id: Date.now(),
        x: playerX + 2,
        y: PLAYER_Y - 1,
      }])
      shootCooldownRef.current = SHOOT_COOLDOWN
    }

    // Update player bullets
    setBullets(prev => prev
      .map(b => ({ ...b, y: b.y - BULLET_SPEED * deltaTime }))
      .filter(b => b.y > 0)
    )

    // Update enemy bullets
    setEnemyBullets(prev => prev
      .map(b => ({ ...b, y: b.y + BULLET_SPEED * 0.5 * deltaTime }))
      .filter(b => b.y < GAME_HEIGHT)
    )

    // Update enemies
    setEnemies(prev => {
      const aliveEnemies = prev.filter(e => e.alive)
      if (aliveEnemies.length === 0) return prev

      // Check if any enemy hit the edge
      const minX = Math.min(...aliveEnemies.map(e => e.x))
      const maxX = Math.max(...aliveEnemies.map(e => e.x + 5))

      let newDirection = enemyDirection
      let shouldDrop = false

      if (maxX >= GAME_WIDTH - 1 && enemyDirection > 0) {
        newDirection = -1
        shouldDrop = true
      } else if (minX <= 1 && enemyDirection < 0) {
        newDirection = 1
        shouldDrop = true
      }

      if (newDirection !== enemyDirection) {
        setEnemyDirection(newDirection)
      }

      return prev.map(e => ({
        ...e,
        x: e.x + enemySpeedRef.current * enemyDirection * deltaTime,
        y: shouldDrop ? e.y + ENEMY_DROP : e.y,
      }))
    })

    // Enemy shooting (random)
    setEnemies(prev => {
      const aliveEnemies = prev.filter(e => e.alive)
      if (aliveEnemies.length > 0 && Math.random() < 0.01 * deltaTime) {
        const shooter = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)]
        setEnemyBullets(bullets => [...bullets, {
          id: Date.now() + Math.random(),
          x: shooter.x + 2,
          y: shooter.y + 2,
        }])
      }
      return prev
    })

    // Collision: player bullets vs enemies
    setBullets(prevBullets => {
      let remainingBullets = [...prevBullets]

      setEnemies(prevEnemies => {
        return prevEnemies.map(enemy => {
          if (!enemy.alive) return enemy

          const enemyRect = {
            x: Math.floor(enemy.x),
            y: enemy.y + 1,
            width: 5,
            height: 2,
          }

          const hitBullet = remainingBullets.find(b => {
            const bulletRect = { x: Math.floor(b.x), y: Math.floor(b.y), width: 1, height: 1 }
            return checkCollision(bulletRect, enemyRect)
          })

          if (hitBullet) {
            remainingBullets = remainingBullets.filter(b => b.id !== hitBullet.id)
            setScore(s => s + (3 - enemy.type) * 50)
            return { ...enemy, alive: false }
          }

          return enemy
        })
      })

      return remainingBullets
    })

    // Collision: enemy bullets vs player
    setEnemyBullets(prev => {
      const playerRect = {
        x: Math.floor(playerX),
        y: PLAYER_Y,
        width: 5,
        height: 2,
      }

      const hitBullet = prev.find(b => {
        const bulletRect = { x: Math.floor(b.x), y: Math.floor(b.y), width: 1, height: 1 }
        return checkCollision(bulletRect, playerRect)
      })

      if (hitBullet) {
        setLives(l => {
          const newLives = l - 1
          if (newLives <= 0) {
            setGameState('lost')
          }
          return newLives
        })
        return prev.filter(b => b.id !== hitBullet.id)
      }

      return prev
    })

    // Check if enemies reached the bottom
    setEnemies(prev => {
      const reachedBottom = prev.some(e => e.alive && e.y >= PLAYER_Y - 2)
      if (reachedBottom) {
        setGameState('lost')
      }
      return prev
    })

    // Check wave completion
    setEnemies(prev => {
      const aliveCount = prev.filter(e => e.alive).length
      if (aliveCount === 0 && prev.length > 0) {
        setWave(w => {
          const nextWave = w + 1
          // Endless mode - speed increases gradually
          setEnemies(initEnemies(nextWave))
          setEnemyBullets([])
          enemySpeedRef.current = ENEMY_SPEED_INITIAL + (nextWave - 1) * SPEED_INCREMENT_PER_WAVE
          return nextWave
        })
      }
      return prev
    })
  }, gameState === 'playing')

  // Render the game
  const renderGame = () => {
    const grid = createGrid(GAME_WIDTH, GAME_HEIGHT)

    // Draw player
    drawSprite(grid, PLAYER_SPRITE, playerX, PLAYER_Y)

    // Draw enemies
    enemies.filter(e => e.alive).forEach(enemy => {
      const sprite = ENEMY_SPRITES[enemy.type]
      drawSprite(grid, sprite, enemy.x, enemy.y + 1)
    })

    // Draw player bullets
    bullets.forEach(b => {
      drawChar(grid, BULLET_CHAR, b.x, b.y)
    })

    // Draw enemy bullets
    enemyBullets.forEach(b => {
      drawChar(grid, ENEMY_BULLET_CHAR, b.x, b.y)
    })

    // Draw lives
    for (let i = 0; i < lives; i++) {
      drawChar(grid, '♥', 1 + i * 2, GAME_HEIGHT - 1)
    }

    return renderGrid(grid)
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
      { label: 'WAVE', value: wave },
      { label: 'TOKENS', value: 100 },
    ]} />
  ), [score, wave])

  // Mobile Controls component
  const MobileControls = useCallback(() => (
    <MobileGamepad keysHeldRef={keysHeldRef} config={{
      showUp: false,
      showDown: false,
      showLeft: true,
      showRight: true,
      actionButtons: [{ label: 'FIRE', key: 'action' }],
    }} />
  ), [])

  // Get overlay config for lost state
  const getOverlayConfig = useCallback(() => {
    if (gameState !== 'lost') return GAME_CONFIG
    return {
      ...GAME_CONFIG,
      lostStats: [
        { label: 'Score', value: score },
        { label: 'Wave', value: wave },
      ],
    }
  }, [gameState, score, wave])

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
