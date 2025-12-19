import { useMemo, useState, useEffect, useRef } from 'preact/hooks'
import contractsCfg from '../../data/contracts.json'
import TerminalContainer from '../terminal/TerminalContainer.jsx'
import { useAioha } from '@aioha/react-ui'
import ExecuteForm from './ExecuteForm.jsx'
import ExecutePreview from './ExecutePreview.jsx'
import useExecuteHandler from '../../lib/useExecuteHandler.js'
import NeonButton from '../buttons/NeonButton.jsx'
import { loadPendingTx } from '../../lib/txBridge.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight, faBolt } from '@fortawesome/free-solid-svg-icons'
import MobileTabs from '../common/MobileTabs.jsx'
import ResumedTransactionBanner from '../common/ResumedTransactionBanner.jsx'
import { useDeviceBreakpoint } from '../../hooks/useDeviceBreakpoint.js'
import ResizableDivider from '../common/ResizableDivider.jsx'
import { getCookie, setCookie } from '../../lib/cookies.js'

const DIVIDER_COOKIE = 'stepExecuteDivider'
const SPLITTER_WIDTH_PX = 2

const clampPosition = (value, fallback = 0.5) => {
  if (value === null || value === undefined || value === '') return fallback
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.min(1, Math.max(0, num))
}

const sortContracts = (list = []) =>
  [...list].sort((a, b) => {
    const aIndex = a.sortIndex ?? Number.MAX_SAFE_INTEGER
    const bIndex = b.sortIndex ?? Number.MAX_SAFE_INTEGER
    if (aIndex !== bIndex) return aIndex - bIndex
    return (a.name || '').localeCompare(b.name || '')
  })


export default function StepExecute({
  contractId,
  fnName,
  params,
  setParams,
  setStep,
}) {
  const { user } = useAioha()
  const isMobile = useDeviceBreakpoint()
  const [activePage, setActivePage] = useState('form')
  const [resumedTx, setResumedTx] = useState(null)
  const [dividerPosition, setDividerPosition] = useState(() => {
    const saved = typeof document !== 'undefined' ? getCookie(DIVIDER_COOKIE) : null
    return clampPosition(saved, 0.5)
  })
  const [draggingDivider, setDraggingDivider] = useState(false)
  const layoutRef = useRef(null)

  // ✅ load pending tx only after everything mounts
  useEffect(() => {
    setTimeout(() => {
      const pendingTx = loadPendingTx()
      if (pendingTx) {
        console.log('[AIOHA][TX] Resuming TX after HiveAuth redirect', pendingTx)
        setResumedTx(pendingTx)
      }
    }, 800) // wait briefly to ensure user/session ready
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return
    setCookie(DIVIDER_COOKIE, dividerPosition, 30)
  }, [dividerPosition])

  useEffect(() => {
    if (!draggingDivider) return
    const handleMove = (event) => {
      const clientX = event.touches?.[0]?.clientX ?? event.clientX
      const rect = layoutRef.current?.getBoundingClientRect()
      if (!rect) return
      const relative = (clientX - rect.left) / rect.width
      const clamped = Math.min(1, Math.max(0, relative))
      const snapped = clamped < 0.06 ? 0 : clamped > 0.94 ? 1 : clamped
      setDividerPosition(snapped)
    }
    const handleUp = () => setDraggingDivider(false)
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    window.addEventListener('touchmove', handleMove, { passive: false })
    window.addEventListener('touchend', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleUp)
    }
  }, [draggingDivider])

  const sortedContracts = useMemo(
    () => sortContracts(contractsCfg.contracts || []),
    []
  )

  const contract = useMemo(
    () => sortedContracts.find((c) => c.vscId === contractId),
    [contractId, sortedContracts]
  )

  const fn = useMemo(
    () => contract?.functions?.find((f) => f.name === fnName),
    [contract, fnName]
  )

  const winnerSharesSum = useMemo(() => {
    if (fn?.name !== 'create_lottery') return null
    const shareParam =
      fn?.parameters?.find((p) => (p.payloadName || '').toLowerCase() === 'winnershares') ||
      fn?.parameters?.find((p) => String(p.name || '').toLowerCase().includes('winner shares'))
    if (!shareParam) return null
    const rawVal = params?.[shareParam.name] ?? params?.[shareParam.payloadName || shareParam.name] ?? ''
    const list = String(rawVal)
      .split(/[;,]/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n) && n > 0)
    if (!list.length) return { sum: 0, hasShares: false }
    return { sum: list.reduce((acc, n) => acc + n, 0), hasShares: true }
  }, [fn, params])

  const donationStatus = useMemo(() => {
    if (fn?.name !== 'create_lottery') return null
    const donationAccountParam =
      fn?.parameters?.find((p) => (p.payloadName || '').toLowerCase() === 'donationaccount') ||
      fn?.parameters?.find((p) => String(p.name || '').toLowerCase().includes('donation account'))
    const donationPercentParam =
      fn?.parameters?.find((p) => (p.payloadName || '').toLowerCase() === 'donationpercent') ||
      fn?.parameters?.find((p) => String(p.name || '').toLowerCase().includes('donation percent'))
    const accountVal =
      params?.[donationAccountParam?.name] ??
      params?.[donationAccountParam?.payloadName || donationAccountParam?.name] ??
      ''
    const percentVal =
      params?.[donationPercentParam?.name] ??
      params?.[donationPercentParam?.payloadName || donationPercentParam?.name] ??
      ''
    const hasAccount = String(accountVal || '').trim() !== ''
    const percentNum = parseFloat(String(percentVal).replace(',', '.'))
    const hasPercent = Number.isFinite(percentNum) && percentNum > 0
    return { hasAccount, hasPercent }
  }, [fn, params])

  const lotteryRangeStatus = useMemo(() => {
    if (fn?.name !== 'create_lottery') return null
    const burnParam =
      fn?.parameters?.find((p) => (p.payloadName || '').toLowerCase() === 'burnpercent') ||
      fn?.parameters?.find((p) => String(p.name || '').toLowerCase().includes('burn percent'))
    const donationParam =
      fn?.parameters?.find((p) => (p.payloadName || '').toLowerCase() === 'donationpercent') ||
      fn?.parameters?.find((p) => String(p.name || '').toLowerCase().includes('donation percent'))
    const burnVal =
      params?.[burnParam?.name] ??
      params?.[burnParam?.payloadName || burnParam?.name] ??
      ''
    const donationVal =
      params?.[donationParam?.name] ??
      params?.[donationParam?.payloadName || donationParam?.name] ??
      ''
    const burnNum = parseFloat(String(burnVal).replace(',', '.'))
    const donationNum = parseFloat(String(donationVal).replace(',', '.'))
    const burnMax = burnParam?.max
    const burnMin = burnParam?.min
    const donationMax = donationParam?.max
    const donationMin = donationParam?.min
    const burnValid =
      burnNum === '' ||
      (!Number.isNaN(burnNum) &&
        (burnMin === undefined || burnNum >= burnMin) &&
        (burnMax === undefined || burnNum <= burnMax))
    const donationValid =
      donationNum === '' ||
      (!Number.isNaN(donationNum) &&
        (donationMin === undefined || donationNum >= donationMin) &&
        (donationMax === undefined || donationNum <= donationMax))
    return { burnValid, donationValid }
  }, [fn, params])

  const {
    logs,
    pending,
    waiting,
    jsonPreview,
    handleSend,
    allMandatoryFilled,
  } = useExecuteHandler({ contract, fn, params, setParams, resumedTx })

  const sharesValid =
    winnerSharesSum === null ||
    (winnerSharesSum.hasShares && winnerSharesSum.sum <= 100)
  const donationValid =
    donationStatus === null ||
    (donationStatus.hasAccount && donationStatus.hasPercent) ||
    (!donationStatus.hasAccount && !donationStatus.hasPercent)
  const rangesValid =
    lotteryRangeStatus === null ||
    (lotteryRangeStatus.burnValid && lotteryRangeStatus.donationValid)
  const isSendEnabled = allMandatoryFilled && !pending && sharesValid && donationValid && rangesValid

  const handleSendAndForward = async () => {
    if (isMobile && activePage !== 'preview') {
      setActivePage('preview')
    }
    if (!isSendEnabled) return
    await handleSend()
  }

  const mobileTabs = useMemo(
    () => [
      { id: 'form', label: 'INPUT' },
      { id: 'preview', label: 'Preview & Logs' },
    ],
    []
  )

  const leftCollapsed = !isMobile && dividerPosition <= 0.05
  const rightCollapsed = !isMobile && dividerPosition >= 0.95
  const leftFraction = dividerPosition
  const rightFraction = Math.max(0, 1 - dividerPosition)
  const gridTemplateColumns = isMobile
    ? '1fr'
    : leftCollapsed
      ? `0px ${SPLITTER_WIDTH_PX}px 1fr`
      : rightCollapsed
        ? `1fr ${SPLITTER_WIDTH_PX}px 0px`
        : `${leftFraction}fr ${SPLITTER_WIDTH_PX}px ${rightFraction}fr`

  return (
    <TerminalContainer title="Input & Execute Function"
    titleOnMinimize="Execute"
    backgroundColor="rgba(0, 0, 0, 0.5)"
    >
      <MobileTabs
        visible={isMobile}
        tabs={mobileTabs}
        activeTab={activePage}
        onChange={setActivePage}
      />

      <ResumedTransactionBanner tx={resumedTx} />

      <div
        style={{
          display: isMobile ? 'flex' : 'grid',
          flexDirection: isMobile ? 'column' : 'unset',
          gridTemplateColumns,
          gap: isMobile ? '0' : '0',
          flex: 1,
          minHeight: 0,
          height: '100%',
          width: '100%',
          overflow: 'hidden',
          position: 'relative',
        }}
        ref={layoutRef}
      >
        {/* FORM (hide only on mobile when not active) */}
        <div
          style={{
            display: !isMobile || activePage === 'form' ? 'flex' : 'none',
            flexDirection: 'column',
            height: '100%',
            overflowY: 'auto',
            flex: 1,
            minWidth: 0,
            paddingRight: isMobile ? '0' : '20px',
            pointerEvents: leftCollapsed ? 'none' : 'auto',
            visibility: leftCollapsed ? 'hidden' : 'visible',
          }}
        >
          <ExecuteForm
            user={user}
            contract={contract}
            fn={fn}
            params={params}
            setParams={setParams}
            pending={pending}
            onSend={handleSend}
            setStep={setStep}
            allMandatoryFilled={allMandatoryFilled}
          />
        </div>

        {!isMobile && (
          <ResizableDivider
            leftCollapsed={leftCollapsed}
            rightCollapsed={rightCollapsed}
            onDragStart={() => setDraggingDivider(true)}
          />
        )}

        {/* PREVIEW (always visible on desktop) */}
        <div
          style={{
            display: !isMobile || activePage === 'preview' ? 'flex' : 'none',
            flexDirection: 'column',
            height: '100%',
            overflowY: 'auto',
            flex: 1,
            minWidth: 0,
            paddingLeft: isMobile ? '0' : '20px',
            pointerEvents: rightCollapsed ? 'none' : 'auto',
            visibility: rightCollapsed ? 'hidden' : 'visible',
          }}
        >
          <ExecutePreview jsonPreview={jsonPreview} logs={logs} />
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          marginTop: '10px',
          gap: '12px',
          justifyContent: 'space-between',
          width: '100%',
        }}
      >
        <NeonButton onClick={() => setStep(1)}>
          <FontAwesomeIcon icon={faChevronLeft} style={{ marginRight: '10px' }} />
          Back
        </NeonButton>
        <div className="next-button-glitter-wrapper">
          <NeonButton onClick={handleSendAndForward} disabled={!isSendEnabled}>
            <div className="pixel-sparkle-grid pixel-sparkle-grid-twinkle">
              {Array.from({ length: 90 }).map((_, i) => (
                <div key={`twinkle-${i}`} className="pixel-sparkle-twinkle"></div>
              ))}
            </div>
            <div className="pixel-sparkle-grid pixel-sparkle-grid-overlay">
              {Array.from({ length: 90 }).map((_, i) => (
                <div key={`overlay-${i}`} className="pixel-sparkle-overlay"></div>
              ))}
            </div>
            <span style={{ position: 'relative', zIndex: 3 }}>
              {pending ? (
                'Sending…'
              ) : (
                <>
                  Send
                  <FontAwesomeIcon icon={faBolt} style={{ marginLeft: '10px' }} />
                </>
              )}
            </span>
          </NeonButton>
        </div>
      </div>
    </TerminalContainer>
  )
}
