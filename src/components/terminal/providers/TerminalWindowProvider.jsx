import { createContext } from 'preact'
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'preact/hooks'

const COOKIE_NAME = 'okinoko_terminal_windows'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

const defaultWindowState = {
  isMinimized: false,
  dimensions: null,
  position: null,
  zIndex: 0,
}

const createDefaultState = (overrides = {}) => ({
  ...defaultWindowState,
  ...overrides,
})

const TerminalWindowContext = createContext({
  windows: {},
  ensureWindow: () => {},
  updateWindow: () => {},
  bringToFront: () => {},
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
  document.cookie = `${COOKIE_NAME}=${payload}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`
}

export function TerminalWindowProvider({ children }) {
  const [windows, setWindows] = useState({})
  const layerCounterRef = useRef(1)

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

  const contextValue = useMemo(
    () => ({ windows, ensureWindow, updateWindow, bringToFront }),
    [windows, ensureWindow, updateWindow, bringToFront],
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
  } = useContext(TerminalWindowContext)
  const defaultsKey = useMemo(() => JSON.stringify(defaults), [defaults])
  const parsedDefaults = useMemo(() => (defaultsKey ? JSON.parse(defaultsKey) : {}), [defaultsKey])

  useEffect(() => {
    ensureWindow(windowId, parsedDefaults)
  }, [windowId, parsedDefaults, ensureWindow])

  const windowState = windows[windowId] ?? createDefaultState(parsedDefaults)

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
  }
}
