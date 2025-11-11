import { useMemo, useState, useEffect } from 'preact/hooks'
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

  const contract = useMemo(
    () => contractsCfg.contracts.find((c) => c.vscId === contractId),
    [contractId]
  )

  const fn = useMemo(
    () => contract?.functions?.find((f) => f.name === fnName),
    [contract, fnName]
  )

  const {
    logs,
    pending,
    waiting,
    jsonPreview,
    handleSend,
    allMandatoryFilled,
  } = useExecuteHandler({ contract, fn, params, setParams, resumedTx })

  const handleSendAndForward = async () => {
    if (isMobile && activePage !== 'preview') {
      setActivePage('preview')
    }
    await handleSend()
  }

  const mobileTabs = useMemo(
    () => [
      { id: 'form', label: 'INPUT' },
      { id: 'preview', label: 'Preview & Logs' },
    ],
    []
  )

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
          gridTemplateColumns: isMobile ? 'none' : '1fr 1fr',
          gap: isMobile ? '0' : '20px',
          flex: 1,
          minHeight: 0,
          height: '100%',
          width: '100%',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* FORM (hide only on mobile when not active) */}
        <div
          style={{
            display: !isMobile || activePage === 'form' ? 'flex' : 'none',
            flexDirection: 'column',
            height: '100%',
            overflowY: 'auto',
            flex: 1,
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

        {/* PREVIEW (always visible on desktop) */}
        <div
          style={{
            display: !isMobile || activePage === 'preview' ? 'flex' : 'none',
            flexDirection: 'column',
            height: '100%',
            overflowY: 'auto',
            flex: 1,
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
        <NeonButton onClick={handleSendAndForward}>
            {pending ? (
              'Sending…'
            ) : (
              <>
                Send
                <FontAwesomeIcon icon={faBolt} style={{ marginLeft: '10px' }} />
              </>
            )}
        </NeonButton>
      </div>
    </TerminalContainer>
  )
}
