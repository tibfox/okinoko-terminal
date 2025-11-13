import { TERMINAL_WINDOW_DEFAULTS } from './windowDefaults.js'

const deepCloneState = (state) => {
  if (!state || typeof state !== 'object') {
    return state ?? null
  }
  return Object.entries(state).reduce((acc, [key, value]) => {
    if (value && typeof value === 'object') {
      acc[key] = deepCloneState(value)
    } else {
      acc[key] = value
    }
    return acc
  }, Array.isArray(state) ? [] : {})
}

const cloneWindows = (windows = {}) =>
  Object.entries(windows).reduce((acc, [id, value]) => {
    acc[id] = deepCloneState(value)
    return acc
  }, {})

export const LAYOUT_PRESETS = [
  {
    id: 'default-control',
    label: 'Control Deck (Default)',
    description: 'General purpose layout.',
    windows: cloneWindows(TERMINAL_WINDOW_DEFAULTS),
  },
  {
    id: 'monitoring',
    label: 'Monitoring',
    description: 'Primary console centered with monitoring panes docked.',
    windows: cloneWindows({
      primary: {
        isMinimized: false,
        dimensions: { width: 868, height: 837 },
        position: { x: 341, y: 62 },
        zIndex: 275,
      },
      'aux-monitor': {
        isMinimized: false,
        dimensions: { width: 651, height: 837 },
        position: { x: 1240, y: 62 },
        zIndex: 278,
      },
      'tx-monitor': {
        isMinimized: false,
        dimensions: { width: 248, height: 310 },
        position: { x: 62, y: 589 },
        zIndex: 272,
      },
      'account-data': {
        isMinimized: false,
        dimensions: { width: 248, height: 496 },
        position: { x: 62, y: 62 },
        zIndex: 277,
      },
    }),
  },
  {
    id: 'gaming',
    label: 'Gaming',
    description: 'Large playfield with side widgets minimized.',
    windows: cloneWindows({
      primary: {
        isMinimized: false,
        dimensions: { width: 1116, height: 806 },
        position: { x: 341, y: 62 },
        zIndex: 285,
      },
      'aux-monitor': {
        isMinimized: true,
        dimensions: { width: 372, height: 372 },
        position: { x: 1488, y: 434 },
        zIndex: 308,
      },
      'tx-monitor': {
        isMinimized: true,
        dimensions: { width: 248, height: 310 },
        position: { x: 1488, y: 527 },
        zIndex: 306,
      },
      'account-data': {
        isMinimized: false,
        dimensions: { width: 248, height: 341 },
        position: { x: 1488, y: 62 },
        zIndex: 303,
      },
    }),
  },
  {
    id: 'minter',
    label: 'Minter',
    description: 'Wide execution window with stacked data panels on the left.',
    windows: cloneWindows({
      primary: {
        isMinimized: false,
        dimensions: { width: 1333, height: 837 },
        position: { x: 496, y: 62 },
        zIndex: 333,
      },
      'aux-monitor': {
        isMinimized: false,
        dimensions: { width: 434, height: 248 },
        position: { x: 31, y: 651 },
        zIndex: 327,
      },
      'tx-monitor': {
        isMinimized: false,
        dimensions: { width: 434, height: 279 },
        position: { x: 31, y: 341 },
        zIndex: 331,
      },
      'account-data': {
        isMinimized: false,
        dimensions: { width: 434, height: 248 },
        position: { x: 31, y: 62 },
        zIndex: 329,
      },
    }),
  },
  {
    id: 'trader',
    label: 'Trader',
    description: 'Balanced three-column view for live orderflow.',
    windows: cloneWindows({
      primary: {
        isMinimized: false,
        dimensions: { width: 868, height: 837 },
        position: { x: 527, y: 62 },
        zIndex: 335,
      },
      'aux-monitor': {
        isMinimized: false,
        dimensions: { width: 465, height: 837 },
        position: { x: 31, y: 62 },
        zIndex: 342,
      },
      'tx-monitor': {
        isMinimized: false,
        dimensions: { width: 434, height: 372 },
        position: { x: 1426, y: 527 },
        zIndex: 339,
      },
      'account-data': {
        isMinimized: false,
        dimensions: { width: 434, height: 434 },
        position: { x: 1426, y: 62 },
        zIndex: 340,
      },
    }),
  },
  {
    id: 'minimized',
    label: 'Minimized',
    description: 'Keep all terminals minimized but ready to restore.',
    windows: cloneWindows({
      primary: {
        isMinimized: true,
        dimensions: { width: 837, height: 600 },
        position: { x: 31, y: 31 },
        zIndex: 17,
      },
      'aux-monitor': {
        isMinimized: true,
        dimensions: { width: 465, height: 837 },
        position: { x: 558, y: 31 },
        zIndex: 20,
      },
      'tx-monitor': {
        isMinimized: true,
        dimensions: { width: 434, height: 372 },
        position: { x: 1426, y: 31 },
        zIndex: 24,
      },
      'account-data': {
        isMinimized: true,
        dimensions: { width: 434, height: 434 },
        position: { x: 961, y: 31 },
        zIndex: 23,
      },
    }),
  },
]

export const getLayoutPresetById = (id) => LAYOUT_PRESETS.find((preset) => preset.id === id) ?? null
