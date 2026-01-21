import { useRef, useEffect, useState, useCallback, useMemo } from 'preact/hooks'

/**
 * Resolve a CSS color value, including CSS custom properties (variables)
 * @param {string} color - Color string, can be hex, rgb, or var(--name, fallback)
 * @returns {string} - Resolved color value
 */
const resolveColor = (color) => {
  if (!color || typeof color !== 'string') return color

  // Check if it's a CSS variable
  if (color.startsWith('var(')) {
    // Extract variable name and fallback
    const match = color.match(/var\(\s*(--[^,)]+)\s*(?:,\s*([^)]+))?\s*\)/)
    if (match) {
      const varName = match[1]
      const fallback = match[2]?.trim() || '#00ff00'

      // Try to get computed value from document
      if (typeof document !== 'undefined') {
        const computed = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
        return computed || fallback
      }
      return fallback
    }
  }

  return color
}

/**
 * PixelCanvas - A reusable pixel art canvas component with responsive sizing
 *
 * @param {number} gridWidth - Width of the game grid in cells
 * @param {number} gridHeight - Height of the game grid in cells
 * @param {number} cellSize - Size of each cell in pixels (default: 8)
 * @param {string} backgroundColor - Background color for the canvas
 * @param {function} onRender - Callback function that receives (ctx, drawHelpers) to render the game
 * @param {function} onClick - Click handler for the canvas
 * @param {any} renderDeps - Dependencies that trigger re-render (pass state values that affect rendering)
 * @param {number} maxSize - Maximum display size in pixels (default: 600)
 * @param {number} minSize - Minimum display size in pixels (default: 200)
 * @param {React.ReactNode} overlay - Optional overlay content to display on top of the canvas
 */
export default function PixelCanvas({
  gridWidth,
  gridHeight,
  cellSize = 8,
  backgroundColor = '#000000',
  onRender,
  onClick,
  renderDeps,
  maxSize = 900,
  minSize = 200,
  overlay = null,
}) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [canvasSize, setCanvasSize] = useState(null)

  // Native canvas dimensions
  const nativeWidth = gridWidth * cellSize
  const nativeHeight = gridHeight * cellSize

  // Responsive sizing
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return

      const container = containerRef.current
      const parentWidth = container.parentElement?.clientWidth || window.innerWidth
      const parentHeight = container.parentElement?.clientHeight || window.innerHeight

      // Calculate available space (minimal padding for UI elements)
      const availableWidth = Math.min(parentWidth - 16, window.innerWidth - 32)
      const availableHeight = Math.min(parentHeight - 80, window.innerHeight - 100)

      // Calculate aspect ratio
      const aspectRatio = nativeWidth / nativeHeight

      // Calculate size maintaining aspect ratio - fill available space
      let displayWidth, displayHeight

      // Try to maximize the size while maintaining aspect ratio
      const widthIfHeightConstrained = availableHeight * aspectRatio
      const heightIfWidthConstrained = availableWidth / aspectRatio

      if (widthIfHeightConstrained <= availableWidth) {
        // Height is the constraint
        displayHeight = Math.min(availableHeight, maxSize)
        displayWidth = displayHeight * aspectRatio
      } else {
        // Width is the constraint
        displayWidth = Math.min(availableWidth, maxSize)
        displayHeight = displayWidth / aspectRatio
      }

      // Apply minimum size
      displayWidth = Math.max(displayWidth, minSize)
      displayHeight = Math.max(displayHeight, minSize / aspectRatio)

      setCanvasSize({ width: displayWidth, height: displayHeight })
    }

    updateSize()
    window.addEventListener('resize', updateSize)

    const resizeObserver = new ResizeObserver(updateSize)
    if (containerRef.current?.parentElement) {
      resizeObserver.observe(containerRef.current.parentElement)
    }

    return () => {
      window.removeEventListener('resize', updateSize)
      resizeObserver.disconnect()
    }
  }, [nativeWidth, nativeHeight, maxSize, minSize])

  // Draw helpers passed to onRender callback
  const createDrawHelpers = useCallback((ctx) => {
    return {
      // Draw a single cell with solid color
      drawCell: (gridX, gridY, color) => {
        ctx.fillStyle = resolveColor(color)
        ctx.fillRect(gridX * cellSize, gridY * cellSize, cellSize, cellSize)
      },

      // Draw a pixel pattern at a grid position
      // Pattern is an array of arrays (rows) with 1s and 0s
      drawPattern: (pattern, gridX, gridY, color) => {
        const baseX = gridX * cellSize
        const baseY = gridY * cellSize
        const patternHeight = pattern.length
        const patternWidth = pattern[0]?.length || 0

        ctx.fillStyle = resolveColor(color)
        for (let py = 0; py < patternHeight; py++) {
          for (let px = 0; px < patternWidth; px++) {
            if (pattern[py][px]) {
              ctx.fillRect(baseX + px, baseY + py, 1, 1)
            }
          }
        }
      },

      // Draw a rectangle (multiple cells)
      drawRect: (gridX, gridY, width, height, color) => {
        ctx.fillStyle = resolveColor(color)
        ctx.fillRect(gridX * cellSize, gridY * cellSize, width * cellSize, height * cellSize)
      },

      // Draw a thin border (half cell width = 4 pixels)
      // position: 'top', 'bottom', 'left', 'right'
      // length: number of cells the border spans
      // offset: starting cell position
      drawThinBorder: (position, length, offset, color, gaps = []) => {
        ctx.fillStyle = resolveColor(color)
        const thickness = Math.floor(cellSize / 2) // 4 pixels for 8px cells

        for (let i = 0; i < length; i++) {
          // Skip if this position is in the gaps array
          if (gaps.includes(offset + i)) continue

          if (position === 'top') {
            ctx.fillRect((offset + i) * cellSize, 0, cellSize, thickness)
          } else if (position === 'bottom') {
            ctx.fillRect((offset + i) * cellSize, (gridHeight * cellSize) - thickness, cellSize, thickness)
          } else if (position === 'left') {
            ctx.fillRect(0, (offset + i) * cellSize, thickness, cellSize)
          } else if (position === 'right') {
            ctx.fillRect((gridWidth * cellSize) - thickness, (offset + i) * cellSize, thickness, cellSize)
          }
        }
      },

      // Draw text at a pixel position
      drawText: (text, x, y, color, font = '8px monospace') => {
        ctx.fillStyle = resolveColor(color)
        ctx.font = font
        ctx.fillText(text, x, y)
      },

      // Clear the entire canvas
      clear: () => {
        ctx.fillStyle = resolveColor(backgroundColor)
        ctx.fillRect(0, 0, nativeWidth, nativeHeight)
      },

      // Get the canvas context for advanced operations
      getContext: () => ctx,

      // Set fill style with CSS variable resolution (without drawing)
      setFillStyle: (color) => {
        ctx.fillStyle = resolveColor(color)
      },

      // Canvas dimensions
      width: nativeWidth,
      height: nativeHeight,
      gridWidth,
      gridHeight,
      cellSize,
    }
  }, [cellSize, backgroundColor, nativeWidth, nativeHeight, gridWidth, gridHeight])

  // Render effect
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !onRender) return

    const ctx = canvas.getContext('2d')
    const helpers = createDrawHelpers(ctx)

    // Clear canvas
    helpers.clear()

    // Call the render callback
    onRender(ctx, helpers)
  }, [onRender, createDrawHelpers, renderDeps])

  const displayWidth = canvasSize?.width || nativeWidth * 2
  const displayHeight = canvasSize?.height || nativeHeight * 2

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: 'fit-content',
        cursor: onClick ? 'pointer' : 'default',
      }}
      onClick={onClick}
    >
      <canvas
        ref={canvasRef}
        width={nativeWidth}
        height={nativeHeight}
        style={{
          imageRendering: 'pixelated',
          imageRendering: 'crisp-edges',
          width: `${displayWidth}px`,
          height: `${displayHeight}px`,
          background: backgroundColor,
          display: 'block',
        }}
      />
      {overlay && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            fontFamily: 'monospace',
            textAlign: 'center',
          }}
        >
          {overlay}
        </div>
      )}
    </div>
  )
}
