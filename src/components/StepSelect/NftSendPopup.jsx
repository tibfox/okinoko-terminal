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

export default function NftSendPopup({ onClose, onSuccess, aioha, user, contractId, tokenId, balance, isUnique, collectionInfo }) {
  const [to, setTo] = useState('hive:')
  const [amount, setAmount] = useState(isUnique ? '1' : '1')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)

  const hiveAccount = user ? (user.startsWith('hive:') ? user : `hive:${user}`) : ''

  const parsedAmount = useMemo(() => {
    const n = parseInt(amount, 10)
    return isNaN(n) || n <= 0 ? null : n
  }, [amount])

  const validation = useMemo(() => {
    const receiverName = to.startsWith('hive:') ? to.slice(5) : to
    if (!receiverName.trim()) return { valid: false, error: null }
    if (receiverName.length < 3) return { valid: false, error: 'Username too short' }
    if (!isUnique) {
      if (!amount || parsedAmount === null || parsedAmount <= 0) return { valid: false, error: amount ? 'Amount must be greater than 0' : null }
      if (parsedAmount > balance) return { valid: false, error: `Amount exceeds your balance (${balance})` }
    }
    return { valid: true, error: null }
  }, [to, amount, parsedAmount, balance, isUnique])

  const handleSend = async () => {
    if (!validation.valid || isProcessing) return
    setIsProcessing(true)
    setError(null)

    try {
      const payload = {
        from: hiveAccount,
        to: to.trim(),
        id: tokenId,
        amount: isUnique ? 1 : parsedAmount,
        data: '',
      }

      const res = await aioha.vscCallContract(contractId, 'safeTransferFrom', payload, 10000, [], KeyTypes.Active)
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

  const handleReceiverChange = (e) => {
    setTo(normalizeReceiver(e.target.value))
  }

  const canSubmit = validation.valid && !isProcessing

  return (
    <div className="neon-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
      <div style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-primary-darker)', marginBottom: '0.25rem' }}>
        {collectionInfo?.symbol || '???'} #{tokenId}{isUnique ? ' — Unique' : ` — Balance: ${balance}`}
      </div>

      <FormField label="Recipient" mandatory hintText="The Hive username to send the NFT to.">
        {({ labelText }) => (
          <FloatingLabelInput
            label={labelText}
            type="text"
            value={to}
            onChange={handleReceiverChange}
            placeholder="hive:username"
            style={{ width: '100%' }}
          />
        )}
      </FormField>

      {!isUnique && (
        <FormField label="Amount" mandatory hintText={`Number of tokens to send (max: ${balance}).`}>
          {({ labelText }) => (
            <FloatingLabelInput label={labelText} type="number" min="1" max={balance} value={amount} onChange={(e) => setAmount(e.target.value)} style={{ width: '100%' }} />
          )}
        </FormField>
      )}

      {(error || validation.error) && (
        <div style={{ fontSize: 'var(--font-size-base)', color: '#ff4444', padding: '0.25rem 0' }}>
          {error || validation.error}
        </div>
      )}

      <button
        type="button"
        onClick={handleSend}
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
        {isProcessing ? 'Sending...' : 'Send NFT'}
      </button>
    </div>
  )
}
