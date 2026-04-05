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

const normalizeAccount = (val) => {
  let next = val.replace(/@/g, '')
  if (!next.startsWith('hive:') && next.trim() !== '') {
    next = 'hive:' + next.replace(/^hive:/, '').replace(/^:+/, '')
  }
  return next
}

export default function TokenTransferFromPopup({ onClose, onSuccess, aioha, user, contractId, tokenInfo, defaultFrom }) {
  const decimals = tokenInfo?.decimals || 0
  const smallestUnit = decimals > 0 ? (1 / (10 ** decimals)).toFixed(decimals) : '1'

  const [from, setFrom] = useState(defaultFrom || 'hive:')
  const [to, setTo] = useState('hive:')
  const [amount, setAmount] = useState(smallestUnit)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)

  const rawAmount = useMemo(() => {
    const num = parseFloat(amount)
    if (isNaN(num) || num <= 0) return null
    return Math.round(num * (10 ** decimals))
  }, [amount, decimals])

  const validation = useMemo(() => {
    const fromName = from.startsWith('hive:') ? from.slice(5) : from
    const toName = to.startsWith('hive:') ? to.slice(5) : to
    if (!fromName.trim()) return { valid: false, error: null }
    if (fromName.length < 3) return { valid: false, error: 'From username too short' }
    if (!toName.trim()) return { valid: false, error: null }
    if (toName.length < 3) return { valid: false, error: 'To username too short' }
    if (from === to) return { valid: false, error: 'Cannot transfer to same address' }
    if (!amount || rawAmount === null || rawAmount <= 0) return { valid: false, error: amount ? 'Amount must be greater than 0' : null }
    return { valid: true, error: null }
  }, [from, to, amount, rawAmount])

  const handleSend = async () => {
    if (!validation.valid || isProcessing) return
    setIsProcessing(true)
    setError(null)

    try {
      const res = await aioha.vscCallContract(
        contractId,
        'transferFrom',
        { from, to, amount: rawAmount },
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

  const handleAmountChange = (e) => {
    const val = e.target.value
    if (val !== '' && !/^\d*\.?\d*$/.test(val)) return
    if (decimals > 0) {
      const parts = val.split('.')
      if (parts[1] && parts[1].length > decimals) return
    } else if (val.includes('.')) { return }
    setAmount(val)
  }

  const canSubmit = validation.valid && !isProcessing

  return (
    <div className="neon-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
      <div style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-primary-darker)', marginBottom: '0.25rem' }}>
        {tokenInfo?.name || 'Token'} ({tokenInfo?.symbol || '???'}) — Transfer using allowance
      </div>

      <FormField label="From (Owner)" mandatory hintText="The account whose tokens you have allowance to spend.">
        {({ labelText }) => (
          <FloatingLabelInput
            label={labelText}
            type="text"
            value={from}
            onChange={(e) => setFrom(normalizeAccount(e.target.value))}
            placeholder="hive:username"
            style={{ width: '100%' }}
          />
        )}
      </FormField>

      <FormField label="To (Recipient)" mandatory hintText="The account to send tokens to.">
        {({ labelText }) => (
          <FloatingLabelInput
            label={labelText}
            type="text"
            value={to}
            onChange={(e) => setTo(normalizeAccount(e.target.value))}
            placeholder="hive:username"
            style={{ width: '100%' }}
          />
        )}
      </FormField>

      <FormField label="Amount" mandatory hintText="Amount to transfer (must not exceed your allowance).">
        {({ labelText }) => (
          <>
            <FloatingLabelInput
              label={labelText}
              type="number"
              min="0"
              step={decimals > 0 ? smallestUnit : '1'}
              value={amount}
              onChange={handleAmountChange}
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
        {isProcessing ? 'Sending...' : 'Transfer From'}
      </button>
    </div>
  )
}
