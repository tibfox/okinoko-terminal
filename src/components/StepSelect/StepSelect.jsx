import { useContext, useEffect, useMemo, useState, useCallback } from 'preact/hooks'
import contractsCfg from '../../data/contracts.json'
import TerminalContainer from '../terminal/TerminalContainer.jsx'
import NeonButton from '../buttons/NeonButton.jsx'
import ContractList from './ContractList.jsx'
import ContractDetails from './ContractDetails.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import MobileTabs from '../common/MobileTabs.jsx'
import { useDeviceBreakpoint } from '../../hooks/useDeviceBreakpoint.js'
import { useAioha } from '@aioha/react-ui'
import { PopupContext } from '../../popup/context.js'

const STORAGE_KEY = 'stepSelectActivePage'
const IN_A_ROW_VSC_ID = 'vsc1BV7jzektV1eyh4Wyfaet1Xfz1WzDH72hRh'
const DAO_VSC_ID = 'vsc1BVa7SPMVKQqsJJZVp2uPQwmxkhX4qbugGt'
// const ALLOWED_GAMER_HANDLES = ['tibfox', 'tibfox.vsc', 'diyhub', 'diyhub.funds']

const getStoredPage = () => {
  if (typeof window === 'undefined') return 'list'
  return sessionStorage.getItem(STORAGE_KEY) || 'list'
}

export default function StepSelect({
  contractId,
  setContractId,
  fnName,
  setFnName,
  setStep,
}) {
  const contracts = contractsCfg.contracts || []
  const { user } = useAioha()
  const isMobile = useDeviceBreakpoint()
  const [activePage, setActivePage] = useState(getStoredPage)
  const popup = useContext(PopupContext)

  useEffect(() => {
    if (typeof window === 'undefined') return
    sessionStorage.setItem(STORAGE_KEY, activePage)
  }, [activePage])

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

  const handleCreateDao = useCallback(() => {
    setContractId(DAO_VSC_ID)
    setFnName('project_create')
    setStep(2)
  }, [setContractId, setFnName, setStep])

  const handleCreateProposal = useCallback(() => {
    setContractId(DAO_VSC_ID)
    setFnName('proposal_create')
    setStep(2)
  }, [setContractId, setFnName, setStep])

  const handleNext = () => {
    if (!selectedContract) return

    if (isMobile && !selectedFunction) {
      setActivePage('details')
      return
    }

    const nextStep = selectedFunction?.parse === 'game' ? 3 : 2
    setStep(nextStep)
  }

  const mobileTabs = useMemo(
    () => [
      { id: 'list', label: 'Contracts' },
      {
        id: 'details',
        label:
          selectedContract?.functions?.[0]?.parse === 'game'
            ? 'Games'
            : 'Functions',
      },
    ],
    [selectedContract]
  )

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
          gridTemplateColumns: isMobile ? 'none' : '1fr 2fr',
          gap: isMobile ? '0' : '25px',
          flex: 1,
          minHeight: 0,
          height: '100%',
          width: '100%',
          overflow: 'hidden',
        }}
      >
        {/* --- Contract List --- */}
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
          }}
        >
          <ContractList
            isMobile={isMobile}
            contracts={visibleContracts}
            contractId={contractId}
            setContractId={(id) => {
              setContractId(id)
              setFnName('')
            }}
            setFnName={setFnName}
          />
        </div>

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
          }}
        >
          <ContractDetails
            isMobile={isMobile}
            selectedContract={selectedContract}
            selectedFunction={selectedFunction}
            fnName={fnName}
            setFnName={setFnName}
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
        <NeonButton
          disabled={!selectedContract || (!isMobile && !selectedFunction)}
          onClick={handleNext}
        >
          Next
          <FontAwesomeIcon icon={faChevronRight} style={{ marginLeft: '10px' }} />
        </NeonButton>
      </div>
    </TerminalContainer>
  )
}
