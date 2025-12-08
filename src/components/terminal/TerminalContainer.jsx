import DesktopHeader from './headers/DesktopHeader.jsx'
import MobileHeader from './headers/MobileHeader.jsx'
import CompactHeader from './headers/CompactHeader.jsx'

import { useState, useEffect, useMemo, useRef, useContext, useLayoutEffect } from 'preact/hooks'
import { createPortal } from 'preact/compat'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { PopupContext } from '../../popup/context.js'
import {
  faWindowMinimize,
  faWindowMaximize,
  faCaretDown,
  faLayerGroup,
  faBookmark,
  faTrash,
  faTornado,
  faCircleQuestion,
  faBars,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'
import { useTerminalWindow } from './providers/TerminalWindowProvider.jsx'
import { getWindowDefaults } from './windowDefaults.js'
import { useBackgroundEffects } from '../backgrounds/BackgroundEffectsProvider.jsx'
import ColorPickerButton from './headers/ColorPickerButton.jsx'
import SoundToggleButton from './components/SoundToggleButton.jsx'

const DESKTOP_MIN_WIDTH = 460
const DESKTOP_MAX_WIDTH = 1400
const DESKTOP_MIN_HEIGHT = 600
const DESKTOP_MAX_HEIGHT = 980
const DESKTOP_WIDTH_RATIO = 0.66
const DESKTOP_HEIGHT_RATIO = 0.8
const DEFAULT_VIEWPORT_PADDING = 32
const GRID_ROW_COUNT = 60
const DEFAULT_GRID_CELL_SIZE = 10
const MIN_GRID_CELL_SIZE = 6
const LAYOUT_ANIMATION_DURATION = 250

export default function TerminalContainer({
  title,
  titleOnMinimize,
  children,
  windowId = 'primary',
  initialState: initialStateProp = null,
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
  const [gridCellSize, setGridCellSize] = useState(DEFAULT_GRID_CELL_SIZE)
  const [selectedLayoutId, setSelectedLayoutId] = useState('')
  const [isLayoutMenuOpen, setIsLayoutMenuOpen] = useState(false)
  const [isBackgroundMenuOpen, setIsBackgroundMenuOpen] = useState(false)
  const [isControlsOpen, setIsControlsOpen] = useState(false)
  const [contentOpacity, setContentOpacity] = useState(1)
  const [isPixelating, setIsPixelating] = useState(false)
  const [shouldHideBody, setShouldHideBody] = useState(false)
  
  const hasCustomInitialState =
    initialStateProp && typeof initialStateProp === 'object' && Object.keys(initialStateProp).length > 0
  const resolvedInitialState = useMemo(() => {
    if (hasCustomInitialState) {
      return initialStateProp
    }
    return getWindowDefaults(windowId) ?? {}
  }, [hasCustomInitialState, initialStateProp, windowId])
  const resolvedInitialStateKey = useMemo(
    () => JSON.stringify(resolvedInitialState ?? {}),
    [resolvedInitialState],
  )
  const {
    isMinimized,
    setIsMinimized,
    dimensions,
    setDimensions,
    position,
    setPosition,
    zIndex,
    bringToFront,
    triggerLayoutReset,
    layoutResetToken,
    layoutTransitionToken,
    layoutPresets,
    applyLayoutPreset,
    customLayouts = [],
    saveCustomLayout,
    deleteCustomLayout,
  } = useTerminalWindow(windowId, resolvedInitialState)
  const [renderMinimized, setRenderMinimized] = useState(isMinimized)
  const { effects: backgroundEffects = [], activeEffectId, setActiveEffectId } = useBackgroundEffects()
  const popup = useContext(PopupContext)

  const canUseWindow = typeof window !== 'undefined'
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const positionRef = useRef(position ?? { x: 0, y: 0 })
  const resizeStartRef = useRef({ width: 0, height: 0, x: 0, y: 0 })
  const containerRef = useRef(null)
  const layoutGalleryButtonRef = useRef(null)
  const layoutMenuRef = useRef(null)
  const backgroundButtonRef = useRef(null)
  const backgroundMenuRef = useRef(null)
  const resetTokenRef = useRef(layoutResetToken)
  const initialStateRef = useRef(resolvedInitialState)
  const controlsMenuRef = useRef(null)
  const lastRectRef = useRef(null)
  const layoutTokenRef = useRef(layoutTransitionToken)
  const prefersReducedMotionRef = useRef(false)
  const lastMinimizedRef = useRef(isMinimized)
  const visualSwitchTimerRef = useRef(null)
  const fadeTimersRef = useRef({ out: null, in: null })
  const prevMinimizedRef = useRef(isMinimized)

  useEffect(() => {
    initialStateRef.current = resolvedInitialState
  }, [resolvedInitialStateKey])

  useEffect(() => {
    setShouldHideBody(isMinimized)
  }, [])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (!isLayoutMenuOpen) {
      return
    }
    const handlePointerDown = (event) => {
      const target = event.target
      if (
        layoutGalleryButtonRef.current?.contains(target) ||
        layoutMenuRef.current?.contains(target)
      ) {
        return
      }
      setIsLayoutMenuOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown, true)
    return () => document.removeEventListener('pointerdown', handlePointerDown, true)
  }, [isLayoutMenuOpen])

  useEffect(() => {
    if (!isBackgroundMenuOpen) {
      return
    }
    const handlePointerDown = (event) => {
      const target = event.target
      if (backgroundButtonRef.current?.contains(target) || backgroundMenuRef.current?.contains(target)) {
        return
      }
      setIsBackgroundMenuOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown, true)
    return () => document.removeEventListener('pointerdown', handlePointerDown, true)
  }, [isBackgroundMenuOpen])

  useEffect(() => {
    if (!isControlsOpen) {
      return
    }
    const handlePointerDown = (event) => {
      const target = event.target
      if (controlsMenuRef.current?.contains(target)) {
        return
      }
      setIsControlsOpen(false)
      setIsLayoutMenuOpen(false)
      setIsBackgroundMenuOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    return () => document.removeEventListener('pointerdown', handlePointerDown, true)
  }, [isControlsOpen])

  useEffect(() => {
    if (!canUseWindow || typeof window.matchMedia !== 'function') {
      return
    }
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleChange = (event) => {
      prefersReducedMotionRef.current = Boolean(event.matches)
    }
    prefersReducedMotionRef.current = Boolean(mediaQuery.matches)
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
    if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(handleChange)
      return () => mediaQuery.removeListener(handleChange)
    }
    return undefined
  }, [canUseWindow])

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max)
  const getSafeGridSize = () => gridCellSize || DEFAULT_GRID_CELL_SIZE
  const snapToGrid = (value) => {
    if (!Number.isFinite(value)) {
      return 0
    }
    const size = getSafeGridSize()
    if (size <= 0) {
      return value
    }
    return Math.round(value / size) * size
  }
  const snapPositionToGrid = (nextPosition) => ({
    x: snapToGrid(nextPosition.x),
    y: snapToGrid(nextPosition.y),
  })

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

  useEffect(() => {
    if (!canUseWindow) {
      return
    }

    const updateGridSize = () => {
      const viewportHeight = window.innerHeight || GRID_ROW_COUNT * MIN_GRID_CELL_SIZE
      const computed = Math.max(
        MIN_GRID_CELL_SIZE,
        Math.floor(viewportHeight / GRID_ROW_COUNT) || MIN_GRID_CELL_SIZE,
      )
      setGridCellSize(computed)
    }

    updateGridSize()
    window.addEventListener('resize', updateGridSize)
    return () => window.removeEventListener('resize', updateGridSize)
  }, [canUseWindow])

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
      const rawPosition = {
        x: event.clientX - dragOffsetRef.current.x,
        y: event.clientY - dragOffsetRef.current.y,
      }
      const snappedPosition = snapPositionToGrid(rawPosition)

      positionRef.current = snappedPosition
      setPosition(snappedPosition)
    }

    const handlePointerUp = () => setIsDragging(false)

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [isDragging, gridCellSize])

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
      const snappedWidth = clamp(snapToGrid(nextWidth), bounds.minWidth, bounds.maxWidth)
      const snappedHeight = clamp(snapToGrid(nextHeight), bounds.minHeight, bounds.maxHeight)

      setDimensions({ width: snappedWidth, height: snappedHeight })
    }

    const handlePointerUp = () => setIsResizing(false)

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [isResizing, setDimensions, gridCellSize])

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

  useLayoutEffect(() => {
    if (!canUseWindow || !containerRef.current) {
      return
    }

    const previousRect = lastRectRef.current
    const nextRect = containerRef.current.getBoundingClientRect()
    const hasTokenChanged = layoutTransitionToken !== layoutTokenRef.current
    const hasMinimizeChanged = isMinimized !== lastMinimizedRef.current
    const hasTransitionSignal = hasTokenChanged || hasMinimizeChanged
    const shouldAnimate =
      hasTransitionSignal &&
      previousRect &&
      !prefersReducedMotionRef.current &&
      !isMobile &&
      !isDragging &&
      !isResizing

    if (shouldAnimate && typeof containerRef.current?.animate === 'function') {
      const node = containerRef.current
      const deltaX = previousRect.left - nextRect.left
      const deltaY = previousRect.top - nextRect.top
      const scaleX =
        nextRect.width && Number.isFinite(nextRect.width) ? previousRect.width / nextRect.width : 1
      const scaleY =
        nextRect.height && Number.isFinite(nextRect.height) ? previousRect.height / nextRect.height : 1
      const previousOrigin = node.style.transformOrigin
      node.style.transformOrigin = 'top left'

      const animationDuration = LAYOUT_ANIMATION_DURATION

      const frames = [
        { transform: `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY})` },
        { transform: 'translate(0, 0) scale(1, 1)' },
      ]

      const animation =
        typeof node.animate === 'function'
          ? node.animate(frames, {
              duration: animationDuration,
              easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
            })
          : null

      const cleanupTransform = () => {
        if (node) {
          node.style.removeProperty('transform')
          node.style.transformOrigin = previousOrigin || ''
        }
      }
      if (animation) {
        animation.addEventListener('finish', cleanupTransform)
        animation.addEventListener('cancel', cleanupTransform)
      } else {
        setTimeout(cleanupTransform, animationDuration)
      }
    }

    layoutTokenRef.current = layoutTransitionToken
    lastMinimizedRef.current = isMinimized
    lastRectRef.current = nextRect
  }, [
    layoutTransitionToken,
    isMobile,
    isDragging,
    isResizing,
    isMinimized,
    canUseWindow,
    dimensions,
    position,
  ])

  useEffect(() => {
    const next = isMinimized

    if (prevMinimizedRef.current === isMinimized) {
      return
    }

    const clearTimers = () => {
      if (visualSwitchTimerRef.current) {
        clearTimeout(visualSwitchTimerRef.current)
        visualSwitchTimerRef.current = null
      }
      if (fadeTimersRef.current.out) {
        clearTimeout(fadeTimersRef.current.out)
        fadeTimersRef.current.out = null
      }
      if (fadeTimersRef.current.in) {
        clearTimeout(fadeTimersRef.current.in)
        fadeTimersRef.current.in = null
      }
    }

    clearTimers()

    // If maximizing, show body immediately so content is visible during fade-in
    if (!next) {
      setShouldHideBody(false)
    }

    // Start fade out after a brief delay, swap at midpoint, fade back in.
    fadeTimersRef.current.out = setTimeout(() => {
      setContentOpacity(0)
      fadeTimersRef.current.out = null
    }, 30)

    visualSwitchTimerRef.current = setTimeout(() => {
      setRenderMinimized(next)
      // If minimizing, hide body at midpoint after content fades out
      if (next) {
        setShouldHideBody(true)
      }
      visualSwitchTimerRef.current = null
    }, LAYOUT_ANIMATION_DURATION / 2)

    fadeTimersRef.current.in = setTimeout(() => {
      setContentOpacity(1)
      fadeTimersRef.current.in = null
    }, LAYOUT_ANIMATION_DURATION / 2 + 30)

    prevMinimizedRef.current = isMinimized

    return clearTimers
  }, [isMinimized])

  const resolveInitialLayout = () => {
    const overrides = initialStateRef.current ?? {}
    return {
      isMinimized: overrides.isMinimized ?? false,
      dimensions: overrides.dimensions ?? getDefaultDesktopSize(),
      position: overrides.position ?? null,
    }
  }

  const handleResetLayout = () => {
    if (isMobile) {
      return
    }
    const { isMinimized: defaultMinimized, dimensions: defaultDimensions, position: defaultPosition } =
      resolveInitialLayout()

    setIsMinimized(defaultMinimized)
    setDimensions(defaultDimensions)
    setPosition(defaultPosition)
    positionRef.current = defaultPosition ?? { x: 0, y: 0 }
  }

  useEffect(() => {
    if (layoutResetToken === resetTokenRef.current) {
      return
    }
    resetTokenRef.current = layoutResetToken
    handleResetLayout()
  }, [layoutResetToken])

  const toggleMinimize = () => {
    if (!isMobile && !prefersReducedMotionRef.current) {
      setIsPixelating(true)
      setTimeout(() => setIsPixelating(false), LAYOUT_ANIMATION_DURATION)
    }
    setIsMinimized((prev) => !prev)
  }

  const handleActivate = () => {
    if (!isMobile) {
      bringToFront()
    }
  }

  const fadeStyle = {
    opacity: contentOpacity,
    transition: 'opacity 100ms ease-in-out',
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

  const visualMinimized = renderMinimized
  const headerKey = visualMinimized ? 'header-min' : 'header-full'

  const resolvedWidth = isMobile
    ? mobileWidth
    : visualMinimized
      ? MINIMIZED_DESKTOP_WIDTH
      : desktopWidth

  const resolvedHeight = isMobile
    ? undefined
    : visualMinimized
      ? `${MINIMIZED_DESKTOP_HEIGHT}px`
      : desktopHeight

  useLayoutEffect(() => {
    if (containerRef.current && !lastRectRef.current) {
      lastRectRef.current = containerRef.current.getBoundingClientRect()
    }
  }, [isMobile])

  const resolvedBackground = backgroundColor ?? 'rgba(0, 0, 0, 0.1)'
  const resolvedBackdrop = 'blur(6px)'
  const shouldShowGrid = !isMobile && (isDragging || isResizing)
  const activeGridCellSize = shouldShowGrid ? getSafeGridSize() : null
  const gridOverlay =
    shouldShowGrid && activeGridCellSize && canUseWindow
      ? createPortal(
          <div
            aria-hidden="true"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              pointerEvents: 'none',
              zIndex: 0,
              backgroundImage: `
                linear-gradient(color-mix(in srgb, var(--color-primary-lighter) 50%, transparent) 1px, transparent 1px),
                linear-gradient(90deg, color-mix(in srgb, var(--color-primary-lighter) 50%, transparent) 1px, transparent 1px)
              `,
              backgroundSize: `${activeGridCellSize}px ${activeGridCellSize}px`,
              opacity: 0.35,
              transition: 'opacity 120ms ease-out',
            }}
          />,
          document.body,
        )
      : null
  const handleLayoutSelect = (nextId) => {
    setSelectedLayoutId(nextId)
    if (nextId) {
      applyLayoutPreset(nextId)
    }
    setIsLayoutMenuOpen(false)
    setIsBackgroundMenuOpen(false)
  }

  const handleSaveLayout = () => {
    if (windowId !== 'primary' || isMobile || !canUseWindow || !saveCustomLayout) {
      return
    }
    const defaultName = `Layout ${customLayouts.length + 1}`
    const proposedName = window.prompt('Save current layout as:', defaultName)
    const trimmed = proposedName?.trim()
    if (!trimmed) {
      return
    }
    const created = saveCustomLayout(trimmed)
    if (created?.id) {
      setSelectedLayoutId(created.id)
    }
  }

  const handleDeleteCustomLayout = (event, layoutId) => {
    event.preventDefault()
    event.stopPropagation()
    if (!deleteCustomLayout || !canUseWindow) {
      return
    }
    const confirmed = window.confirm('Delete this saved layout?')
    if (!confirmed) {
      return
    }
    deleteCustomLayout(layoutId)
    if (selectedLayoutId === layoutId) {
      setSelectedLayoutId('')
    }
  }

  const handleBackgroundSelect = (effectId) => {
    if (typeof setActiveEffectId === 'function') {
      setActiveEffectId(effectId)
    }
    setIsBackgroundMenuOpen(false)
  }

  const handleAboutClick = () => {
    popup?.openPopup?.({
      title: 'About Ōkinoko',
      body: () => (
        <p style={{ lineHeight: 1.5 }}>
          This terminal and the Ōkinoko smart contracts are created by <b>@tibfox</b>. If you want to support his
          development work, feel free to send him a donation on Magi or Hive. Every bit of help is deeply appreciated.
        </p>
      ),
    })
  }

  const shouldShowControls = windowId === 'primary' && !isMobile && canUseWindow
  const hasBackgroundEffects = backgroundEffects.length > 0 && Boolean(setActiveEffectId)
  const floatingButtonStyle = {
    width: '2rem',
    height: '2rem',
    
    border: '2px solid var(--color-primary-darkest)',
    background: '#000',
    color: 'var(--color-primary-darker)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 0 18px var(--color-primary-darkest)',
  }

  const floatingControls =
    shouldShowControls
      ? createPortal(
          <div
            ref={controlsMenuRef}
            style={{
              position: 'fixed',
              top: '0.75rem',
              right: '0.75rem',
              display: 'flex',
              gap: '0.4rem',
              alignItems: 'center',
              justifyContent: 'flex-end',
              zIndex: 10000,
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center',
                opacity: isControlsOpen ? 1 : 0,
                transform: isControlsOpen ? 'translateX(0)' : 'translateX(6px)',
                pointerEvents: isControlsOpen ? 'auto' : 'none',
                transition: 'opacity 140ms ease-out, transform 140ms ease-out',
              }}
            >
              <div style={{ position: 'relative' }}>
                <button
                  ref={layoutGalleryButtonRef}
                  type="button"
                  onClick={() => {
                    setIsBackgroundMenuOpen(false)
                    setIsLayoutMenuOpen((prev) => !prev)
                  }}
                  onPointerDown={(event) => event.stopPropagation()}
                  aria-label="Layout gallery"
                  title="Layout gallery"
                  style={floatingButtonStyle}
                >
                  <FontAwesomeIcon icon={faLayerGroup} style={{ fontSize: '0.9rem' }} />
                </button>
                {isLayoutMenuOpen && (
                  <div
                    ref={layoutMenuRef}
                    onPointerDown={(event) => event.stopPropagation()}
                    style={{
                      position: 'absolute',
                      top: '2.5rem',
                      right: 0,
                      minWidth: '14rem',
                      background: 'rgba(0, 0, 0, 0.95)',
                      border: '2px solid var(--color-primary-darkest)',
                      
                      boxShadow: '0 0 18px var(--color-primary-darkest)',
                      padding: '0.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem',
                      zIndex: 10001,
                    }}
                  >
                    <span
                      style={{
                        color: 'var(--color-primary-lightest)',
                        fontSize: '0.7rem',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                      }}
                    >
                      Layout Gallery
                    </span>
                    <div
                      style={{
                        fontSize: '0.65rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: 'var(--color-primary)',
                        marginTop: '0.25rem',
                      }}
                    >
                      Presets
                    </div>
                    {layoutPresets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleLayoutSelect(preset.id)}
                        style={{
                          textAlign: 'left',
                          border: '1px solid var(--color-primary-darkest)',
                          
                          padding: '0.4rem 0.5rem',
                          background:
                            selectedLayoutId === preset.id
                              ? 'var(--color-primary-darkest)'
                              : 'rgba(6, 6, 6, 0.9)',
                          color: 'var(--color-primary-lighter)',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>{preset.label}</div>
                        {preset.description ? (
                          <div style={{ fontSize: '0.7rem', opacity: 0.75 }}>{preset.description}</div>
                        ) : null}
                      </button>
                    ))}
                    {customLayouts.length > 0 ? (
                      <>
                        <div
                          style={{
                            fontSize: '0.65rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            color: 'var(--color-primary)',
                            marginTop: '0.4rem',
                          }}
                        >
                          Saved Layouts
                        </div>
                        {customLayouts.map((layout) => (
                          <div
                            key={layout.id}
                            style={{ display: 'flex', gap: '0.35rem', alignItems: 'stretch' }}
                          >
                            <button
                              type="button"
                              onClick={() => handleLayoutSelect(layout.id)}
                              style={{
                                flex: 1,
                                textAlign: 'left',
                                border: '1px solid var(--color-primary-darkest)',
                                
                                padding: '0.4rem 0.5rem',
                                background:
                                  selectedLayoutId === layout.id
                                    ? 'var(--color-primary-darkest)'
                                    : 'rgba(6, 6, 6, 0.9)',
                                color: 'var(--color-primary-lighter)',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                              }}
                            >
                              <div style={{ fontWeight: 600 }}>{layout.label}</div>
                            </button>
                            <button
                              type="button"
                              onClick={(event) => handleDeleteCustomLayout(event, layout.id)}
                              aria-label={`Delete ${layout.label}`}
                              title="Delete saved layout"
                              style={{
                                width: '2.25rem',
                                
                                border: '1px solid var(--color-primary-darkest)',
                                background: 'rgba(20, 20, 20, 0.95)',
                                color: 'var(--color-primary-darker)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                              }}
                            >
                              <FontAwesomeIcon icon={faTrash} style={{ fontSize: '0.75rem' }} />
                            </button>
                          </div>
                        ))}
                      </>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleSaveLayout}
                      style={{
                        marginTop: '0.45rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                        border: '1px solid var(--color-primary-darkest)',
                        
                        padding: '0.45rem 0.6rem',
                        background: 'rgba(0, 0, 0, 0.85)',
                        color: 'var(--color-primary-lighter)',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      <FontAwesomeIcon icon={faBookmark} style={{ fontSize: '0.8rem' }} />
                      Save Current Layout
                    </button>
                  </div>
                )}
              </div>
              {hasBackgroundEffects ? (
                <div style={{ position: 'relative' }}>
                  <button
                    ref={backgroundButtonRef}
                    type="button"
                    onClick={() => {
                      setIsLayoutMenuOpen(false)
                      setIsBackgroundMenuOpen((prev) => !prev)
                    }}
                    onPointerDown={(event) => event.stopPropagation()}
                    aria-label="Background effects"
                    title="Background effects"
                    style={floatingButtonStyle}
                  >
                    <FontAwesomeIcon icon={faTornado} style={{ fontSize: '0.9rem' }} />
                  </button>
                  {isBackgroundMenuOpen && (
                    <div
                      ref={backgroundMenuRef}
                      onPointerDown={(event) => event.stopPropagation()}
                      style={{
                        position: 'absolute',
                        top: '2.5rem',
                        right: 0,
                        minWidth: '16rem',
                        background: 'rgba(0, 0, 0, 0.95)',
                        border: '2px solid var(--color-primary-darkest)',
                        
                        boxShadow: '0 0 18px var(--color-primary-darkest)',
                        padding: '0.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem',
                        zIndex: 10001,
                      }}
                    >
                      <span
                        style={{
                          color: 'var(--color-primary-lightest)',
                          fontSize: '0.7rem',
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase',
                        }}
                      >
                        Background Effects
                      </span>
                      {backgroundEffects.map((effect) => (
                        <button
                          key={effect.id}
                          type="button"
                          onClick={() => handleBackgroundSelect(effect.id)}
                          style={{
                            textAlign: 'left',
                            border: '1px solid var(--color-primary-darkest)',
                            
                            padding: '0.4rem 0.5rem',
                            background:
                              activeEffectId === effect.id
                                ? 'var(--color-primary-darkest)'
                                : 'rgba(6, 6, 6, 0.9)',
                            color: 'var(--color-primary-lighter)',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>{effect.label}</div>
                          {effect.description ? (
                            <div style={{ fontSize: '0.7rem', opacity: 0.75 }}>{effect.description}</div>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
              <div onPointerDown={(event) => event.stopPropagation()}>
                <ColorPickerButton buttonStyle={floatingButtonStyle} />
              </div>
              <div onPointerDown={(event) => event.stopPropagation()}>
                <SoundToggleButton style={floatingButtonStyle} />
              </div>
              <button
                type="button"
                onClick={handleAboutClick}
                onPointerDown={(event) => event.stopPropagation()}
                aria-label="About Ōkinoko"
                title="About Ōkinoko"
                style={floatingButtonStyle}
              >
                <FontAwesomeIcon icon={faCircleQuestion} style={{ fontSize: '0.9rem' }} />
              </button>
              {/* <button
                type="button"
                onClick={triggerLayoutReset}
                onPointerDown={(event) => event.stopPropagation()}
                aria-label="Reset layout"
                title="Reset layout"
                style={floatingButtonStyle}
              >
                <FontAwesomeIcon icon={faRotateLeft} style={{ fontSize: '0.9rem' }} />
              </button> */}
            </div>
            <button
              type="button"
              onClick={() =>
                setIsControlsOpen((prev) => {
                  if (prev) {
                    setIsLayoutMenuOpen(false)
                    setIsBackgroundMenuOpen(false)
                  }
                  return !prev
                })
              }
              onPointerDown={(event) => event.stopPropagation()}
              aria-label={isControlsOpen ? 'Hide menu' : 'Show menu'}
              title={isControlsOpen ? 'Hide menu' : 'Show menu'}
              style={{
                ...floatingButtonStyle,
                width: '2rem',
                height: '2rem',
              }}
            >
              <FontAwesomeIcon icon={isControlsOpen ? faXmark : faBars} style={{ fontSize: '0.85rem' }} />
            </button>
          </div>,
          document.body,
        )
      : null

  return (
    <>
      <div
        ref={containerRef}
        className={['terminal', className, isPixelating ? 'pixelate-transition' : ''].filter(Boolean).join(' ')}
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
          flex: visualMinimized ? '0 0 auto' : 1,
          display: 'flex',
          flexDirection: 'column',
          margin: isMobile ? '0' : isFloating ? '0' : 'auto',
          padding: isMobile
            ? '3.5rem 1.5rem'
            : visualMinimized
              ? '0.75rem 1rem'
              : '1rem 1rem',
          overflow: isMobile ? 'hidden' : 'visible',
          overflowY: isMobile ? (visualMinimized ? 'visible' : 'auto') : 'visible',
          boxSizing: 'border-box',
          minHeight: visualMinimized ? 'auto' : undefined,
          transition: isDragging || isResizing ? 'none' : 'transform 120ms ease-out',
          cursor: !isMobile && isDragging ? 'grabbing' : undefined,
          
          boxShadow: isFloating ? isDragging || isResizing?'0 0 50px var(--color-primary-darker)':'0 0 25px var(--color-primary-darkest)' : undefined,



          zIndex: isFloating ? zIndex || 2 : 1,
          ...(resolvedBackground ? { background: resolvedBackground } : {}),
          ...(resolvedBackdrop ? { backdropFilter: resolvedBackdrop } : {}),
          ...styleOverrides,
        }}
      >
        <div
          style={{
            opacity: contentOpacity,
            transition: contentOpacity === 0 ? 'opacity 0ms linear' : 'opacity 240ms ease-in-out',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            position: 'relative',
          }}
        >
          {!isMobile ? (
            headerVariant === 'compact' ? (
              <CompactHeader
                key={headerKey}
                title={visualMinimized ? (compactTitleOnMinimize ?? titleOnMinimize ?? title) : title}
                onDragPointerDown={handleDragStart}
                isMinimized={visualMinimized}
              />
            ) : (
              <DesktopHeader
                key={headerKey}
                title={title}
                titleOnMinimize={titleOnMinimize}
                onDragPointerDown={handleDragStart}
                isMinimized={visualMinimized}
              />
            )
          ) : (
            <MobileHeader title={title} />
          )}

          <div
            className="terminal-body"
            style={{
              flex: shouldHideBody ? '0' : 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: shouldHideBody ? 'hidden' : 'auto',
              minHeight: 0,
              maxHeight: isMobile ? '80vh' : shouldHideBody ? 'auto' : '100%',
              height: shouldHideBody ? 0 : (isMobile ? undefined : '100%'),
              paddingBottom: isMobile ? '0.1rem' : '0',
              visibility: shouldHideBody ? 'hidden' : 'visible',
              pointerEvents: shouldHideBody ? 'none' : 'auto',
              ...fadeStyle,
            }}
          >
            {children}
          </div>
        </div>

        {!isMobile && (
          <button
            type="button"
            onClick={toggleMinimize}
            onPointerDown={(event) => event.stopPropagation()}
            aria-label={visualMinimized ? 'Restore terminal' : 'Minimize terminal'}
            title={visualMinimized ? 'Restore terminal' : 'Minimize terminal'}
            style={{
              position: 'absolute',
              top: '-0.5rem',
              right: '-0.5rem',
              width: '1.2rem',
              height: '1.2rem',
              
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
              icon={visualMinimized ? faWindowMaximize : faWindowMinimize}
              style={{ fontSize: '0.5rem' }}
            />
          </button>
        )}

        {!isMobile && !visualMinimized && (
          <button
            type="button"
            onPointerDown={handleResizeStart}
            aria-label="Resize terminal window"
            title="Resize terminal window"
            style={{
              position: 'absolute',
              width: '1.2rem',
              height: '1.2rem',
              right: '-0.5rem',
              bottom: '-0.6rem',
              border: '2px solid var(--color-primary-darkest)',
              
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
              style={{ transform: 'rotate(-45deg)', fontSize: '0.7rem' }}
            />
          </button>
        )}
      </div>
      {/* {gridOverlay} */}
      {floatingControls}
    </>
  )
}
