import { createContext } from 'preact'
import { useCallback, useContext, useEffect, useMemo, useState } from 'preact/hooks'

const COOKIE_NAME = 'okinoko_terminal_window'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

const defaultState = {
  isMinimized: false,
  dimensions: null,
}

const TerminalWindowContext = createContext({
  isMinimized: defaultState.isMinimized,
  setIsMinimized: () => {},
  dimensions: defaultState.dimensions,
  setDimensions: () => {},
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
  const [state, setState] = useState(defaultState)

  useEffect(() => {
    const saved = readCookieState()
    if (saved) {
      setState((prev) => ({
        ...prev,
        ...saved,
      }))
    }
  }, [])

  useEffect(() => {
    writeCookieState(state)
  }, [state.isMinimized, state.dimensions])

  const setIsMinimized = useCallback((value) => {
    setState((prev) => ({
      ...prev,
      isMinimized: typeof value === 'function' ? value(prev.isMinimized) : value,
    }))
  }, [])

  const setDimensions = useCallback((value) => {
    setState((prev) => ({
      ...prev,
      dimensions: typeof value === 'function' ? value(prev.dimensions) : value,
    }))
  }, [])

  const contextValue = useMemo(
    () => ({
      isMinimized: state.isMinimized,
      setIsMinimized,
      dimensions: state.dimensions,
      setDimensions,
    }),
    [state.isMinimized, state.dimensions, setIsMinimized, setDimensions],
  )

  return (
    <TerminalWindowContext.Provider value={contextValue}>
      {children}
    </TerminalWindowContext.Provider>
  )
}

export const useTerminalWindow = () => useContext(TerminalWindowContext)
