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

export default function TokenTransferOwnerPopup({ onClose, onSuccess, aioha, user, contractId, tokenInfo }) {
  const [newOwner, setNewOwner] = useState('hive:')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)

  const validation = useMemo(() => {
    const ownerName = newOwner.startsWith('hive:') ? newOwner.slice(5) : newOwner
    if (!ownerName.trim()) return { valid: false, error: null }
    if (ownerName.length < 3) return { valid: false, error: 'Username too short' }
    const currentUser = user?.startsWith('hive:') ? user : `hive:${user}`
    if (newOwner === currentUser) return { valid: false, error: 'Cannot transfer to yourself' }
    return { valid: true, error: null }
  }, [newOwner, user])

  const handleTransfer = async () => {
    if (!validation.valid || isProcessing) return
    setIsProcessing(true)
    setError(null)

    try {
      const res = await aioha.vscCallContract(
        contractId,
        'changeOwner',
        { newOwner },
        10000,
        [],
        KeyTypes.Active,
      )

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

  const canSubmit = validation.valid && !isProcessing

  return (
    <div className="neon-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
      <div style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-primary-darker)', marginBottom: '0.25rem' }}>
        {tokenInfo?.name || 'Token'} ({tokenInfo?.symbol || '???'}) — Transfer Ownership
      </div>

      <div style={{ fontSize: 'var(--font-size-base)', color: '#ff4444', padding: '0.5rem', border: '1px solid #ff4444', marginBottom: '0.25rem' }}>
        Warning: This will permanently transfer control of this token contract. The new owner will be able to mint tokens and manage the contract. This action cannot be undone.
      </div>

      <FormField label="New Owner" mandatory hintText="The Hive account that will become the new contract owner.">
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

      {(error || validation.error) && (
        <div style={{ fontSize: 'var(--font-size-base)', color: '#ff4444', padding: '0.25rem 0' }}>
          {error || validation.error}
        </div>
      )}

      <button
        type="button"
        onClick={handleTransfer}
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
        {isProcessing ? 'Transferring...' : 'Transfer Ownership'}
      </button>
    </div>
  )
}
