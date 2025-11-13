const DESIGN_BASE_WIDTH = 1920
const DESIGN_BASE_HEIGHT = 1080
const MIN_VIEWPORT_WIDTH = 320
const MIN_VIEWPORT_HEIGHT = 568

const getViewportSize = () => {
  if (typeof window === 'undefined') {
    return {
      width: DESIGN_BASE_WIDTH,
      height: DESIGN_BASE_HEIGHT,
    }
  }

  const width = Number(window.innerWidth) || DESIGN_BASE_WIDTH
  const height = Number(window.innerHeight) || DESIGN_BASE_HEIGHT

  return {
    width: Math.max(width, MIN_VIEWPORT_WIDTH),
    height: Math.max(height, MIN_VIEWPORT_HEIGHT),
  }
}

const scaleWithBase = (value, axis, viewport) => {
  if (!Number.isFinite(value)) {
    return null
  }
  const base = axis === 'x' ? DESIGN_BASE_WIDTH : DESIGN_BASE_HEIGHT
  const size = axis === 'x' ? viewport.width : viewport.height
  return Math.round((value / base) * size)
}

const convertAxisValue = (value, axis, viewport) => {
  if (value == null) {
    return null
  }

  if (typeof value === 'number') {
    return scaleWithBase(value, axis, viewport)
  }

  if (value && typeof value === 'object') {
    const amount = Number(value.value ?? value.amount ?? value.px ?? 0)
    const unit = value.unit ?? (value.value != null ? 'ratio' : 'px')

    if (!Number.isFinite(amount)) {
      return null
    }

    if (unit === 'px') {
      return Math.round(amount)
    }

    if (unit === 'vw') {
      return Math.round((amount / 100) * viewport.width)
    }

    if (unit === 'vh') {
      return Math.round((amount / 100) * viewport.height)
    }

    if (unit === 'ratio') {
      const size = axis === 'x' ? viewport.width : viewport.height
      return Math.round(amount * size)
    }
  }

  return null
}

const ensureObject = (input) => (input && typeof input === 'object' ? input : null)

const convertDimensionsToPixels = (dimensions, viewport) => {
  const source = ensureObject(dimensions)
  if (!source) {
    return null
  }

  const width = convertAxisValue(source.width, 'x', viewport)
  const height = convertAxisValue(source.height, 'y', viewport)

  if (width == null && height == null) {
    return null
  }

  const resolved = {}
  if (width != null) {
    resolved.width = width
  }
  if (height != null) {
    resolved.height = height
  }
  return resolved
}

const convertPositionToPixels = (position, viewport) => {
  const source = ensureObject(position)
  if (!source) {
    return null
  }

  const x = convertAxisValue(source.x, 'x', viewport)
  const y = convertAxisValue(source.y, 'y', viewport)

  if (x == null && y == null) {
    return null
  }

  const resolved = {}
  if (x != null) {
    resolved.x = x
  }
  if (y != null) {
    resolved.y = y
  }
  return resolved
}

export const convertWindowLayoutToPixels = (windowState = {}, viewport = getViewportSize()) => {
  const baseState = windowState && typeof windowState === 'object' ? windowState : {}
  return {
    ...baseState,
    dimensions: convertDimensionsToPixels(baseState.dimensions, viewport),
    position: convertPositionToPixels(baseState.position, viewport),
  }
}

export const convertWindowMapToPixels = (windows = {}, viewport = getViewportSize()) =>
  Object.entries(windows).reduce((acc, [id, value]) => {
    acc[id] = convertWindowLayoutToPixels(value, viewport)
    return acc
  }, {})

export { DESIGN_BASE_WIDTH, DESIGN_BASE_HEIGHT }
