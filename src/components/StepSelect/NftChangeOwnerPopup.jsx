import { useState, useMemo } from 'preact/hooks'
import { KeyTypes } from '@aioha/aioha'
import FloatingLabelInput from '../common/FloatingLabelInput.jsx'
import FormField from '../common/FormField.jsx'

const normalizeReceiver = (val) => {
  let next = val.replace(/@/g, '')
  if (!next.startsWith('hive:') && next.trim() !== '') {
    next = 'hive:' + next.replace(/^hive:/, '').replace(/^:+/, '')
  }
  return next
}

export default function NftChangeOwnerPopup({ onClose, onSuccess, aioha, contractId, collectionInfo }) {
  const [newOwner, setNewOwner] = useState('hive:')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)

  const isValid = useMemo(() => {
    const name = newOwner.startsWith('hive:') ? newOwner.slice(5) : newOwner
    return name.trim().length >= 3
  }, [newOwner])

  const handleSubmit = async () => {
    if (!isValid || isProcessing) return
    setIsProcessing(true)
    setError(null)

    try {
      const payload = { newOwner: newOwner.trim() }

      const res = await aioha.vscCallContract(contractId, 'changeOwner', payload, 10000, [], KeyTypes.Active)
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
        {collectionInfo?.symbol || '???'} — Transfer Ownership
      </div>

      <div style={{ fontSize: 'var(--font-size-base)', color: '#ff4444', padding: '0.25rem 0' }}>
        Warning: This will permanently transfer ownership of the contract. The new owner will have full control over the collection.
      </div>

      <FormField label="New Owner" mandatory hintText="The Hive account that will become the new owner.">
        {({ labelText }) => (
          <FloatingLabelInput
            label={labelText}
            type="text"
            value={newOwner}
            onChange={(e) => setNewOwner(normalizeReceiver(e.target.value))}
            placeholder="hive:username"
            style={{ width: '100%' }}
          />
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
          color: canSubmit ? '#ff4444' : 'var(--color-primary-darker)',
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
        {isProcessing ? 'Transferring...' : 'Transfer Ownership'}
      </button>
    </div>
  )
}
