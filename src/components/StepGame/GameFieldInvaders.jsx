import { useState, useEffect, useRef, useCallback } from 'preact/hooks'
import {
  useGameLoop,
  useKeyInput,
  useResponsiveFontSize,
  useIsMobile,
  createGrid,
  drawSprite,
  drawChar,
  renderGrid,
  checkCollision,
  getSpriteSize,
  clamp,
  GAME_STYLES,
} from './lib/asciiGameEngine.js'

const GAME_WIDTH = 50
const GAME_HEIGHT = 28
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
const ENEMY_BULLET_CHAR = 'v'

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

  const containerRef = useRef(null)
  const shootCooldownRef = useRef(0)
  const enemySpeedRef = useRef(ENEMY_SPEED_INITIAL)
  const keysHeldRef = useRef({ left: false, right: false, shoot: false })

  // Check if on mobile device
  const isMobile = useIsMobile()

  // Calculate responsive font size based on container
  const fontSize = useResponsiveFontSize(containerRef, GAME_WIDTH, GAME_HEIGHT)

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
    keysHeldRef.current = { left: false, right: false, shoot: false }
  }, [initEnemies])

  // Start the game
  const startGame = useCallback(() => {
    resetGame()
    setGameState('playing')
  }, [resetGame])

  // Handle input
  const handleKeyDown = useCallback((action) => {
    if (gameState !== 'playing') {
      if (action === 'SHOOT' || action === 'UP') {
        startGame()
      }
      return
    }

    if (action === 'LEFT') keysHeldRef.current.left = true
    if (action === 'RIGHT') keysHeldRef.current.right = true
    if (action === 'SHOOT' || action === 'UP') keysHeldRef.current.shoot = true
  }, [gameState, startGame])

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
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        keysHeldRef.current.shoot = false
      }
    }

    window.addEventListener('keyup', handleKeyUp)
    return () => window.removeEventListener('keyup', handleKeyUp)
  }, [gameState])

  const keyMap = {
    ArrowLeft: 'LEFT', a: 'LEFT', A: 'LEFT',
    ArrowRight: 'RIGHT', d: 'RIGHT', D: 'RIGHT',
    Space: 'SHOOT', ArrowUp: 'UP', w: 'UP', W: 'UP',
  }

  useKeyInput(keyMap, handleKeyDown, true)

  // Game loop
  useGameLoop((deltaTime) => {
    // Player movement
    if (keysHeldRef.current.left) {
      setPlayerX(x => clamp(x - PLAYER_SPEED * deltaTime, 1, GAME_WIDTH - 6))
    }
    if (keysHeldRef.current.right) {
      setPlayerX(x => clamp(x + PLAYER_SPEED * deltaTime, 1, GAME_WIDTH - 6))
    }

    // Shooting
    shootCooldownRef.current = Math.max(0, shootCooldownRef.current - deltaTime)
    if (keysHeldRef.current.shoot && shootCooldownRef.current <= 0) {
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
          if (nextWave > 5) {
            setGameState('won')
            return w
          }
          setEnemies(initEnemies(nextWave))
          setEnemyBullets([])
          enemySpeedRef.current = ENEMY_SPEED_INITIAL + (nextWave - 1) * 0.02
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
        <span>WAVE: {wave}/5</span>
      </div>

      {/* Game Field */}
      <div style={fieldStyle}>
        {renderGame()}

        {/* Overlay for game states */}
        {gameState !== 'playing' && (
          <div style={GAME_STYLES.overlay}>
            {gameState === 'ready' && (
              <>
                <div style={{ fontSize: '20px', marginBottom: '10px' }}>YOKAI INVADERS</div>
                <div style={{ marginBottom: '5px' }}>Defend against the yokai!</div>
                <div style={{ marginBottom: '15px', fontSize: '12px' }}>Survive 5 waves to win</div>
                <div style={{ color: 'var(--color-primary)' }}>
                  [SPACE] to START
                </div>
              </>
            )}
            {gameState === 'won' && (
              <>
                <div style={{ fontSize: '24px', marginBottom: '10px', color: 'var(--color-primary)' }}>
                  VICTORY!
                </div>
                <div style={{ marginBottom: '5px' }}>Final Score: {score}</div>
                <div style={{ marginBottom: '15px' }}>The yokai are defeated!</div>
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
                <div style={{ marginBottom: '5px' }}>Wave: {wave}/5</div>
                <div style={{ marginBottom: '15px' }}>The yokai won!</div>
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
        ARROWS/WASD to move, SPACE to shoot
      </div>

      {/* Mobile Controls - only shown on touch devices */}
      {isMobile && (
        <div style={{ ...GAME_STYLES.mobileControls, display: 'flex' }}>
          <div style={GAME_STYLES.mobileControlRow}>
            <button
              style={GAME_STYLES.mobileButtonWide}
              onTouchStart={(e) => { e.preventDefault(); keysHeldRef.current.shoot = true }}
              onTouchEnd={(e) => { e.preventDefault(); keysHeldRef.current.shoot = false }}
              onTouchCancel={(e) => { e.preventDefault(); keysHeldRef.current.shoot = false }}
              onClick={() => handleKeyDown('SHOOT')}
            >FIRE</button>
          </div>
          <div style={GAME_STYLES.mobileControlRow}>
            <button
              style={GAME_STYLES.mobileButton}
              onTouchStart={(e) => { e.preventDefault(); keysHeldRef.current.left = true }}
              onTouchEnd={(e) => { e.preventDefault(); keysHeldRef.current.left = false }}
              onTouchCancel={(e) => { e.preventDefault(); keysHeldRef.current.left = false }}
              onClick={() => handleKeyDown('LEFT')}
            >◀</button>
            <button
              style={{ ...GAME_STYLES.mobileButton, width: '50px', visibility: 'hidden' }}
            ></button>
            <button
              style={GAME_STYLES.mobileButton}
              onTouchStart={(e) => { e.preventDefault(); keysHeldRef.current.right = true }}
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
