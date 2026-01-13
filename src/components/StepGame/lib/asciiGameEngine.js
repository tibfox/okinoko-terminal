/**
 * ASCII Game Engine - Shared utilities for ASCII-based games
 */
import { useState, useEffect, useRef, useCallback } from 'preact/hooks'

/**
 * Hook to calculate responsive font size based on container size and game dimensions
 * @param {Object} containerRef - React ref to the container element
 * @param {number} gameWidth - Number of characters wide
 * @param {number} gameHeight - Number of rows tall
 * @param {Object} options - Optional settings
 * @returns {number} Calculated font size in pixels
 */
export function useResponsiveFontSize(containerRef, gameWidth, gameHeight, options = {}) {
  const {
    minFontSize = 8,
    maxFontSize = 24,
    charWidthRatio = 0.6, // monospace char width is roughly 0.6 of font size
    lineHeightRatio = 1.2, // slightly more conservative line height
    horizontalPadding = 60, // container padding + field padding + borders
    verticalPadding = 120, // container padding + header + instructions + field padding
  } = options

  const [fontSize, setFontSize] = useState(14)

  useEffect(() => {
    const calculateFontSize = () => {
      if (!containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const availableWidth = rect.width - horizontalPadding
      const availableHeight = rect.height - verticalPadding

      // Calculate max font size that fits width
      const maxFontByWidth = availableWidth / (gameWidth * charWidthRatio)

      // Calculate max font size that fits height
      const maxFontByHeight = availableHeight / (gameHeight * lineHeightRatio)

      // Use the smaller of the two, clamped to min/max
      const optimalSize = Math.min(maxFontByWidth, maxFontByHeight)
      const clampedSize = Math.max(minFontSize, Math.min(maxFontSize, optimalSize))

      setFontSize(Math.floor(clampedSize))
    }

    calculateFontSize()

    // Use ResizeObserver to watch for container size changes
    const resizeObserver = new ResizeObserver(calculateFontSize)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => resizeObserver.disconnect()
  }, [containerRef, gameWidth, gameHeight, minFontSize, maxFontSize, charWidthRatio, lineHeightRatio, horizontalPadding, verticalPadding])

  return fontSize
}

/**
 * Game loop hook with deltaTime normalization
 * @param {function} callback - Called each frame with (deltaTime) normalized to ~60fps
 * @param {boolean} active - Whether the game loop is running
 */
export function useGameLoop(callback, active = true) {
  const frameRef = useRef(null)
  const lastTimeRef = useRef(0)
  const callbackRef = useRef(callback)

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    if (!active) {
      lastTimeRef.current = 0
      return
    }

    const loop = (timestamp) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp
      const deltaTime = (timestamp - lastTimeRef.current) / 16 // Normalize to ~60fps
      lastTimeRef.current = timestamp

      callbackRef.current(deltaTime)
      frameRef.current = requestAnimationFrame(loop)
    }

    frameRef.current = requestAnimationFrame(loop)

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [active])
}

/**
 * Keyboard input hook
 * @param {Object} keyMap - Map of key codes to action names
 * @param {function} handler - Called with (action, event) on keydown
 * @param {boolean} active - Whether to listen for input
 */
export function useKeyInput(keyMap, handler, active = true) {
  const handlerRef = useRef(handler)

  useEffect(() => {
    handlerRef.current = handler
  }, [handler])

  useEffect(() => {
    if (!active) return

    const handleKeyDown = (e) => {
      const action = keyMap[e.code] || keyMap[e.key]
      if (action) {
        e.preventDefault()
        handlerRef.current(action, e)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [keyMap, active])
}

/**
 * Create an empty game grid
 * @param {number} width - Grid width
 * @param {number} height - Grid height
 * @param {string} fill - Character to fill with (default: space)
 * @returns {string[][]} 2D array of characters
 */
export function createGrid(width, height, fill = ' ') {
  const grid = []
  for (let y = 0; y < height; y++) {
    grid.push(Array(width).fill(fill))
  }
  return grid
}

/**
 * Draw a sprite (array of strings) onto a grid
 * @param {string[][]} grid - The game grid
 * @param {string[]} sprite - Array of strings representing the sprite
 * @param {number} x - X position (left edge)
 * @param {number} y - Y position (bottom edge of sprite)
 * @param {boolean} transparent - If true, spaces in sprite don't overwrite grid
 */
export function drawSprite(grid, sprite, x, y, transparent = true) {
  const height = grid.length
  const width = grid[0]?.length || 0
  const spriteHeight = sprite.length

  sprite.forEach((row, i) => {
    const drawY = Math.floor(y) - spriteHeight + 1 + i
    if (drawY >= 0 && drawY < height) {
      for (let j = 0; j < row.length; j++) {
        const drawX = Math.floor(x) + j
        if (drawX >= 0 && drawX < width) {
          if (!transparent || row[j] !== ' ') {
            grid[drawY][drawX] = row[j]
          }
        }
      }
    }
  })
}

/**
 * Draw a single character at a position
 * @param {string[][]} grid - The game grid
 * @param {string} char - Character to draw
 * @param {number} x - X position
 * @param {number} y - Y position
 */
export function drawChar(grid, char, x, y) {
  const height = grid.length
  const width = grid[0]?.length || 0
  const drawX = Math.floor(x)
  const drawY = Math.floor(y)

  if (drawX >= 0 && drawX < width && drawY >= 0 && drawY < height) {
    grid[drawY][drawX] = char
  }
}

/**
 * Draw text horizontally on the grid
 * @param {string[][]} grid - The game grid
 * @param {string} text - Text to draw
 * @param {number} x - Starting X position
 * @param {number} y - Y position
 */
export function drawText(grid, text, x, y) {
  const height = grid.length
  const width = grid[0]?.length || 0
  const drawY = Math.floor(y)

  if (drawY < 0 || drawY >= height) return

  for (let i = 0; i < text.length; i++) {
    const drawX = Math.floor(x) + i
    if (drawX >= 0 && drawX < width) {
      grid[drawY][drawX] = text[i]
    }
  }
}

/**
 * Get sprite dimensions
 * @param {string[]} sprite - Array of strings representing the sprite
 * @returns {{ width: number, height: number }}
 */
export function getSpriteSize(sprite) {
  return {
    width: Math.max(...sprite.map(row => row.length)),
    height: sprite.length,
  }
}

/**
 * Check AABB collision between two rectangles
 * @param {Object} a - First rect { x, y, width, height } (y is bottom)
 * @param {Object} b - Second rect { x, y, width, height } (y is bottom)
 * @returns {boolean}
 */
export function checkCollision(a, b) {
  const aLeft = a.x
  const aRight = a.x + a.width
  const aTop = a.y - a.height + 1
  const aBottom = a.y

  const bLeft = b.x
  const bRight = b.x + b.width
  const bTop = b.y - b.height + 1
  const bBottom = b.y

  return aRight > bLeft && aLeft < bRight && aBottom >= bTop && aTop <= bBottom
}

/**
 * Check if a point is inside a rectangle
 * @param {number} px - Point X
 * @param {number} py - Point Y
 * @param {Object} rect - Rectangle { x, y, width, height }
 * @returns {boolean}
 */
export function pointInRect(px, py, rect) {
  return px >= rect.x && px < rect.x + rect.width &&
         py >= rect.y - rect.height + 1 && py <= rect.y
}

/**
 * Create a scrolling pattern for backgrounds
 * @param {string} pattern - Pattern string to repeat
 * @param {number} offset - Current scroll offset
 * @param {number} width - Output width
 * @returns {string} Scrolled pattern string
 */
export function scrollPattern(pattern, offset, width) {
  const result = []
  for (let x = 0; x < width; x++) {
    const patternIndex = Math.floor((x + offset) % pattern.length)
    result.push(pattern[patternIndex])
  }
  return result.join('')
}

/**
 * Fill a row with a scrolling pattern
 * @param {string[][]} grid - The game grid
 * @param {number} y - Row to fill
 * @param {string} pattern - Pattern to repeat
 * @param {number} offset - Scroll offset
 */
export function fillRowWithPattern(grid, y, pattern, offset) {
  const width = grid[0]?.length || 0
  if (y < 0 || y >= grid.length) return

  for (let x = 0; x < width; x++) {
    const patternIndex = Math.floor((x + offset) % pattern.length)
    grid[y][x] = pattern[patternIndex]
  }
}

/**
 * Render grid to string
 * @param {string[][]} grid - The game grid
 * @returns {string} Rendered grid
 */
export function renderGrid(grid) {
  return grid.map(row => row.join('')).join('\n')
}

/**
 * Wrap a value within bounds (for snake/pacman style wrapping)
 * @param {number} value - Current value
 * @param {number} min - Minimum (inclusive)
 * @param {number} max - Maximum (exclusive)
 * @returns {number} Wrapped value
 */
export function wrap(value, min, max) {
  const range = max - min
  return ((value - min) % range + range) % range + min
}

/**
 * Clamp a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum
 * @param {number} max - Maximum
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

/**
 * Linear interpolation
 * @param {number} a - Start value
 * @param {number} b - End value
 * @param {number} t - Progress (0-1)
 * @returns {number}
 */
export function lerp(a, b, t) {
  return a + (b - a) * t
}

/**
 * Random integer between min (inclusive) and max (exclusive)
 * @param {number} min - Minimum
 * @param {number} max - Maximum
 * @returns {number}
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min
}

/**
 * Pick a random element from an array
 * @param {Array} array - Array to pick from
 * @returns {*} Random element
 */
export function randomPick(array) {
  return array[Math.floor(Math.random() * array.length)]
}

/**
 * Check if device is mobile/touch
 * @returns {boolean}
 */
export function isTouchDevice() {
  if (typeof window === 'undefined') return false
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

/**
 * Hook to detect mobile/touch device
 * @returns {boolean}
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      // Check for touch capability and small screen
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const isSmallScreen = window.innerWidth <= 768
      setIsMobile(hasTouch || isSmallScreen)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile
}

/**
 * Direction vectors for common movement
 */
export const DIRECTIONS = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
}

/**
 * Common key mappings
 */
export const KEY_MAPS = {
  ARROWS: {
    ArrowUp: 'UP',
    ArrowDown: 'DOWN',
    ArrowLeft: 'LEFT',
    ArrowRight: 'RIGHT',
  },
  WASD: {
    w: 'UP', W: 'UP',
    s: 'DOWN', S: 'DOWN',
    a: 'LEFT', A: 'LEFT',
    d: 'RIGHT', D: 'RIGHT',
  },
  ARROWS_AND_WASD: {
    ArrowUp: 'UP', w: 'UP', W: 'UP',
    ArrowDown: 'DOWN', s: 'DOWN', S: 'DOWN',
    ArrowLeft: 'LEFT', a: 'LEFT', A: 'LEFT',
    ArrowRight: 'RIGHT', d: 'RIGHT', D: 'RIGHT',
  },
  JUMP: {
    Space: 'JUMP',
    ArrowUp: 'JUMP',
    w: 'JUMP', W: 'JUMP',
  },
}

/**
 * Standard game container styles
 */
export const GAME_STYLES = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
    padding: '20px',
    cursor: 'pointer',
    userSelect: 'none',
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '10px',
    fontFamily: 'monospace',
    fontSize: 'var(--font-size-base)',
    color: 'var(--color-primary-lighter)',
  },
  field: {
    fontFamily: 'monospace',
    fontSize: 'clamp(10px, min(2.5vw, 2.5vh), 18px)',
    lineHeight: '1.1',
    whiteSpace: 'pre',
    background: 'rgba(0, 0, 0, 0.5)',
    padding: '10px',
    border: '1px solid var(--color-primary-darkest)',
    color: 'var(--color-primary)',
    position: 'relative',
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0, 0, 0, 0.7)',
    color: 'var(--color-primary-lighter)',
    textAlign: 'center',
  },
  instructions: {
    marginTop: '15px',
    fontFamily: 'monospace',
    fontSize: '12px',
    color: 'var(--color-primary-darker)',
    textAlign: 'center',
  },
  // Mobile touch controls - hidden on desktop via media query workaround
  mobileControls: {
    display: 'none', // Hidden by default, shown via JS check
    flexDirection: 'column',
    alignItems: 'center',
    gap: '5px',
    marginTop: '15px',
  },
  mobileControlRow: {
    display: 'flex',
    gap: '5px',
  },
  mobileButton: {
    width: '50px',
    height: '50px',
    fontSize: '20px',
    background: 'rgba(0, 0, 0, 0.6)',
    border: '1px solid var(--color-primary-darker)',
    color: 'var(--color-primary)',
    borderRadius: '8px',
    cursor: 'pointer',
    touchAction: 'manipulation',
    userSelect: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileButtonWide: {
    width: '110px',
    height: '50px',
    fontSize: '14px',
    background: 'rgba(0, 0, 0, 0.6)',
    border: '1px solid var(--color-primary-darker)',
    color: 'var(--color-primary)',
    borderRadius: '8px',
    cursor: 'pointer',
    touchAction: 'manipulation',
    userSelect: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
}
