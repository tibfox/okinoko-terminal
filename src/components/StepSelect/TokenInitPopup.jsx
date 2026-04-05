import { useState, useMemo, useEffect } from 'preact/hooks'
import { KeyTypes } from '@aioha/aioha'
import FloatingLabelInput from '../common/FloatingLabelInput.jsx'
import FormField from '../common/FormField.jsx'

export default function TokenInitPopup({ onClose, onSuccess, aioha, user, contractId, defaultName }) {
  const [name, setName] = useState(defaultName || '')
  const [symbol, setSymbol] = useState('')
  const [decimals, setDecimals] = useState('0')
  const [maxSupply, setMaxSupply] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)

  const normalizedUser = useMemo(() => {
    if (!user) return 'unknown'
    return user.startsWith('hive:') ? user.slice(5) : user
  }, [user])

  const formatMaxSupply = () => {
    if (!maxSupply) return
    const dec = parseInt(decimals, 10)
    if (isNaN(dec) || dec < 0 || dec > 18) return
    const num = parseFloat(maxSupply)
    if (isNaN(num)) return
    setMaxSupply(num.toFixed(dec))
  }

  // When decimals change, reformat maxSupply to show the correct decimal places
  useEffect(() => {
    formatMaxSupply()
  }, [decimals])

  const parsedDecimals = useMemo(() => {
    const dec = parseInt(decimals, 10)
    return isNaN(dec) || dec < 0 || dec > 18 ? null : dec
  }, [decimals])

  const rawMaxSupply = useMemo(() => {
    if (parsedDecimals === null) return null
    const ms = parseFloat(maxSupply)
    if (!maxSupply || isNaN(ms) || ms <= 0) return null
    return Math.round(ms * (10 ** parsedDecimals))
  }, [maxSupply, parsedDecimals])

  const isValid = useMemo(() => {
    if (!name.trim() || !symbol.trim()) return false
    if (parsedDecimals === null) return false
    if (rawMaxSupply === null || rawMaxSupply <= 0) return false
    return true
  }, [name, symbol, parsedDecimals, rawMaxSupply])

  const handleInit = async () => {
    if (!isValid || isProcessing) return
    setIsProcessing(true)
    setError(null)

    try {
      const payload = {
        name: name.trim(),
        symbol: symbol.trim(),
        decimals: parsedDecimals,
        maxSupply: rawMaxSupply,
      }

      const res = await aioha.vscCallContract(
        contractId,
        'init',
        payload,
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

  return (
    <div className="neon-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
      <div style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-primary-darker)', marginBottom: '0.25rem' }}>
        Contract: {contractId.slice(0, 12)}…
      </div>

      <FormField label="Token Name" mandatory hintText="The name of your token (e.g. 'My Token').">
        {({ labelText }) => (
          <FloatingLabelInput
            label={labelText}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: '100%' }}
          />
        )}
      </FormField>

      <FormField label="Symbol" mandatory hintText="The ticker symbol for your token (e.g. 'MTK').">
        {({ labelText }) => (
          <FloatingLabelInput
            label={labelText}
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            style={{ width: '100%' }}
          />
        )}
      </FormField>

      <FormField label="Decimals" mandatory hintText="Number of decimal places (typically 8).">
        {({ labelText }) => (
          <FloatingLabelInput
            label={labelText}
            type="number"
            min="0"
            value={decimals}
            onChange={(e) => setDecimals(e.target.value)}
            style={{ width: '100%' }}
          />
        )}
      </FormField>

      <FormField label="Max Supply" mandatory hintText="Maximum supply in whole tokens. This will be converted to smallest units based on decimals.">
        {({ labelText }) => (
          <>
            <FloatingLabelInput
              label={labelText}
              type="number"
              min="0"
              step={parsedDecimals > 0 ? (1 / (10 ** parsedDecimals)).toFixed(parsedDecimals) : '1'}
              value={maxSupply}
              onChange={(e) => {
                const val = e.target.value
                if (val !== '' && !/^\d*\.?\d*$/.test(val)) return
                if (parsedDecimals > 0) {
                  const parts = val.split('.')
                  if (parts[1] && parts[1].length > parsedDecimals) return
                } else if (val.includes('.')) { return }
                setMaxSupply(val)
              }}
              onBlur={formatMaxSupply}
              style={{ width: '100%' }}
            />
            {rawMaxSupply > 0 && parsedDecimals > 0 && (
              <div style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-primary-darker)', marginTop: '0.25rem' }}>
                On-chain value: {rawMaxSupply} smallest units ({maxSupply} × 10^{parsedDecimals})
              </div>
            )}
          </>
        )}
      </FormField>

      {error && (
        <div style={{ fontSize: 'var(--font-size-base)', color: '#ff4444', padding: '0.25rem 0' }}>
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleInit}
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
        {isProcessing ? 'Initializing...' : 'Initialize Token'}
      </button>
    </div>
  )
}
