import { useState, useMemo } from 'preact/hooks'
import { KeyTypes } from '@aioha/aioha'
import FloatingLabelInput from '../common/FloatingLabelInput.jsx'
import FormField from '../common/FormField.jsx'
import { MAX_ADDRESS_LEN, MAX_TOKEN_ID_LEN, validateAddress, validateTokenId } from '../../lib/nftValidation.js'

const normalizeReceiver = (val) => {
  let next = val.replace(/@/g, '')
  if (!next.startsWith('hive:') && next.trim() !== '') {
    next = 'hive:' + next.replace(/^hive:/, '').replace(/^:+/, '')
  }
  return next
}

export default function NftTokenApprovePopup({ onClose, onSuccess, aioha, contractId, collectionInfo }) {
  const [spender, setSpender] = useState('hive:')
  const [tokenId, setTokenId] = useState('')
  const [amount, setAmount] = useState('1')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)

  const spenderError = useMemo(() => {
    const trimmed = spender.trim()
    if (!trimmed) return null
    return validateAddress(trimmed)
  }, [spender])

  const tokenIdError = useMemo(() => {
    const trimmed = tokenId.trim()
    if (!trimmed) return null
    return validateTokenId(trimmed)
  }, [tokenId])

  const parsedAmount = useMemo(() => {
    const n = parseInt(amount, 10)
    return isNaN(n) || n < 0 ? null : n
  }, [amount])

  const isValid = useMemo(() => {
    const name = spender.startsWith('hive:') ? spender.slice(5) : spender
    if (!name.trim() || name.length < 3) return false
    if (!tokenId.trim()) return false
    if (spenderError || tokenIdError) return false
    if (parsedAmount === null) return false
    return true
  }, [spender, tokenId, parsedAmount, spenderError, tokenIdError])

  const handleSubmit = async () => {
    if (!isValid || isProcessing) return
    setIsProcessing(true)
    setError(null)

    try {
      const payload = {
        spender: spender.trim(),
        id: tokenId.trim(),
        amount: parsedAmount,
      }

      const res = await aioha.vscCallContract(contractId, 'approve', payload, 10000, [], KeyTypes.Active)
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
        {collectionInfo?.symbol || '???'} — Token Approval (ERC-6909)
      </div>

      <FormField label="Spender" mandatory hintText="The Hive account to approve for spending this specific token.">
        {({ labelText }) => (
          <>
            <FloatingLabelInput label={labelText} type="text" value={spender} maxLength={MAX_ADDRESS_LEN} onChange={(e) => setSpender(normalizeReceiver(e.target.value))} placeholder="hive:username" style={{ width: '100%' }} />
            {spenderError && <div style={{ fontSize: 'var(--font-size-base)', color: '#ff4444', marginTop: '0.25rem' }}>{spenderError}</div>}
          </>
        )}
      </FormField>

      <FormField label="Token ID" mandatory hintText={`The specific token ID to approve (max ${MAX_TOKEN_ID_LEN} chars).`}>
        {({ labelText }) => (
          <>
            <FloatingLabelInput label={labelText} type="text" value={tokenId} maxLength={MAX_TOKEN_ID_LEN} onChange={(e) => setTokenId(e.target.value.slice(0, MAX_TOKEN_ID_LEN))} style={{ width: '100%' }} />
            {tokenIdError && <div style={{ fontSize: 'var(--font-size-base)', color: '#ff4444', marginTop: '0.25rem' }}>{tokenIdError}</div>}
          </>
        )}
      </FormField>

      <FormField label="Amount" mandatory hintText="Number of tokens the spender is allowed to transfer. Set to 0 to revoke.">
        {({ labelText }) => (
          <FloatingLabelInput label={labelText} type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ width: '100%' }} />
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
        {isProcessing ? 'Approving...' : parsedAmount === 0 ? 'Revoke Token Approval' : 'Approve Token'}
      </button>
    </div>
  )
}
