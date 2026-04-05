import { useState, useMemo } from 'preact/hooks'
import { KeyTypes } from '@aioha/aioha'
import FloatingLabelInput from '../common/FloatingLabelInput.jsx'
import FormField from '../common/FormField.jsx'

function formatTokenBalance(balance, decimals) {
  if (!balance) return '0'
  if (!decimals) return String(Number(balance))
  const fixed = (balance / (10 ** decimals)).toFixed(decimals)
  return fixed.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
}

export default function TokenMintPopup({ onClose, onSuccess, aioha, user, contractId, tokenInfo }) {
  const decimals = tokenInfo?.decimals || 0
  const currentSupply = tokenInfo?.supply || 0
  const maxSupply = tokenInfo?.maxSupply || 0
  const mintableRaw = maxSupply > 0 ? maxSupply - currentSupply : null
  const mintableDisplay = mintableRaw !== null ? formatTokenBalance(mintableRaw, decimals) : 'Unlimited'

  const [amount, setAmount] = useState(decimals > 0 ? (1).toFixed(decimals) : '1')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)

  const rawAmount = useMemo(() => {
    const num = parseFloat(amount)
    if (isNaN(num) || num <= 0) return null
    return Math.round(num * (10 ** decimals))
  }, [amount, decimals])

  const validation = useMemo(() => {
    if (!amount || rawAmount === null || rawAmount <= 0) return { valid: false, error: amount ? 'Amount must be greater than 0' : null }
    if (mintableRaw !== null && rawAmount > mintableRaw) return { valid: false, error: `Amount exceeds mintable supply (${mintableDisplay})` }
    return { valid: true, error: null }
  }, [amount, rawAmount, mintableRaw, mintableDisplay])

  const handleMint = async () => {
    if (!validation.valid || isProcessing) return
    setIsProcessing(true)
    setError(null)

    try {
      const res = await aioha.vscCallContract(
        contractId,
        'mint',
        { amount: rawAmount },
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

  const formatAmount = () => {
    const num = parseFloat(amount)
    if (isNaN(num)) return
    setAmount(num.toFixed(decimals))
  }

  const canSubmit = validation.valid && !isProcessing

  return (
    <div className="neon-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
      <div style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-primary-darker)', marginBottom: '0.25rem' }}>
        {tokenInfo?.name || 'Token'} ({tokenInfo?.symbol || '???'}) — Supply: {formatTokenBalance(currentSupply, decimals)} / {maxSupply > 0 ? formatTokenBalance(maxSupply, decimals) : 'Unlimited'}
      </div>

      <FormField label="Amount" mandatory hintText={`Tokens to mint (remaining: ${mintableDisplay}).`}>
        {({ labelText }) => (
          <>
            <FloatingLabelInput
              label={labelText}
              type="number"
              min="0"
              step={decimals > 0 ? (1 / (10 ** decimals)).toFixed(decimals) : '1'}
              value={amount}
              onChange={(e) => {
                const val = e.target.value
                if (val !== '' && !/^\d*\.?\d*$/.test(val)) return
                if (decimals > 0) {
                  const parts = val.split('.')
                  if (parts[1] && parts[1].length > decimals) return
                } else if (val.includes('.')) { return }
                setAmount(val)
              }}
              onBlur={formatAmount}
              style={{ width: '100%' }}
            />
            {rawAmount > 0 && decimals > 0 && (
              <div style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-primary-darker)', marginTop: '0.25rem' }}>
                On-chain value: {rawAmount} smallest units
              </div>
            )}
          </>
        )}
      </FormField>

      {(error || validation.error) && (
        <div style={{ fontSize: 'var(--font-size-base)', color: '#ff4444', padding: '0.25rem 0' }}>
          {error || validation.error}
        </div>
      )}

      <button
        type="button"
        onClick={handleMint}
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
        {isProcessing ? 'Minting...' : 'Mint Tokens'}
      </button>
    </div>
  )
}
