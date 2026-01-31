// src/eruda-setup.ts
import eruda from 'eruda';

import { useState, useEffect, useRef } from 'preact/hooks'

import { Aioha } from '@aioha/aioha'
import { AiohaProvider } from '@aioha/react-ui'


import StepConnect from './components/StepConnect/StepConnect.jsx'
import StepSelect from './components/StepSelect/StepSelect.jsx'
import StepExecute from './components/StepExecute/StepExecute.jsx'
import StepGame from './components/StepGame/StepGame.jsx'
import { AccountBalanceProvider } from './components/terminal/providers/AccountBalanceProvider.jsx'
import { GameMoveBeepProvider } from './components/providers/GameMoveBeepProvider.jsx'
import MonitorTerminal from './components/terminal/SubTerminals/MonitorTerminal.jsx'
import TransactionsTerminal from './components/terminal/SubTerminals/TransactionsTerminal.jsx'
import AccountDataTerminal from './components/terminal/SubTerminals/AccountDataTerminal.jsx'
import { useDeviceBreakpoint } from './hooks/useDeviceBreakpoint.js'
import { useDeepLink, parseDeepLink, DEEP_LINK_CONTRACT_IDS, DEEP_LINK_TYPES } from './hooks/useDeepLink.js'
import { useNetworkType, NETWORK_TYPES, NETWORK_CONFIGS } from './components/terminal/providers/NetworkTypeProvider.jsx'
import { getNetworkTypeCookie } from './lib/cookies.js'

const MAX_PAGE_INDEX = 3
const clampPageIndex = (value) => Math.min(Math.max(value, 0), MAX_PAGE_INDEX)
const getInitialPageIndex = () => {
  if (typeof window === 'undefined') {
    return 0
  }
  // Check for deep link first
  const deepLink = parseDeepLink(window.location.hash)
  if (deepLink) {
    // Game deep links go to page 3 (StepGame), others go to page 1 (StepSelect)
    return deepLink.type === DEEP_LINK_TYPES.GAME ? 3 : 1
  }
  const statePage = window.history.state?.page
  if (typeof statePage === 'number') {
    const clamped = clampPageIndex(statePage)
    // Redirect page 2 (execute form) to page 1 (select) on refresh - form state is lost
    return clamped === 2 ? 1 : clamped
  }
  const hashMatch = window.location.hash.match(/^#p(\d)$/)
  if (hashMatch) {
    const candidate = clampPageIndex(Number(hashMatch[1]))
    if (!Number.isFinite(candidate)) return 0
    // Redirect page 2 (execute form) to page 1 (select) on refresh - form state is lost
    return candidate === 2 ? 1 : candidate
  }
  return 0
}

// Get initial network type from cookie to configure aioha
const getInitialNetworkConfig = () => {
  const savedNetwork = getNetworkTypeCookie()
  const networkType = savedNetwork && Object.values(NETWORK_TYPES).includes(savedNetwork)
    ? savedNetwork
    : NETWORK_TYPES.MAIN_NET
  return NETWORK_CONFIGS[networkType]
}

const initialNetworkConfig = getInitialNetworkConfig()

// Create Aioha with the correct API endpoint for the network
const aioha = new Aioha(initialNetworkConfig.hiveApi)
aioha.setup({
  hiveauth: {
    name: 'Okinoko Terminal',
    description: 'Okinoko Terminal App'
  },
})
// Set VSC network ID
aioha.vscSetNetId(initialNetworkConfig.vscNetworkId)
// Set chain ID for testnet (required for MetaMask snap to sign correctly)
if (initialNetworkConfig.chainId) {
  aioha.setChainId(initialNetworkConfig.chainId)
}


export function App() {
  const [page, setPage] = useState(() => getInitialPageIndex())
  const [contractId, setContractId] = useState(() => {
    // Auto-select contract based on deep link
    if (typeof window === 'undefined') return ''
    const deepLink = parseDeepLink(window.location.hash)
    if (deepLink && DEEP_LINK_CONTRACT_IDS[deepLink.type]) {
      return DEEP_LINK_CONTRACT_IDS[deepLink.type]
    }
    return ''
  })
    const [fnName, setFnName] = useState('')
    const [params, setParams] = useState({})
  const isMobile = useDeviceBreakpoint()
  const showDesktopTerminals = isMobile === false
  const showFooterCredit = isMobile === false
  const popNavigationRef = useRef(false)
  const [invalidHash, setInvalidHash] = useState(false)
  const { deepLink, clearDeepLink } = useDeepLink()
  const { isTestNet, networkType, registerAioha } = useNetworkType()
  const previousNetworkRef = useRef(networkType)

  // Register aioha instance with the network provider
  useEffect(() => {
    registerAioha(aioha)
  }, [registerAioha])

  // Handle network type changes - reload page to reinitialize aioha with correct config
  useEffect(() => {
    if (previousNetworkRef.current !== networkType) {
      previousNetworkRef.current = networkType
      // Reload the page to reinitialize aioha with the new network config
      window.location.reload()
    }
  }, [networkType])

    if (import.meta.env.VITE_EXPOSE_ERUDA === 'true') {
  import('eruda').then((eruda) => {
    eruda.default.init();
  });
}

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    const hashMatch = window.location.hash.match(/^#p(\d)$/)
    if (!hashMatch || Number(hashMatch[1]) !== page) {
      window.history.replaceState({ page }, '', `#p${page}`)
    }
    const handlePopState = (event) => {
      const nextPage = typeof event.state?.page === 'number' ? event.state.page : null
      if (nextPage === null) {
        setInvalidHash(true)
        setPage(0)
        return
      }
      const safe = clampPageIndex(nextPage)
      popNavigationRef.current = true
      setPage(safe)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    if (popNavigationRef.current) {
      popNavigationRef.current = false
      return
    }
    window.history.pushState({ page }, '', `#p${page}`)
  }, [page])

  // simple helper to move between pages safely
  const nextPage = () => setPage((prev) => clampPageIndex(prev + 1))
  const prevPage = () => setPage((prev) => clampPageIndex(prev - 1))

  const renderPage = () => {
    const safePage = invalidHash ? 0 : page
    switch (safePage) {
      case 0:
        return (
          <StepConnect setStep={setPage}/>
          
         
        )
      case 1:
        return (
          <StepSelect
                        contractId={contractId}
                        setContractId={setContractId}
                        fnName={fnName}
                        setFnName={setFnName}
                        setParams={setParams}
                        setStep={setPage}
                        deepLink={deepLink}
                        clearDeepLink={clearDeepLink}
                      />
        )
      case 2:
        return (
          <StepExecute
                        contractId={contractId}
                        fnName={fnName}
                        params={params}
                        setParams={setParams}
                        setStep={setPage}
                      />
        )
      case 3:
        return (
          <StepGame
                        contractId={contractId}
                        setContractId={setContractId}
                        fnName={fnName}
                        setFnName={setFnName}
                        params={params}
                        setParams={setParams}
                        setStep={setPage}
                        deepLink={deepLink}
                        clearDeepLink={clearDeepLink}
                      />
        )
      
      default:
        return null
    }
  }

  return (
    <AiohaProvider aioha={aioha}>
      <AccountBalanceProvider>
        <GameMoveBeepProvider>
          <>
            <div className="app-corner-logo" aria-hidden="true">
              <span className="app-corner-logo__accent">ŌKINOKO</span>
              <span className="app-corner-logo__muted">TERMINAL</span>
            </div>
            {isTestNet && (
              <div
                style={{
                  position: 'fixed',
                  top: '0.75rem',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  color: 'var(--color-primary-lighter)',
                  textAlign: 'center',
                  zIndex: 1,
                  pointerEvents: 'none',
                }}
              >
                You are currently connected to the Magi Test Net
              </div>
            )}
            {showFooterCredit && (
              <div className="app-footer-credit" aria-hidden="true">
                <span className="app-footer-credit__accent">Created by</span>
                <a
                  className="app-footer-credit__link app-footer-credit__muted"
                  href="https://ecency.com/@tibfox"
                  target="_blank"
                  rel="noreferrer"
                >
                  @tibfox
                </a>
                <span className="app-footer-credit__separator">|</span>
                <span className="app-footer-credit__accent">Powered by</span>
                  <a
                  className="app-footer-credit__link app-footer-credit__muted"
                  href="https://magi.eco"
                  target="_blank"
                  rel="noreferrer"
                >Magi</a>
                <span className="app-footer-credit__accent">and</span>
                <a
                  className="app-footer-credit__link app-footer-credit__muted"
                  href="https://hive.io"
                  target="_blank"
                  rel="noreferrer"
                >Hive</a>
              </div>
            )}
            {renderPage()}
            {showDesktopTerminals && (
              <>
                <MonitorTerminal />
                <TransactionsTerminal />
                <AccountDataTerminal />
              </>
            )}
          </>
        </GameMoveBeepProvider>
      </AccountBalanceProvider>
    </AiohaProvider>
  )
}
