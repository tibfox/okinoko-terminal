import DesktopHeader from './headers/DesktopHeader.jsx'
import MobileHeader from './headers/MobileHeader.jsx'

import { useState, useEffect, useRef } from 'preact/hooks'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faWindowMinimize, faWindowMaximize, faCaretDown } from '@fortawesome/free-solid-svg-icons'
import { useTerminalWindow } from './TerminalWindowProvider.jsx'

const DESKTOP_MIN_WIDTH = 460
const DESKTOP_MAX_WIDTH = 1400
const DESKTOP_MIN_HEIGHT = 600
const DESKTOP_MAX_HEIGHT = 980

export default function TerminalContainer({ title, children }) {
  const [isMobile, setIsMobile] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [isDetached, setIsDetached] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const { isMinimized, setIsMinimized, dimensions, setDimensions } = useTerminalWindow()

  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const positionRef = useRef({ x: 0, y: 0 })
  const resizeStartRef = useRef({ width: 0, height: 0, x: 0, y: 0 })
  const containerRef = useRef(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

  const getDesktopBounds = () => {
    const dynamicMaxWidth = Math.max(
      DESKTOP_MIN_WIDTH,
      Math.min(DESKTOP_MAX_WIDTH, window.innerWidth - 32),
    )
    const dynamicMaxHeight = Math.max(
      DESKTOP_MIN_HEIGHT,
      Math.min(DESKTOP_MAX_HEIGHT, window.innerHeight - 32),
    )

    return {
      minWidth: DESKTOP_MIN_WIDTH,
      maxWidth: dynamicMaxWidth,
      minHeight: DESKTOP_MIN_HEIGHT,
      maxHeight: dynamicMaxHeight,
    }
  }

  const getDefaultDesktopSize = () => {
    const bounds = getDesktopBounds()
    const width = clamp(Math.round(window.innerWidth * 0.66), bounds.minWidth, bounds.maxWidth)
    const height = clamp(Math.round(window.innerHeight * 0.8), bounds.minHeight, bounds.maxHeight)
    return { width, height }
  }

  useEffect(() => {
    if (isMobile === null) {
      return
    }

    if (isMobile) {
      positionRef.current = { x: 0, y: 0 }
      setPosition({ x: 0, y: 0 })
      setIsDragging(false)
      setIsResizing(false)
      setIsDetached(false)
      return
    }

    setDimensions((current) => current ?? getDefaultDesktopSize())
    setIsDetached(false)
  }, [isMobile, setDimensions])

  useEffect(() => {
    if (!isDragging) {
      return
    }

    const handlePointerMove = (event) => {
      const nextPosition = {
        x: event.clientX - dragOffsetRef.current.x,
        y: event.clientY - dragOffsetRef.current.y,
      }

      positionRef.current = nextPosition
      setPosition(nextPosition)
    }

    const handlePointerUp = () => setIsDragging(false)

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [isDragging])

  const handleDragStart = (event) => {
    if (isMobile || isResizing || event.button !== 0) {
      return
    }

    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) {
      return
    }

    dragOffsetRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }

    if (!isDetached) {
      setIsDetached(true)
      positionRef.current = { x: rect.left, y: rect.top }
      setPosition({ x: rect.left, y: rect.top })
    }

    setIsDragging(true)
    event.preventDefault()
  }

  useEffect(() => {
    if (!isResizing) {
      return
    }

    const handlePointerMove = (event) => {
      const bounds = getDesktopBounds()
      const deltaX = event.clientX - resizeStartRef.current.x
      const deltaY = event.clientY - resizeStartRef.current.y

      const nextWidth = clamp(resizeStartRef.current.width + deltaX, bounds.minWidth, bounds.maxWidth)
      const nextHeight = clamp(resizeStartRef.current.height + deltaY, bounds.minHeight, bounds.maxHeight)

      setDimensions({ width: nextWidth, height: nextHeight })
    }

    const handlePointerUp = () => setIsResizing(false)

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [isResizing, setDimensions])

  const handleResizeStart = (event) => {
    if (isMobile || isMinimized || event.button !== 0) {
      return
    }

    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) {
      return
    }

    resizeStartRef.current = {
      width: dimensions?.width ?? getDefaultDesktopSize().width,
      height: dimensions?.height ?? getDefaultDesktopSize().height,
      x: event.clientX,
      y: event.clientY,
    }

    if (!isDetached) {
      setIsDetached(true)
      positionRef.current = { x: rect.left, y: rect.top }
      setPosition({ x: rect.left, y: rect.top })
    }

    setIsResizing(true)
    event.preventDefault()
    event.stopPropagation()
  }

  const toggleMinimize = () => setIsMinimized((prev) => !prev)

  if (isMobile === null) {
    return null
  }

  const canUseWindow = typeof window !== 'undefined'
  const mobileWidth = '100vw'
  const desktopWidth = dimensions ? `${dimensions.width}px` : '66vw'
  const desktopHeight = dimensions ? `${dimensions.height}px` : undefined
  const desktopBounds = !isMobile && canUseWindow ? getDesktopBounds() : null
  const isFloating = !isMobile && isDetached
  const MINIMIZED_DESKTOP_WIDTH = `${Math.round(DESKTOP_MIN_WIDTH * 0.5)}px`
  const MINIMIZED_DESKTOP_HEIGHT = 65

  const resolvedWidth = isMobile
    ? mobileWidth
    : isMinimized
      ? MINIMIZED_DESKTOP_WIDTH
      : desktopWidth

  const resolvedHeight = isMobile
    ? undefined
    : isMinimized
      ? `${MINIMIZED_DESKTOP_HEIGHT}px`
      : desktopHeight

  return (
    <div
      ref={containerRef}
      className="terminal"
      style={{
        position: isFloating ? 'fixed' : 'relative',
        top: isFloating ? `${position.y}px` : undefined,
        left: isFloating ? `${position.x}px` : undefined,
        width: resolvedWidth,
        height: resolvedHeight,
        maxWidth: isMobile
          ? mobileWidth
          : isMinimized
            ? MINIMIZED_DESKTOP_WIDTH
            : desktopBounds
              ? `${desktopBounds.maxWidth}px`
              : desktopWidth,
        minWidth: isMobile
          ? mobileWidth
          : isMinimized
            ? MINIMIZED_DESKTOP_WIDTH
            : desktopBounds
              ? `${desktopBounds.minWidth}px`
              : desktopWidth,
        flex: isMinimized ? '0 0 auto' : 1,
        display: 'flex',
        flexDirection: 'column',
        margin: isMobile ? '0' : isFloating ? '0' : 'auto',
        padding: isMobile
          ? '3.5rem 1.5rem'
          : isMinimized
            ? '0.75rem 1rem'
            : '1rem 1rem',
        overflow: isMobile ? 'hidden' : 'visible',
        overflowY: isMobile ? (isMinimized ? 'visible' : 'auto') : 'visible',
        boxSizing: 'border-box',
        minHeight: isMinimized ? 'auto' : undefined,
        transition: isDragging || isResizing ? 'none' : 'transform 120ms ease-out',
        cursor: !isMobile && isDragging ? 'grabbing' : undefined,
        boxShadow: isFloating ? '0 0 25px var(--color-primary-darkest)' : undefined,
      }}
    >
      {!isMobile ? (
        <DesktopHeader
          title={title}
          onDragPointerDown={handleDragStart}
          isMinimized={isMinimized}
        />
      ) : (
        <MobileHeader title={title} />
      )}

      <div
        className="terminal-body"
        style={{
          flex: isMinimized ? '0' : 1,
          display: isMinimized ? 'none' : 'flex',
          flexDirection: 'column',
          overflow: isMinimized ? 'hidden' : 'auto',
          minHeight: 0,
          maxHeight: isMobile ? '80vh' : isMinimized ? 'auto' : '80vh',
          paddingBottom: isMobile ? '0.1rem' : '0',
        }}
      >
        {children}
      </div>

      {!isMobile && (
        <button
          type="button"
          onClick={toggleMinimize}
          onPointerDown={(event) => event.stopPropagation()}
          aria-label={isMinimized ? 'Restore terminal' : 'Minimize terminal'}
          title={isMinimized ? 'Restore terminal' : 'Minimize terminal'}
          style={{
            position: 'absolute',
            top: '-0.5rem',
            right: '-0.65rem',
            width: '1.5rem',
            height: '1.5rem',
            borderRadius: '4px',
            border: '2px solid var(--color-primary-darkest)',
            background: '#000',
            color: 'var(--color-primary-darker)',
            fontSize: 0,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px var(--color-primary-darkest)',
            zIndex: 5,
          }}
        >
          <FontAwesomeIcon
            icon={isMinimized ? faWindowMaximize : faWindowMinimize}
            style={{ fontSize: '0.75rem' }}
          />
        </button>
      )}

      {!isMobile && !isMinimized && (
        <button
          type="button"
          onPointerDown={handleResizeStart}
          aria-label="Resize terminal window"
          title="Resize terminal window"
          style={{
            position: 'absolute',
            width: '1.5rem',
            height: '1.5rem',
            right: '-0.65rem',
            bottom: '-0.65rem',
            border: '2px solid var(--color-primary-darkest)',
            borderRadius: '4px',
            background: '#000',
            color: 'var(--color-primary-darker)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'se-resize',
            userSelect: 'none',
            boxShadow: '0 0 20px var(--color-primary-darkest)',
            zIndex: 4,
          }}
        >
          <FontAwesomeIcon
            icon={faCaretDown}
            style={{ transform: 'rotate(-45deg)', fontSize: '1rem' }}
          />
        </button>
      )}
    </div>
  )
}
