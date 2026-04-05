import { useState, useMemo } from 'preact/hooks'
import { KeyTypes } from '@aioha/aioha'
import FloatingLabelInput from '../common/FloatingLabelInput.jsx'
import FormField from '../common/FormField.jsx'

export default function NftBurnPopup({ onClose, onSuccess, aioha, user, contractId, tokenId, balance, isUnique, collectionInfo }) {
  const [amount, setAmount] = useState('1')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)

  const hiveAccount = user ? (user.startsWith('hive:') ? user : `hive:${user}`) : ''

  const parsedAmount = useMemo(() => {
    if (isUnique) return 1
    const n = parseInt(amount, 10)
    return isNaN(n) || n <= 0 ? null : n
  }, [amount, isUnique])

  const isValid = useMemo(() => {
    if (isUnique) return true
    return parsedAmount !== null && parsedAmount <= balance
  }, [parsedAmount, balance, isUnique])

  const handleBurn = async () => {
    if (!isValid || isProcessing) return
    setIsProcessing(true)
    setError(null)

    try {
      const payload = {
        from: hiveAccount,
        id: tokenId,
        amount: parsedAmount,
      }

      const res = await aioha.vscCallContract(contractId, 'burn', payload, 10000, [], KeyTypes.Active)
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

  return (
    <div className="neon-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
      <div style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-primary-darker)', marginBottom: '0.25rem' }}>
        {collectionInfo?.symbol || '???'} #{tokenId}{isUnique ? ' — Unique' : ` — Balance: ${balance}`}
      </div>

      {!isUnique && (
        <FormField label="Amount to Burn" mandatory hintText={`Number of tokens to burn (max: ${balance}).`}>
          {({ labelText }) => (
            <FloatingLabelInput label={labelText} type="number" min="1" max={balance} value={amount} onChange={(e) => setAmount(e.target.value)} style={{ width: '100%' }} />
          )}
        </FormField>
      )}

      {!isUnique && parsedAmount !== null && parsedAmount > balance && (
        <div style={{ fontSize: 'var(--font-size-base)', color: '#ff4444', padding: '0.25rem 0' }}>
          Amount exceeds your balance of {balance}
        </div>
      )}

      {error && <div style={{ fontSize: 'var(--font-size-base)', color: '#ff4444', padding: '0.25rem 0' }}>{error}</div>}

      <button
        type="button"
        onClick={handleBurn}
        disabled={!isValid || isProcessing}
        style={{
          border: '1px solid var(--color-primary-darkest)',
          background: isValid && !isProcessing ? 'var(--color-primary-darkest)' : 'transparent',
          color: isValid && !isProcessing ? 'var(--color-primary)' : 'var(--color-primary-darker)',
          padding: '0.75rem 1rem',
          cursor: isValid && !isProcessing ? 'pointer' : 'not-allowed',
          fontSize: 'var(--font-size-base)',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          fontFamily: 'var(--font-family-base)',
          transition: 'all 0.2s ease',
          opacity: isValid && !isProcessing ? 1 : 0.4,
          marginTop: '0.5rem',
        }}
      >
        {isProcessing ? 'Burning...' : 'Burn NFT'}
      </button>
    </div>
  )
}
