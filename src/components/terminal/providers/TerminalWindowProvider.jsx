import { createContext } from 'preact'
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { getWindowDefaults } from '../windowDefaults.js'
import { LAYOUT_PRESETS, getLayoutPresetById } from '../layoutPresets.js'

const COOKIE_NAME = 'okinoko_terminal_windows'
const CUSTOM_LAYOUT_COOKIE = 'okinoko_terminal_custom_layouts'
const MAX_CUSTOM_LAYOUTS = 8

const defaultWindowState = {
  isMinimized: false,
  dimensions: null,
  position: null,
  zIndex: 0,
}

const cloneWindowStateMap = (windows = {}) =>
  Object.entries(windows).reduce((acc, [id, value]) => {
    acc[id] = {
      isMinimized: Boolean(value?.isMinimized),
      dimensions: value?.dimensions ? { ...value.dimensions } : null,
      position: value?.position ? { ...value.position } : null,
      zIndex: typeof value?.zIndex === 'number' ? value.zIndex : 0,
    }
    return acc
  }, {})

const createDefaultState = (overrides = {}) => ({
  ...defaultWindowState,
  ...overrides,
})

const TerminalWindowContext = createContext({
  windows: {},
  ensureWindow: () => {},
  updateWindow: () => {},
  bringToFront: () => {},
  triggerLayoutReset: () => {},
  layoutResetToken: 0,
  layoutPresets: LAYOUT_PRESETS,
  customLayouts: [],
  applyLayoutPreset: () => false,
  saveCustomLayout: () => null,
  deleteCustomLayout: () => {},
})

const readCookieState = () => {
  if (typeof document === 'undefined') {
    return null
  }

  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${COOKIE_NAME}=`))

  if (!cookie) {
    return null
  }

  try {
    return JSON.parse(decodeURIComponent(cookie.split('=')[1]))
  } catch {
    return null
  }
}

const writeCookieState = (state) => {
  if (typeof document === 'undefined') {
    return
  }

  const payload = encodeURIComponent(JSON.stringify(state))
  document.cookie = `${COOKIE_NAME}=${payload}; path=/; SameSite=Lax`
}

const readCustomLayouts = () => {
  if (typeof document === 'undefined') {
    return []
  }

  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${CUSTOM_LAYOUT_COOKIE}=`))

  if (!cookie) {
    return []
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(cookie.split('=')[1]))
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed
      .filter((entry) => entry && typeof entry === 'object' && typeof entry.id === 'string')
      .map((entry) => ({
        id: entry.id,
        label: typeof entry.label === 'string' && entry.label.trim() ? entry.label.trim() : 'Saved Layout',
        windows: cloneWindowStateMap(entry.windows ?? {}),
      }))
  } catch {
    return []
  }
}

const writeCustomLayouts = (layouts) => {
  if (typeof document === 'undefined') {
    return
  }
  const payload = encodeURIComponent(JSON.stringify(layouts))
  document.cookie = `${CUSTOM_LAYOUT_COOKIE}=${payload}; path=/; SameSite=Lax`
}

const sanitizeLayoutLabel = (label) => {
  if (!label || typeof label !== 'string') {
    return ''
  }
  return label.trim().slice(0, 40)
}

export function TerminalWindowProvider({ children }) {
  const [windows, setWindows] = useState({})
  const layerCounterRef = useRef(1)
  const [layoutResetToken, setLayoutResetToken] = useState(0)
  const [customLayouts, setCustomLayouts] = useState(() => readCustomLayouts())

  useEffect(() => {
    const saved = readCookieState()
    if (!saved) {
      return
    }

    const applySavedState = (stateMap) => {
      const normalized = Object.entries(stateMap).reduce((acc, [id, value]) => {
        acc[id] = createDefaultState(value)
        return acc
      }, {})
      const maxZ = Object.values(normalized).reduce((max, entry) => Math.max(max, entry.zIndex ?? 0), 0)
      layerCounterRef.current = Math.max(1, maxZ)
      setWindows(normalized)
    }

    if (saved.isMinimized !== undefined) {
      applySavedState({ primary: saved })
    } else if (typeof saved === 'object') {
      applySavedState(saved)
    }
  }, [])

  useEffect(() => {
    if (Object.keys(windows).length === 0) {
      return
    }
    writeCookieState(windows)
  }, [windows])

  useEffect(() => {
    writeCustomLayouts(customLayouts)
  }, [customLayouts])

  const ensureWindow = useCallback((id, defaults = {}) => {
    setWindows((prev) => {
      if (prev[id]) {
        return prev
      }
      const nextZ = layerCounterRef.current + 1
      layerCounterRef.current = nextZ
      return {
        ...prev,
        [id]: { ...createDefaultState(defaults), zIndex: nextZ },
      }
    })
  }, [])

  const updateWindow = useCallback((id, updater) => {
    setWindows((prev) => {
      const prevState = prev[id] ?? createDefaultState()
      const nextState =
        typeof updater === 'function'
          ? updater(prevState)
          : { ...prevState, ...updater }
      return { ...prev, [id]: nextState }
    })
  }, [])

  const bringToFront = useCallback((id) => {
    setWindows((prev) => {
      const prevState = prev[id]
      if (!prevState) {
        return prev
      }
      const nextZ = layerCounterRef.current + 1
      layerCounterRef.current = nextZ
      return { ...prev, [id]: { ...prevState, zIndex: nextZ } }
    })
  }, [])

  const triggerLayoutReset = useCallback(() => {
    setLayoutResetToken((token) => token + 1)
  }, [])

  const saveCustomLayout = useCallback(
    (label) => {
      const trimmedLabel = sanitizeLayoutLabel(label)
      if (!trimmedLabel) {
        return null
      }
      let createdLayout = null
      setCustomLayouts((prev) => {
        const nextLayout = {
          id: `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          label: trimmedLabel,
          windows: cloneWindowStateMap(windows),
        }
        createdLayout = nextLayout
        const combined = [...prev, nextLayout]
        if (combined.length > MAX_CUSTOM_LAYOUTS) {
          return combined.slice(combined.length - MAX_CUSTOM_LAYOUTS)
        }
        return combined
      })
      return createdLayout
    },
    [windows],
  )

  const deleteCustomLayout = useCallback((layoutId) => {
    setCustomLayouts((prev) => prev.filter((layout) => layout.id !== layoutId))
  }, [])

  const applyLayoutPreset = useCallback(
    (presetId) => {
      const preset =
        getLayoutPresetById(presetId) ?? customLayouts.find((layout) => layout.id === presetId)
      if (!preset) {
        return false
      }
      const entries = Object.entries(preset.windows ?? {})
    if (entries.length === 0) {
      return false
    }

    let nextZ = 1
    const nextWindows = entries.reduce((acc, [id, value]) => {
      acc[id] = createDefaultState({
        ...value,
        dimensions: value?.dimensions ? { ...value.dimensions } : null,
        position: value?.position ? { ...value.position } : null,
        zIndex: nextZ,
      })
      nextZ += 1
      return acc
    }, {})

    layerCounterRef.current = nextZ
    setWindows(nextWindows)
    return true
  },
  [customLayouts],
)

  const contextValue = useMemo(
    () => ({
      windows,
      ensureWindow,
      updateWindow,
      bringToFront,
      triggerLayoutReset,
      layoutResetToken,
      layoutPresets: LAYOUT_PRESETS,
      customLayouts,
      applyLayoutPreset,
      saveCustomLayout,
      deleteCustomLayout,
    }),
    [
      windows,
      ensureWindow,
      updateWindow,
      bringToFront,
      triggerLayoutReset,
      layoutResetToken,
      customLayouts,
      applyLayoutPreset,
      saveCustomLayout,
      deleteCustomLayout,
    ],
  )

  return (
    <TerminalWindowContext.Provider value={contextValue}>
      {children}
    </TerminalWindowContext.Provider>
  )
}

export const useTerminalWindow = (windowId = 'primary', defaults = {}) => {
  const {
    windows,
    ensureWindow,
    updateWindow,
    bringToFront: contextBringToFront,
    triggerLayoutReset,
    layoutResetToken,
    applyLayoutPreset,
    layoutPresets,
    customLayouts,
    saveCustomLayout,
    deleteCustomLayout,
  } = useContext(TerminalWindowContext)
  const defaultsKey = useMemo(() => JSON.stringify(defaults), [defaults])
  const parsedDefaults = useMemo(() => (defaultsKey ? JSON.parse(defaultsKey) : {}), [defaultsKey])
  const mergedDefaults = useMemo(() => {
    const base = getWindowDefaults(windowId) ?? {}
    if (!parsedDefaults || Object.keys(parsedDefaults).length === 0) {
      return base
    }
    return {
      ...base,
      ...parsedDefaults,
    }
  }, [windowId, parsedDefaults])

  useEffect(() => {
    ensureWindow(windowId, mergedDefaults)
  }, [windowId, mergedDefaults, ensureWindow])

  const windowState = windows[windowId] ?? createDefaultState(mergedDefaults)

  const setIsMinimized = useCallback(
    (value) => {
      updateWindow(windowId, (prev) => ({
        ...prev,
        isMinimized: typeof value === 'function' ? value(prev.isMinimized) : value,
      }))
    },
    [windowId, updateWindow],
  )

  const setDimensions = useCallback(
    (value) => {
      updateWindow(windowId, (prev) => ({
        ...prev,
        dimensions: typeof value === 'function' ? value(prev.dimensions) : value,
      }))
    },
    [windowId, updateWindow],
  )

  const setPosition = useCallback(
    (value) => {
      updateWindow(windowId, (prev) => ({
        ...prev,
        position: typeof value === 'function' ? value(prev.position) : value,
      }))
    },
    [windowId, updateWindow],
  )

  return {
    ...windowState,
    setIsMinimized,
    setDimensions,
    setPosition,
    bringToFront: () => contextBringToFront(windowId),
    triggerLayoutReset,
    layoutResetToken,
    layoutPresets,
    applyLayoutPreset,
    customLayouts,
    saveCustomLayout,
    deleteCustomLayout,
  }
}

export const useTerminalLayouts = () => {
  const {
    layoutPresets,
    applyLayoutPreset,
    customLayouts,
    saveCustomLayout,
    deleteCustomLayout,
  } = useContext(TerminalWindowContext)
  return { layoutPresets, applyLayoutPreset, customLayouts, saveCustomLayout, deleteCustomLayout }
}
