import  { useMemo, useState, useEffect } from 'preact/hooks'
import contractsCfg from '../../data/contracts.json'
import TerminalContainer from '../TerminalContainer.jsx'
import { useAioha } from '@aioha/react-ui'
import ExecuteForm from './ExecuteForm.jsx'
import ExecutePreview from './ExecutePreview.jsx'
import useExecuteHandler from '../../lib/useExecuteHandler.js'
import NeonButton from '../buttons/NeonButton.jsx'
import { loadPendingTx } from '../../lib/txBridge.js'

export default function StepExecute({
  contractId,
  fnName,
  params,
  setParams,
  setStep,
}) {
  const { user } = useAioha()
  const [isMobile, setIsMobile] = useState(false)
  const [activePage, setActivePage] = useState('form')
  const [resumedTx, setResumedTx] = useState(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

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
  } = useExecuteHandler({  contract, fn, params, setParams, resumedTx })

  const handleSendAndForward = async () => {
    if (isMobile && activePage !== 'preview') {
      setActivePage('preview')
    }
    await handleSend()
  }

  return (
    <TerminalContainer title="Input & Execute Function">
      {isMobile && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '10px',
          }}
        >
          <NeonButton
            onClick={() => setActivePage('form')}
            style={{ opacity: activePage === 'form' ? 1 : 0.5 }}
          >
            INPUT
          </NeonButton>
          <NeonButton
            onClick={() => setActivePage('preview')}
            style={{ opacity: activePage === 'preview' ? 1 : 0.5 }}
          >
            Preview & Logs
          </NeonButton>
        </div>
      )}

      {/* ✅ Show TX resume banner */}
      {resumedTx && (
        <div
          style={{
            background: 'rgba(0,255,136,0.1)',
            border: '1px solid #00ff88',
            padding: '8px 12px',
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '0.85rem',
            marginBottom: '10px',
            color: '#00ff88',
          }}
        >
          🧩 Resumed transaction: <b>{resumedTx.fnName}</b> on <b>{resumedTx.contractId}</b>
        </div>
      )}

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
        <NeonButton onClick={() => setStep(1)}>◀ Back</NeonButton>
        <NeonButton
          disabled={pending || !allMandatoryFilled}
          onClick={handleSendAndForward}
        >
          {pending ? 'Sending…' : 'Send ▶'}
        </NeonButton>
      </div>
    </TerminalContainer>
  )
}
