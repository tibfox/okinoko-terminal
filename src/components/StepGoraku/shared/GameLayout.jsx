import { useRef, useState, useEffect, useCallback } from 'preact/hooks'
import { memo } from 'preact/compat'
import { useIsMobile, GAME_STYLES } from './asciiGameEngine.js'

/**
 * GameLayout - Reusable layout component for ASCII games
 * Handles the structure: Info Panel + Game Field + Mobile Controls
 *
 * IMPORTANT: The outer container uses position:absolute with inset:0 to fill
 * its parent completely, regardless of content size. Content inside does NOT
 * influence the container dimensions.
 */
function GameLayout({
  gameWidth,
  gameHeight,
  renderGame,
  InfoPanel,
  MobileControls = null,
  onFieldClick,
  overlayContent = null,
  fontFamily = '"Press Start 2P", monospace',
}) {
  const containerRef = useRef(null)
  const isMobile = useIsMobile()
  const [fontSize, setFontSize] = useState(8)

  // Calculate font size to fill container while maintaining aspect ratio
  useEffect(() => {
    if (!containerRef.current || !gameWidth || !gameHeight) return

    let rafId = null
    const updateFontSize = () => {
      // Debounce with RAF to avoid layout thrashing
      if (rafId) return
      rafId = requestAnimationFrame(() => {
        rafId = null
        const container = containerRef.current
        if (!container) return

        const containerWidth = container.clientWidth
        const containerHeight = container.clientHeight

        // Press Start 2P font: square characters (1:1 aspect ratio)
        const charWidthRatio = 1.0
        const lineHeightRatio = 1.0

        // Calculate max font size that fits both dimensions
        const fontSizeByWidth = containerWidth / (gameWidth * charWidthRatio)
        const fontSizeByHeight = containerHeight / (gameHeight * lineHeightRatio)

        // Use the smaller of the two to ensure it fits
        const newFontSize = Math.floor(Math.min(fontSizeByWidth, fontSizeByHeight))
        setFontSize(prev => {
          const clamped = Math.max(4, newFontSize)
          // Only update if actually changed
          return prev === clamped ? prev : clamped
        })
      })
    }

    updateFontSize()

    const resizeObserver = new ResizeObserver(updateFontSize)
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [gameWidth, gameHeight])

  // Memoize click handler
  const handleClick = useCallback((e) => {
    if (onFieldClick) onFieldClick(e)
  }, [onFieldClick])

  // Pre-compute styles to avoid object creation on render
  const preStyle = {
    margin: 0,
    padding: 0,
    fontFamily: fontFamily,
    fontSize: `${fontSize}px`,
    lineHeight: `${fontSize}px`,
    whiteSpace: 'pre',
    color: 'var(--color-primary)',
  }

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Main content area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: isMobile ? '10px 10px 0 10px' : '10px',
          overflow: 'auto',
          minHeight: 0,
        }}
      >
        {/* Info panel above game field - full width */}
        <div style={{ width: '100%', flexShrink: 0 }}>
          <InfoPanel />
        </div>

        {/* Game field container - centers the game */}
        <div style={{
          flex: 1,
          position: 'relative',
          minHeight: 0,
          border: '1px solid var(--color-primary-darkest)',
          background: 'black',
        }}>
          {/* Game field with ASCII content - stretched to fill container */}
          <div
            ref={containerRef}
            onClick={handleClick}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            {/* ASCII content scaled to fill */}
            <pre style={preStyle}>
              {renderGame()}
            </pre>

            {/* Overlay content (game states like "Press SPACE to start") */}
            {overlayContent && (
              <div style={GAME_STYLES.overlay}>
                {overlayContent}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Gamepad Controls - at bottom, fixed height */}
      {isMobile && MobileControls && (
        <div style={{ flexShrink: 0 }}>
          <MobileControls />
        </div>
      )}
    </div>
  )
}

export default memo(GameLayout)
