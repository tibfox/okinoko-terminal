// src/eruda-setup.ts
import eruda from 'eruda';

import { useState, useEffect, useRef } from 'preact/hooks'

import { initAioha } from '@aioha/aioha'
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

const MAX_PAGE_INDEX = 3
const clampPageIndex = (value) => Math.min(Math.max(value, 0), MAX_PAGE_INDEX)
const getInitialPageIndex = () => {
  if (typeof window === 'undefined') {
    return 0
  }
  const statePage = window.history.state?.page
  if (typeof statePage === 'number') {
    return clampPageIndex(statePage)
  }
  const hashMatch = window.location.hash.match(/^#p(\d)$/)
  if (hashMatch) {
    const candidate = clampPageIndex(Number(hashMatch[1]))
    return Number.isFinite(candidate) ? candidate : 0
  }
  return 0
}

const aioha = initAioha({
  hiveauth: {
    name: 'Okinoko Terminal',
    description: 'Okinoko Terminal App'
  },
  
})


export function App() {
  const [page, setPage] = useState(() => getInitialPageIndex())
  const [contractId, setContractId] = useState('')
    const [fnName, setFnName] = useState('')
    const [params, setParams] = useState({})
  const isMobile = useDeviceBreakpoint()
  const showDesktopTerminals = isMobile === false
  const showFooterCredit = isMobile === false
  const popNavigationRef = useRef(false)
  const [invalidHash, setInvalidHash] = useState(false)

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
                        fnName={fnName}
                        params={params}
                        setParams={setParams}
                        setStep={setPage}
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
              <span className="app-corner-logo__accent">ŌKIՈOKO</span>
              <span className="app-corner-logo__muted">TERMINAL</span>
            </div>
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
