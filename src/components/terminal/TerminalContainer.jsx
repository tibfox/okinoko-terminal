import DesktopHeader from './headers/DesktopHeader.jsx'
import MobileHeader from './headers/MobileHeader.jsx'
import CompactHeader from './headers/CompactHeader.jsx'

import { useState, useEffect, useRef } from 'preact/hooks'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faWindowMinimize, faWindowMaximize, faCaretDown } from '@fortawesome/free-solid-svg-icons'
import { useTerminalWindow } from './providers/TerminalWindowProvider.jsx'

const DESKTOP_MIN_WIDTH = 460
const DESKTOP_MAX_WIDTH = 1400
const DESKTOP_MIN_HEIGHT = 600
const DESKTOP_MAX_HEIGHT = 980
const DESKTOP_WIDTH_RATIO = 0.66
const DESKTOP_HEIGHT_RATIO = 0.8
const DEFAULT_VIEWPORT_PADDING = 32

export default function TerminalContainer({
  title,
  titleOnMinimize,
  children,
  windowId = 'primary',
  initialState = {},
  desktopBounds: desktopBoundsProp = {},
  desktopDefaultSize: desktopDefaultSizeProp = {},
  viewportPadding = DEFAULT_VIEWPORT_PADDING,
  backgroundColor,
  className = '',
  style: styleOverrides = {},
  headerVariant = 'default',
  compactTitleOnMinimize,
}) {
  const [isMobile, setIsMobile] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const {
    isMinimized,
    setIsMinimized,
    dimensions,
    setDimensions,
    position,
    setPosition,
    zIndex,
    bringToFront,
  } = useTerminalWindow(windowId, initialState)

  const canUseWindow = typeof window !== 'undefined'
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const positionRef = useRef(position ?? { x: 0, y: 0 })
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
    const baseBounds = {
      minWidth: desktopBoundsProp.minWidth ?? DESKTOP_MIN_WIDTH,
      maxWidth: desktopBoundsProp.maxWidth ?? DESKTOP_MAX_WIDTH,
      minHeight: desktopBoundsProp.minHeight ?? DESKTOP_MIN_HEIGHT,
      maxHeight: desktopBoundsProp.maxHeight ?? DESKTOP_MAX_HEIGHT,
    }

    if (!canUseWindow) {
      return baseBounds
    }

    const widthLimit = window.innerWidth - viewportPadding
    const heightLimit = window.innerHeight - viewportPadding
    const dynamicMaxWidth = clamp(widthLimit, baseBounds.minWidth, baseBounds.maxWidth)
    const dynamicMaxHeight = clamp(heightLimit, baseBounds.minHeight, baseBounds.maxHeight)

    return {
      minWidth: baseBounds.minWidth,
      maxWidth: dynamicMaxWidth,
      minHeight: baseBounds.minHeight,
      maxHeight: dynamicMaxHeight,
    }
  }

  const getDefaultDesktopSize = () => {
    const bounds = getDesktopBounds()
    if (!canUseWindow) {
      return {
        width: desktopDefaultSizeProp.width ?? bounds.minWidth,
        height: desktopDefaultSizeProp.height ?? bounds.minHeight,
      }
    }

    const widthRatio = desktopDefaultSizeProp.widthRatio ?? DESKTOP_WIDTH_RATIO
    const heightRatio = desktopDefaultSizeProp.heightRatio ?? DESKTOP_HEIGHT_RATIO
    const widthTarget = desktopDefaultSizeProp.width ?? Math.round(window.innerWidth * widthRatio)
    const heightTarget = desktopDefaultSizeProp.height ?? Math.round(window.innerHeight * heightRatio)
    const width = clamp(widthTarget, bounds.minWidth, bounds.maxWidth)
    const height = clamp(heightTarget, bounds.minHeight, bounds.maxHeight)
    return { width, height }
  }

  useEffect(() => {
    if (isMobile === null) {
      return
    }

    if (isMobile) {
      positionRef.current = { x: 0, y: 0 }
      setIsDragging(false)
      setIsResizing(false)
      return
    }

    setDimensions((current) => current ?? getDefaultDesktopSize())
  }, [isMobile, setDimensions])

  useEffect(() => {
    if (position) {
      positionRef.current = position
    }
  }, [position])

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

    if (!position) {
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

    if (!position) {
      positionRef.current = { x: rect.left, y: rect.top }
      setPosition({ x: rect.left, y: rect.top })
    }

    setIsResizing(true)
    event.preventDefault()
    event.stopPropagation()
  }

  const toggleMinimize = () => setIsMinimized((prev) => !prev)
  const handleActivate = () => {
    if (!isMobile) {
      bringToFront()
    }
  }

  if (isMobile === null) {
    return null
  }

  const mobileWidth = '100vw'
  const desktopWidth = dimensions ? `${dimensions.width}px` : '66vw'
  const desktopHeight = dimensions ? `${dimensions.height}px` : undefined
  const desktopBounds = !isMobile && canUseWindow ? getDesktopBounds() : null
  const isFloating = !isMobile && Boolean(position)
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

  const isPrimaryWindow = windowId === 'primary'
  const resolvedBackground = backgroundColor ?? (isPrimaryWindow ? 'rgba(0, 0, 0, 0.5)' : undefined)
  const resolvedBackdrop = isPrimaryWindow ? 'blur(6px)' : undefined

  return (
    <div
      ref={containerRef}
      className={['terminal', className].filter(Boolean).join(' ')}
      onPointerDownCapture={handleActivate}
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
        zIndex: isFloating ? zIndex || 1 : undefined,
        ...(resolvedBackground ? { background: resolvedBackground } : {}),
        ...(resolvedBackdrop ? { backdropFilter: resolvedBackdrop } : {}),
        ...styleOverrides,
      }}
    >
      {!isMobile ? (
        headerVariant === 'compact' ? (
          <CompactHeader
            title={isMinimized ? (compactTitleOnMinimize ?? titleOnMinimize ?? title) : title}
            onDragPointerDown={handleDragStart}
            isMinimized={isMinimized}
          />
        ) : (
          <DesktopHeader
            title={title}
            titleOnMinimize={titleOnMinimize}
            onDragPointerDown={handleDragStart}
            isMinimized={isMinimized}
          />
        )
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
          maxHeight: isMobile ? '80vh' : isMinimized ? 'auto' : '100%',
          height: isMobile ? undefined : '100%',
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
