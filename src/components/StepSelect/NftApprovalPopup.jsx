import { useState, useMemo } from 'preact/hooks'
import { KeyTypes } from '@aioha/aioha'
import FloatingLabelInput from '../common/FloatingLabelInput.jsx'
import FormField from '../common/FormField.jsx'
import NeonSwitch from '../common/NeonSwitch.jsx'

const normalizeReceiver = (val) => {
  let next = val.replace(/@/g, '')
  if (!next.startsWith('hive:') && next.trim() !== '') {
    next = 'hive:' + next.replace(/^hive:/, '').replace(/^:+/, '')
  }
  return next
}

export default function NftApprovalPopup({ onClose, onSuccess, aioha, contractId, collectionInfo }) {
  const [operator, setOperator] = useState('hive:')
  const [approved, setApproved] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)

  const isValid = useMemo(() => {
    const name = operator.startsWith('hive:') ? operator.slice(5) : operator
    return name.trim().length >= 3
  }, [operator])

  const handleSubmit = async () => {
    if (!isValid || isProcessing) return
    setIsProcessing(true)
    setError(null)

    try {
      const payload = {
        operator: operator.trim(),
        approved,
      }

      const res = await aioha.vscCallContract(contractId, 'setApprovalForAll', payload, 10000, [], KeyTypes.Active)
      if (res?.success) {
        onSuccess?.()
        onClose()
      } else {
        setError(res?.error || 'Transaction failed')
      }
    } catch (err) {
      setError(err.message || 'Unknown error')
    } finally {
      setIsProcessing(false)
    }
  }

  const canSubmit = isValid && !isProcessing

  return (
    <div className="neon-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
      <div style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-primary-darker)', marginBottom: '0.25rem' }}>
        {collectionInfo?.symbol || '???'} — Operator Approval
      </div>

      <FormField label="Operator" mandatory hintText="The Hive account to grant or revoke transfer permissions.">
        {({ labelText }) => (
          <FloatingLabelInput
            label={labelText}
            type="text"
            value={operator}
            onChange={(e) => setOperator(normalizeReceiver(e.target.value))}
            placeholder="hive:username"
            style={{ width: '100%' }}
          />
        )}
      </FormField>

      <FormField label="Permission" hintText="Approve = operator can transfer all your tokens in this collection. Revoke = remove permission.">
        {() => (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: !approved ? 'var(--color-primary)' : 'var(--color-primary-darker)', fontFamily: 'var(--font-family-base)', fontSize: 'var(--font-size-base)', userSelect: 'none' }}>Revoke</span>
            <NeonSwitch checked={approved} onChange={setApproved} />
            <span style={{ color: approved ? 'var(--color-primary)' : 'var(--color-primary-darker)', fontFamily: 'var(--font-family-base)', fontSize: 'var(--font-size-base)', userSelect: 'none' }}>Approve</span>
          </div>
        )}
      </FormField>

      {error && <div style={{ fontSize: 'var(--font-size-base)', color: '#ff4444', padding: '0.25rem 0' }}>{error}</div>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        style={{
          border: '1px solid var(--color-primary-darkest)',
          background: canSubmit ? 'var(--color-primary-darkest)' : 'transparent',
          color: canSubmit ? 'var(--color-primary)' : 'var(--color-primary-darker)',
          padding: '0.75rem 1rem',
          cursor: canSubmit ? 'pointer' : 'not-allowed',
          fontSize: 'var(--font-size-base)',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          fontFamily: 'var(--font-family-base)',
          transition: 'all 0.2s ease',
          opacity: canSubmit ? 1 : 0.4,
          marginTop: '0.5rem',
        }}
      >
        {isProcessing ? 'Processing...' : approved ? 'Approve Operator' : 'Revoke Approval'}
      </button>
    </div>
  )
}
