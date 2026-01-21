/**
 * ASCII Game Engine - Shared utilities for ASCII-based games
 */
import { useState, useEffect, useRef, useCallback } from 'preact/hooks'

/**
 * Hook to calculate square container size based on available space
 * Uses the smaller of width/height to create a square
 * @param {Object} parentRef - React ref to the parent element
 * @param {number} padding - Padding to subtract from available space (default 40)
 * @returns {number} Square size in pixels
 */
export function useSquareSize(parentRef, padding = 40) {
  const [size, setSize] = useState(400)

  useEffect(() => {
    const calculateSize = () => {
      if (!parentRef.current) return

      const rect = parentRef.current.getBoundingClientRect()
      const availableWidth = rect.width - padding
      const availableHeight = rect.height - padding
      const squareSize = Math.min(availableWidth, availableHeight)
      setSize(Math.max(200, squareSize)) // minimum 200px
    }

    calculateSize()

    const resizeObserver = new ResizeObserver(calculateSize)
    if (parentRef.current) {
      resizeObserver.observe(parentRef.current)
    }

    return () => resizeObserver.disconnect()
  }, [parentRef, padding])

  return size
}

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
    minFontSize = 6,
    maxFontSize = 32,
    charWidthRatio = 0.6, // monospace char width is roughly 0.6 of font size
    lineHeightRatio = 1.0, // line height for the game field
  } = options

  const [fontSize, setFontSize] = useState(14)

  useEffect(() => {
    const calculateFontSize = () => {
      if (!containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()

      // Account for borders and padding
      const padding = 20 // border + any internal padding
      const availableWidth = rect.width - padding
      const availableHeight = rect.height - padding

      // Calculate font size needed to fit the game grid
      const fontByWidth = availableWidth / (gameWidth * charWidthRatio)
      const fontByHeight = availableHeight / (gameHeight * lineHeightRatio)

      // Use the smaller dimension as the limiting factor
      const optimalSize = Math.min(fontByWidth, fontByHeight)
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
  }, [containerRef, gameWidth, gameHeight, minFontSize, maxFontSize, charWidthRatio, lineHeightRatio])

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
 * Keyboard input hook (for single-press actions like direction changes)
 * @param {Object} keyMap - Map of key codes to action names
 * @param {function} handler - Called with (action, event) on keydown
 * @param {boolean} active - Whether to listen for input
 */
export function useKeyInput(keyMap, handler, active = true) {
  const handlerRef = useRef(handler)
  const keyMapRef = useRef(keyMap)

  useEffect(() => {
    handlerRef.current = handler
    keyMapRef.current = keyMap
  })

  useEffect(() => {
    if (!active) return

    const handleKeyDown = (e) => {
      const action = keyMapRef.current[e.code] || keyMapRef.current[e.key]
      if (action) {
        e.preventDefault()
        e.stopPropagation()
        // For single-press actions, we actually want repeats for responsive feel
        // But only call handler - let the game logic decide how to handle it
        handlerRef.current(action, e)
      }
    }

    // Use capture phase on document to ensure we get events first
    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [active])
}

/**
 * Buffered keyboard input hook - queues keypresses for games that process input at fixed intervals
 * @param {Object} keyMap - Map of key codes to action names
 * @param {boolean} active - Whether to listen for input
 * @param {number} maxBufferSize - Maximum number of buffered commands (default 5)
 * @returns {{ buffer: Object, consumeOne: function, consumeAll: function, clear: function }}
 */
export function useBufferedKeyInput(keyMap, active = true, maxBufferSize = 5) {
  const bufferRef = useRef([])
  const keyMapRef = useRef(keyMap)

  useEffect(() => {
    keyMapRef.current = keyMap
  })

  useEffect(() => {
    if (!active) {
      bufferRef.current = []
      return
    }

    const handleKeyDown = (e) => {
      const action = keyMapRef.current[e.code] || keyMapRef.current[e.key]
      if (action) {
        e.preventDefault()
        e.stopPropagation()
        // Don't buffer repeated keys (held down)
        if (!e.repeat && bufferRef.current.length < maxBufferSize) {
          bufferRef.current.push(action)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [active, maxBufferSize])

  // Consume one action from the buffer
  const consumeOne = useCallback(() => {
    return bufferRef.current.shift() || null
  }, [])

  // Consume all actions from the buffer
  const consumeAll = useCallback(() => {
    const actions = [...bufferRef.current]
    bufferRef.current = []
    return actions
  }, [])

  // Clear the buffer
  const clear = useCallback(() => {
    bufferRef.current = []
  }, [])

  // Manually add an action to the buffer (for mobile controls)
  const addAction = useCallback((action) => {
    if (bufferRef.current.length < maxBufferSize) {
      bufferRef.current.push(action)
    }
  }, [maxBufferSize])

  return { buffer: bufferRef, consumeOne, consumeAll, clear, addAction }
}

/**
 * Standard key bindings - maps e.code and e.key to action names
 * Supports both arrow keys and WASD
 * Includes both e.code values (like "KeyA") and e.key values (like "a")
 */
const STANDARD_KEY_BINDINGS = {
  // Arrow keys (e.code and e.key are the same)
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  // WASD - e.code values
  KeyA: 'left',
  KeyD: 'right',
  KeyW: 'up',
  KeyS: 'down',
  // WASD - e.key values (lowercase)
  a: 'left',
  d: 'right',
  w: 'up',
  s: 'down',
  // WASD - e.key values (uppercase, in case caps lock)
  A: 'left',
  D: 'right',
  W: 'up',
  S: 'down',
  // Space - e.code
  Space: 'action',
  // Space - e.key
  ' ': 'action',
}

/**
 * Hook for tracking held keys (for continuous movement)
 * Returns a ref object with boolean flags for each action
 * @param {string[]} actions - Array of action names the game supports (e.g., ['left', 'right', 'up', 'down', 'action'])
 * @param {Object} options - Optional callbacks for key events
 * @param {function} options.onKeyDown - Called with (action, event) on keydown (for single-press actions)
 * @param {function} options.onKeyUp - Called with (action, event) on keyup
 * @returns {Object} ref with held state for each action
 */
export function useHeldKeys(actions, options = {}) {
  const heldRef = useRef({})
  const actionsRef = useRef(actions)
  const onKeyDownRef = useRef(options.onKeyDown)
  const onKeyUpRef = useRef(options.onKeyUp)

  // Keep refs updated
  useEffect(() => {
    actionsRef.current = actions
    onKeyDownRef.current = options.onKeyDown
    onKeyUpRef.current = options.onKeyUp
  })

  // Set up event listeners only once
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check both e.code and e.key for compatibility across platforms
      const action = STANDARD_KEY_BINDINGS[e.code] || STANDARD_KEY_BINDINGS[e.key]
      if (action && actionsRef.current.includes(action)) {
        e.preventDefault()
        e.stopPropagation()

        const wasHeld = heldRef.current[action]
        // Always set held state to true on keydown (catches missed events)
        heldRef.current[action] = true

        // Only trigger onKeyDown callback on initial press, not repeats
        if (!wasHeld && !e.repeat && onKeyDownRef.current) {
          onKeyDownRef.current(action, e)
        }
      }
    }

    const handleKeyUp = (e) => {
      // Check both e.code and e.key for compatibility across platforms
      const action = STANDARD_KEY_BINDINGS[e.code] || STANDARD_KEY_BINDINGS[e.key]
      if (action && actionsRef.current.includes(action)) {
        e.stopPropagation()
        heldRef.current[action] = false
        if (onKeyUpRef.current) {
          onKeyUpRef.current(action, e)
        }
      }
    }

    // Clear all held keys when window loses focus (prevents stuck keys)
    const handleBlur = () => {
      Object.keys(heldRef.current).forEach(key => {
        heldRef.current[key] = false
      })
    }

    // Use capture phase on document to ensure we get events before other handlers
    document.addEventListener('keydown', handleKeyDown, true)
    document.addEventListener('keyup', handleKeyUp, true)
    window.addEventListener('blur', handleBlur)

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      document.removeEventListener('keyup', handleKeyUp, true)
      window.removeEventListener('blur', handleBlur)
    }
  }, []) // Empty deps - only set up once

  return heldRef
}

/**
 * Hook for countdown before game starts
 * @param {number} from - Starting number (default 3)
 * @param {function} onComplete - Called when countdown reaches 0
 * @returns {{ countdown: number|null, startCountdown: function, isCountingDown: boolean }}
 */
export function useCountdown(from = 3, onComplete) {
  const [countdown, setCountdown] = useState(null)
  const intervalRef = useRef(null)
  const onCompleteRef = useRef(onComplete)

  // Keep callback ref updated
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const startCountdown = useCallback(() => {
    // Clear any existing countdown
    if (intervalRef.current) clearInterval(intervalRef.current)

    setCountdown(from)

    intervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
          // Call onComplete after state update
          setTimeout(() => {
            if (onCompleteRef.current) onCompleteRef.current()
          }, 0)
          return null
        }
        return prev - 1
      })
    }, 1000)
  }, [from])

  return {
    countdown,
    startCountdown,
    isCountingDown: countdown !== null,
  }
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
  // Wrapper that fills parent - used to measure available space
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: '10px',
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  // Mobile-specific container with minimal padding
  containerMobile: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: '99%',
    padding: '5px',
    cursor: 'pointer',
    userSelect: 'none',
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '10px',
    fontFamily: 'monospace',
    fontSize: '1.05rem',
    color: 'var(--color-primary-lighter)',
  },
  field: {
    fontFamily: 'monospace',
    lineHeight: '1',
    whiteSpace: 'pre',
    background: 'rgba(0, 0, 0, 0.5)',
    border: '1px solid var(--color-primary-darkest)',
    color: 'var(--color-primary)',
    position: 'relative',
    boxSizing: 'border-box',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: '1 1 auto',
    minHeight: 0,
    cursor: 'pointer',
    userSelect: 'none',
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
  // Gamepad layout container
  gamepad: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    padding: '0 16px',
    boxSizing: 'border-box',
  },
  // D-pad (left side) - cross layout
  dpad: {
    display: 'grid',
    gridTemplateColumns: '44px 44px 44px',
    gridTemplateRows: '44px 44px 44px',
    gap: '2px',
  },
  dpadButton: {
    width: '44px',
    height: '44px',
    fontSize: '18px',
    background: 'rgba(0, 0, 0, 0.7)',
    border: '2px solid var(--color-primary-darker)',
    color: 'var(--color-primary)',
    borderRadius: '6px',
    cursor: 'pointer',
    touchAction: 'manipulation',
    userSelect: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadCenter: {
    width: '44px',
    height: '44px',
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '6px',
  },
  // Action buttons (right side) - circular/diagonal layout like SNES
  actionButtons: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  actionButtonRow: {
    display: 'flex',
    gap: '4px',
  },
  actionButton: {
    width: '48px',
    height: '48px',
    fontSize: '11px',
    fontWeight: 'bold',
    background: 'rgba(0, 0, 0, 0.7)',
    border: '2px solid var(--color-primary-darker)',
    color: 'var(--color-primary)',
    borderRadius: '50%',
    cursor: 'pointer',
    touchAction: 'manipulation',
    userSelect: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textTransform: 'uppercase',
  },
  actionButtonLarge: {
    width: '56px',
    height: '56px',
    fontSize: '12px',
    fontWeight: 'bold',
    background: 'rgba(0, 0, 0, 0.7)',
    border: '2px solid var(--color-primary-darker)',
    color: 'var(--color-primary)',
    borderRadius: '50%',
    cursor: 'pointer',
    touchAction: 'manipulation',
    userSelect: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textTransform: 'uppercase',
  },
  // Game info panel with border
  infoPanel: {
    border: '1px solid var(--color-primary-darker)',
    background: 'rgba(0, 0, 0, 0.5)',
    padding: '10px 15px',
    fontFamily: 'monospace',
    fontSize: '0.9rem',
    color: 'var(--color-primary-lighter)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    minWidth: '150px',
  },
  infoPanelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '15px',
  },
  infoPanelLabel: {
    color: 'var(--color-primary-darker)',
  },
  infoPanelValue: {
    color: 'var(--color-primary-lighter)',
    fontWeight: 'bold',
  },
  infoPanelInstructions: {
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '1px solid var(--color-primary-darkest)',
    fontSize: '0.8rem',
    color: 'var(--color-primary-darker)',
    lineHeight: '1.4',
  },
  // Mobile info panel (horizontal, single row)
  infoPanelMobile: {
    border: '1px solid var(--color-primary-darker)',
    background: 'rgba(0, 0, 0, 0.5)',
    padding: '8px 12px',
    fontFamily: 'monospace',
    fontSize: '0.85rem',
    color: 'var(--color-primary-lighter)',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: '12px',
    width: '100%',
    boxSizing: 'border-box',
    flex: '0 0 auto',
  },
  infoPanelMobileItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
  },
}
