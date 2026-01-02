import { useContext, useEffect, useMemo, useState, useCallback, useRef } from 'preact/hooks'
import contractsCfg from '../../data/contracts.json'
import TerminalContainer from '../terminal/TerminalContainer.jsx'
import NeonButton from '../buttons/NeonButton.jsx'
import SparkleButton from '../buttons/SparkleButton.jsx'
import ContractList from './ContractList.jsx'
import ContractGrid from './ContractGrid.jsx'
import ContractDetails from './ContractDetails.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import MobileTabs from '../common/MobileTabs.jsx'
import ResizableDivider from '../common/ResizableDivider.jsx'
import { useDeviceBreakpoint } from '../../hooks/useDeviceBreakpoint.js'
import { useAioha } from '@aioha/react-ui'
import { PopupContext } from '../../popup/context.js'
import { getCookie, setCookie } from '../../lib/cookies.js'

const STORAGE_KEY = 'stepSelectActivePage'
const DIVIDER_COOKIE = 'stepSelectDivider'
const SPLITTER_WIDTH_PX = 2

const clampPosition = (value, fallback = 0.33) => {
  if (value === null || value === undefined || value === '') return fallback
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.min(1, Math.max(0, num))
}
const IN_A_ROW_VSC_ID = 'vsc1BVLuXCWC1UShtDBenWJ2B6NWpnyV2T637n'
const DAO_VSC_ID = 'vsc1Ba9AyyUcMnYVoDVsjoJztnPFHNxQwWBPsb'
const LOTTERY_VSC_ID = 'vsc1BiM4NC1yeGPCjmq8FC3utX8dByizjcCBk7'
const DAO_PROPOSAL_PREFILL_KEY = 'daoProposalProjectId'
// const ALLOWED_GAMER_HANDLES = ['tibfox', 'tibfox.vsc', 'diyhub', 'diyhub.funds']

const sortContracts = (list = []) =>
  [...list].sort((a, b) => {
    const aIndex = a.sortIndex ?? Number.MAX_SAFE_INTEGER
    const bIndex = b.sortIndex ?? Number.MAX_SAFE_INTEGER
    if (aIndex !== bIndex) return aIndex - bIndex
    return (a.name || '').localeCompare(b.name || '')
  })

const getStoredPage = () => {
  if (typeof window === 'undefined') return 'list'
  return sessionStorage.getItem(STORAGE_KEY) || 'list'
}

export default function StepSelect({
  contractId,
  setContractId,
  fnName,
  setFnName,
  setParams,
  setStep,
}) {
  const contracts = useMemo(() => {
    const isDev = import.meta.env.DEV
    const filtered = (contractsCfg.contracts || []).filter(contract => {
      // Show all contracts in dev mode, but filter out devOnly contracts in production
      if (contract.devOnly && !isDev) {
        return false
      }
      return true
    })
    return sortContracts(filtered)
  }, [])
  const { user } = useAioha()
  const isMobile = useDeviceBreakpoint()
  const [activePage, setActivePage] = useState(getStoredPage)
  const popup = useContext(PopupContext)
  const [dividerPosition, setDividerPosition] = useState(() => {
    const saved = typeof document !== 'undefined' ? getCookie(DIVIDER_COOKIE) : null
    return clampPosition(saved, 0.33)
  })
  const [draggingDivider, setDraggingDivider] = useState(false)
  const layoutRef = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    sessionStorage.setItem(STORAGE_KEY, activePage)
  }, [activePage])

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

  const normalizedUser = (user || '').replace(/^hive:/i, '').toLowerCase()
  const hiveUser = normalizedUser ? `hive:${normalizedUser}` : ''
  // const canSeeInARow = ALLOWED_GAMER_HANDLES.includes(normalizedUser)
  const canSeeInARow = true //  enable for all users

  const visibleContracts = useMemo(() => {
    if (canSeeInARow) return contracts
    return contracts.filter((c) => c.vscId !== IN_A_ROW_VSC_ID)
  }, [contracts, canSeeInARow])

  useEffect(() => {
    if (canSeeInARow) return
    if (contractId === IN_A_ROW_VSC_ID) {
      const fallback = visibleContracts[0]?.vscId || ''
      setContractId(fallback)
      setFnName('')
    }
  }, [canSeeInARow, contractId, setContractId, setFnName, visibleContracts])

  const selectedContract = useMemo(
    () => visibleContracts.find((c) => c.vscId === contractId),
    [visibleContracts, contractId]
  )

  const selectedFunction = useMemo(
    () => selectedContract?.functions?.find((f) => f.name === fnName),
    [selectedContract, fnName]
  )
  const isDaoContract = selectedContract?.vscId === DAO_VSC_ID
  const isLotteryContract = selectedContract?.vscId === LOTTERY_VSC_ID

  const handleCreateDao = useCallback(() => {
    setContractId(DAO_VSC_ID)
    setFnName('project_create')
    setStep(2)
  }, [setContractId, setFnName, setStep])

  const handleCreateProposal = useCallback((projectId) => {
    setContractId(DAO_VSC_ID)
    setFnName('proposal_create')
    if (projectId) {
      try {
        sessionStorage.setItem(DAO_PROPOSAL_PREFILL_KEY, String(projectId))
      } catch {}
      setParams((prev) => ({
        ...prev,
        'Project Id': projectId,
        projectId: projectId,
      }))
    }
    setStep(2)
  }, [setContractId, setFnName, setParams, setStep])

  const handleNext = () => {
    if (!selectedContract) return

    if (isMobile && !selectedFunction) {
      setActivePage('details')
      return
    }

    const nextStep = selectedFunction?.parse === 'game' ? 3 : 2
    setStep(nextStep)
  }

  const mobileTabs = useMemo(() => {
    const detailsLabel = isDaoContract
      ? 'DAO'
      : isLotteryContract
        ? 'Lottery'
        : selectedContract?.functions?.[0]?.parse === 'game'
          ? 'Games'
          : 'Functions'

    return [
      { id: 'list', label: 'Contracts' },
      {
        id: 'details',
        label: detailsLabel,
      },
    ]
  }, [isDaoContract, isLotteryContract, selectedContract])

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
    <TerminalContainer title="Select Contract Function"
    titleOnMinimize="Contract"
    backgroundColor="rgba(0, 0, 0, 0.5)"
    >
      
      <p
        style={{
          textAlign: 'justify',
          lineHeight: 1.5,
          // color: '#0ff',
          marginBottom: '0.8rem',
          fontSize: isMobile ? '0.9rem' : '1rem',
          padding: isMobile ? '0 1rem' : 0,
        }}
      >
        These are{' '}
        <span
          onClick={() =>
            popup?.openPopup?.({
              title: 'Currently Supported Contracts',
              body: () => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', lineHeight: 1.5 }}>
                  <p>
                    If you’re a developer with your own creations on-chain, drop a signal to{' '}
                    <a href="https://discord.gg/mG5tUWWXB3" target="_blank" rel="noreferrer">
                      @tibfox
                    </a>
                    . He’ll sync your contract metadata into the system so it becomes available via the Ōkinoko
                    terminal soon.
                  </p>
                </div>
              ),
            })
          }
          style={{
            color: 'var(--color-primary)',
            fontStyle: 'italic',
            cursor: 'pointer',
          }}
        >
          currently supported
        </span>{' '}
        smart contracts running on the Magi blockchain.
      </p>

      <MobileTabs
        visible={isMobile}
        tabs={mobileTabs}
        activeTab={activePage}
        onChange={setActivePage}
      />

      {/* --- Main Content --- */}
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
        {/* --- Contract List/Grid --- */}
        <div
          style={{
            display: isMobile
              ? activePage === 'list'
                ? 'block'
                : 'none'
              : 'block',
            height: '100%',
            minHeight: 0,
            overflowY: 'auto',
            pointerEvents: leftCollapsed ? 'none' : 'auto',
            visibility: leftCollapsed ? 'hidden' : 'visible',
          }}
        >
          {/* To revert to list on mobile, change ContractGrid back to ContractList with isMobile prop */}
          <ContractGrid
            contracts={visibleContracts}
            contractId={contractId}
            setContractId={(id) => {
              setContractId(id)
              setFnName('')
            }}
            setFnName={setFnName}
          />
        </div>

        {/* --- Divider --- */}
        {!isMobile && (
          <ResizableDivider
            leftCollapsed={leftCollapsed}
            rightCollapsed={rightCollapsed}
            onDragStart={() => setDraggingDivider(true)}
          />
        )}

        {/* --- Contract Details --- */}
        <div
          style={{
            display: isMobile
              ? activePage === 'details'
                ? 'block'
                : 'none'
              : 'block',
            height: '100%',
            minHeight: 0,
            overflowY: 'auto',
            paddingLeft: isMobile ? '0' : '10px',
            pointerEvents: rightCollapsed ? 'none' : 'auto',
            visibility: rightCollapsed ? 'hidden' : 'visible',
          }}
        >
          <ContractDetails
            isMobile={isMobile}
            selectedContract={selectedContract}
            selectedFunction={selectedFunction}
            fnName={fnName}
            setFnName={setFnName}
            setParams={setParams}
            setStep={setStep}
            setContractId={setContractId}
            user={hiveUser}
            isDaoContract={isDaoContract}
            onCreateDao={handleCreateDao}
            onCreateProposal={handleCreateProposal}
          />
        </div>
      </div>

      {/* --- Navigation Buttons --- */}
      <div
        style={{
          display: 'flex',
          marginTop: '10px',
          gap: '12px',
          flexShrink: 0,
          justifyContent: 'space-between',
          width: '100%',
        }}
      >
        <NeonButton onClick={() => setStep(0)}>
          <FontAwesomeIcon icon={faChevronLeft} style={{ marginRight: '10px' }} />
          Back
        </NeonButton>
        <div className="next-button-glitter-wrapper">
         
          <NeonButton
            disabled={!selectedContract || (!isMobile && !selectedFunction)}
            onClick={handleNext}
            style={{ position: 'relative', overflow: 'hidden' }}
          >
            <SparkleButton>
            {/* <div className="pixel-sparkle-grid pixel-sparkle-grid-twinkle">
              {Array.from({ length: 90 }).map((_, i) => (
                <div key={`twinkle-${i}`} className="pixel-sparkle-twinkle"></div>
              ))}
            </div>
            <div className="pixel-sparkle-grid pixel-sparkle-grid-overlay">
              {Array.from({ length: 90 }).map((_, i) => (
                <div key={`overlay-${i}`} className="pixel-sparkle-overlay"></div>
              ))}
            </div>
            <span style={{ position: 'relative', zIndex: 3 }}> */}
              Next
              <FontAwesomeIcon icon={faChevronRight} style={{ marginLeft: '10px' }} />
            {/* </span> */}
            </SparkleButton>
          </NeonButton>
        </div>
      </div>
    </TerminalContainer>
  )
}
