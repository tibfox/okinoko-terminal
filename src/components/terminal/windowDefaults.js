const TERMINAL_WINDOW_DEFAULTS = Object.freeze({
  primary: {
    isMinimized: false,
    dimensions: { width: 1116, height: 900 },
    position: { x: 72, y: 72 },
  },
  'aux-monitor': {
    isMinimized: false,
    dimensions: { width: 576, height: 540 },
    position: { x: 1224, y: 432 },
  },
  'tx-monitor': {
    isMinimized: false,
    dimensions: { width: 324, height: 324 },
    position: { x: 1224, y: 72 },
  },
  'account-data': {
    isMinimized: false,
    dimensions: { width: 216, height: 324 },
    position: { x: 1584, y: 72 },
  },
})

const clone = (value) => {
  if (!value || typeof value !== 'object') {
    return value ?? null
  }
  return { ...value }
}

export const getWindowDefaults = (windowId) => {
  const defaults = TERMINAL_WINDOW_DEFAULTS[windowId]
  if (!defaults) {
    return null
  }
  return {
    ...defaults,
    dimensions: clone(defaults.dimensions),
    position: clone(defaults.position),
  }
}

export { TERMINAL_WINDOW_DEFAULTS }
