import { useState, useMemo } from 'preact/hooks'
import { KeyTypes } from '@aioha/aioha'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faTrash } from '@fortawesome/free-solid-svg-icons'
import FloatingLabelInput from '../common/FloatingLabelInput.jsx'
import FormField from '../common/FormField.jsx'

const normalizeReceiver = (val) => {
  let next = val.replace(/@/g, '')
  if (!next.startsWith('hive:') && next.trim() !== '') {
    next = 'hive:' + next.replace(/^hive:/, '').replace(/^:+/, '')
  }
  return next
}

export default function NftDistributePopup({ onClose, onSuccess, aioha, user, contractId, tokenId, balance, collectionInfo }) {
  const [entries, setEntries] = useState([{ to: 'hive:', amount: '1' }])
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)

  const hiveAccount = user ? (user.startsWith('hive:') ? user : `hive:${user}`) : ''

  const totalAmount = useMemo(() => {
    return entries.reduce((sum, e) => {
      const n = parseInt(e.amount, 10)
      return sum + (isNaN(n) || n <= 0 ? 0 : n)
    }, 0)
  }, [entries])

  const validation = useMemo(() => {
    if (entries.length === 0) return { valid: false, error: null }
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i]
      const name = e.to.startsWith('hive:') ? e.to.slice(5) : e.to
      if (!name.trim()) return { valid: false, error: null }
      if (name.length < 3) return { valid: false, error: `Recipient ${i + 1}: username too short` }
      const amt = parseInt(e.amount, 10)
      if (isNaN(amt) || amt <= 0) return { valid: false, error: `Recipient ${i + 1}: invalid amount` }
    }
    if (totalAmount > balance) return { valid: false, error: `Total amount (${totalAmount}) exceeds your balance (${balance})` }
    return { valid: true, error: null }
  }, [entries, totalAmount, balance])

  const addEntry = () => setEntries((prev) => [...prev, { to: 'hive:', amount: '1' }])
  const removeEntry = (idx) => setEntries((prev) => prev.filter((_, i) => i !== idx))
  const updateEntry = (idx, field, value) => {
    setEntries((prev) => prev.map((e, i) => i === idx ? { ...e, [field]: field === 'to' ? normalizeReceiver(value) : value } : e))
  }

  const handleDistribute = async () => {
    if (!validation.valid || isProcessing) return
    setIsProcessing(true)
    setError(null)

    try {
      // Group by recipient — if same recipient appears multiple times, sum amounts
      const grouped = {}
      for (const e of entries) {
        const to = e.to.trim()
        const amt = parseInt(e.amount, 10)
        grouped[to] = (grouped[to] || 0) + amt
      }

      const recipients = Object.keys(grouped)

      if (recipients.length === 1) {
        // Single recipient — use safeTransferFrom
        const payload = {
          from: hiveAccount,
          to: recipients[0],
          id: tokenId,
          amount: grouped[recipients[0]],
          data: '',
        }
        const res = await aioha.vscCallContract(contractId, 'safeTransferFrom', payload, 10000, [], KeyTypes.Active)
        if (res?.success) {
          onSuccess?.()
          onClose()
        } else {
          setError(res?.error || 'Transaction failed')
        }
      } else {
        // Multiple recipients — use safeBatchTransferFrom per recipient
        let allOk = true
        for (const to of recipients) {
          const payload = {
            from: hiveAccount,
            to,
            ids: tokenId,
            amounts: `${grouped[to]}`,
            data: '',
          }
          const res = await aioha.vscCallContract(contractId, 'safeBatchTransferFrom', payload, 10000, [], KeyTypes.Active)
          if (!res?.success) {
            setError(`Failed for ${to}: ${res?.error || 'Transaction failed'}`)
            allOk = false
            break
          }
        }
        if (allOk) {
          onSuccess?.()
          onClose()
        }
      }
    } catch (err) {
      setError(err.message || 'Unknown error')
    } finally {
      setIsProcessing(false)
    }
  }

  const canSubmit = validation.valid && !isProcessing
  const remaining = balance - totalAmount

  return (
    <div className="neon-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
      <div style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-primary-darker)', marginBottom: '0.25rem' }}>
        {collectionInfo?.symbol || '???'} #{tokenId} — Balance: {balance}
      </div>

      {entries.map((e, idx) => (
        <div key={idx} style={{
          display: 'flex', gap: '0.4rem', alignItems: 'flex-end',
          padding: '0.4rem 0.5rem',
          border: '1px solid var(--color-primary-darkest)',
        }}>
          <div style={{ flex: 1 }}>
            <FormField label={`Recipient ${entries.length > 1 ? idx + 1 : ''}`} mandatory>
              {({ labelText }) => (
                <FloatingLabelInput
                  label={labelText}
                  type="text"
                  value={e.to}
                  onChange={(ev) => updateEntry(idx, 'to', ev.target.value)}
                  placeholder="hive:username"
                  style={{ width: '100%' }}
                />
              )}
            </FormField>
          </div>
          <div style={{ width: '80px' }}>
            <FormField label="Amount" mandatory>
              {({ labelText }) => (
                <FloatingLabelInput
                  label={labelText}
                  type="number"
                  min="1"
                  max={balance}
                  value={e.amount}
                  onChange={(ev) => updateEntry(idx, 'amount', ev.target.value)}
                  style={{ width: '100%' }}
                />
              )}
            </FormField>
          </div>
          {entries.length > 1 && (
            <button
              type="button"
              onClick={() => removeEntry(idx)}
              style={{
                background: 'transparent', border: 'none', color: '#ff4444',
                cursor: 'pointer', padding: '0.4rem', fontSize: 'var(--font-size-base)',
              }}
              title="Remove"
            >
              <FontAwesomeIcon icon={faTrash} />
            </button>
          )}
        </div>
      ))}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          type="button"
          onClick={addEntry}
          style={{
            background: 'transparent',
            border: '1px solid var(--color-primary-darkest)',
            color: 'var(--color-primary)',
            cursor: 'pointer',
            padding: '0.4rem 0.75rem',
            fontSize: 'var(--font-size-base)',
            fontFamily: 'var(--font-family-base)',
            display: 'flex', alignItems: 'center', gap: '0.3rem',
          }}
        >
          <FontAwesomeIcon icon={faPlus} /> Add Recipient
        </button>
        <span style={{
          fontSize: 'var(--font-size-base)',
          color: remaining < 0 ? '#ff4444' : 'var(--color-primary-darker)',
        }}>
          {totalAmount} / {balance} ({remaining >= 0 ? `${remaining} remaining` : 'exceeds balance'})
        </span>
      </div>

      {(error || validation.error) && (
        <div style={{ fontSize: 'var(--font-size-base)', color: '#ff4444', padding: '0.25rem 0' }}>
          {error || validation.error}
        </div>
      )}

      <button
        type="button"
        onClick={handleDistribute}
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
        {isProcessing ? 'Distributing...' : `Distribute to ${entries.length} Recipient${entries.length !== 1 ? 's' : ''}`}
      </button>
    </div>
  )
}
