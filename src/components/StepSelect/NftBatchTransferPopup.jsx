import { useState, useMemo } from 'preact/hooks'
import { KeyTypes } from '@aioha/aioha'
import FloatingLabelInput from '../common/FloatingLabelInput.jsx'
import FormField from '../common/FormField.jsx'
import NftImage from '../common/NftImage.jsx'

const normalizeReceiver = (val) => {
  let next = val.replace(/@/g, '')
  if (!next.startsWith('hive:') && next.trim() !== '') {
    next = 'hive:' + next.replace(/^hive:/, '').replace(/^:+/, '')
  }
  return next
}

const modeBtn = (active) => ({
  padding: '4px 10px',
  cursor: 'pointer',
  background: active ? 'var(--color-primary-darker)' : 'transparent',
  color: active ? 'black' : 'var(--color-primary-darker)',
  border: 'none',
  fontSize: 'var(--font-size-base)',
  fontFamily: 'var(--font-family-base)',
  letterSpacing: '0.03em',
})

export default function NftBatchTransferPopup({ onClose, onSuccess, aioha, user, contractId, userNfts, collectionInfo, nftImageUrls, baseUri }) {
  const hiveAccount = user ? (user.startsWith('hive:') ? user : `hive:${user}`) : ''
  const [recipientMode, setRecipientMode] = useState('same') // 'same' | 'individual'
  const [to, setTo] = useState('hive:')
  const [selected, setSelected] = useState(() =>
    (userNfts || []).map((n) => ({
      tokenId: n.tokenId, balance: n.balance, isUnique: n.isUnique,
      amount: '', checked: false, to: 'hive:',
      contractId: n.contractId,
    }))
  )
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)

  const toggleChecked = (idx) => {
    const updated = [...selected]
    const wasChecked = updated[idx].checked
    updated[idx] = { ...updated[idx], checked: !wasChecked, amount: !wasChecked ? (updated[idx].isUnique ? '1' : '1') : '' }
    setSelected(updated)
  }

  const updateAmount = (idx, val) => {
    const updated = [...selected]
    updated[idx] = { ...updated[idx], amount: val }
    setSelected(updated)
  }

  const updateTo = (idx, val) => {
    const updated = [...selected]
    updated[idx] = { ...updated[idx], to: normalizeReceiver(val) }
    setSelected(updated)
  }

  const checkedEntries = selected.filter((s) => s.checked)

  const validation = useMemo(() => {
    if (checkedEntries.length === 0) return { valid: false, error: null }

    if (recipientMode === 'same') {
      const receiverName = to.startsWith('hive:') ? to.slice(5) : to
      if (!receiverName.trim() || receiverName.length < 3) return { valid: false, error: receiverName.trim() ? 'Username too short' : null }
    }

    for (const e of checkedEntries) {
      const amt = parseInt(e.amount, 10)
      if (isNaN(amt) || amt <= 0) return { valid: false, error: `Invalid amount for ${e.tokenId}` }
      if (amt > e.balance) return { valid: false, error: `Amount exceeds balance for ${e.tokenId}` }

      if (recipientMode === 'individual') {
        const name = e.to.startsWith('hive:') ? e.to.slice(5) : e.to
        if (!name.trim() || name.length < 3) return { valid: false, error: name.trim() ? `Recipient too short for ${e.tokenId}` : null }
      }
    }
    return { valid: true, error: null }
  }, [to, checkedEntries, recipientMode])

  const handleTransfer = async () => {
    if (!validation.valid || isProcessing) return
    setIsProcessing(true)
    setError(null)

    try {
      if (recipientMode === 'same') {
        const ids = checkedEntries.map((e) => e.tokenId).join(',')
        const amounts = checkedEntries.map((e) => parseInt(e.amount, 10)).join(',')
        const payload = { from: hiveAccount, to: to.trim(), ids, amounts, data: '' }
        const res = await aioha.vscCallContract(contractId, 'safeBatchTransferFrom', payload, 10000, [], KeyTypes.Active)
        if (res?.success) { onSuccess?.(); onClose() }
        else setError(res?.error || 'Transaction failed')
      } else {
        // Individual mode: group by recipient
        const grouped = {}
        for (const e of checkedEntries) {
          const recipient = e.to.trim()
          if (!grouped[recipient]) grouped[recipient] = { ids: [], amounts: [] }
          grouped[recipient].ids.push(e.tokenId)
          grouped[recipient].amounts.push(parseInt(e.amount, 10))
        }
        let allOk = true
        for (const [recipient, { ids, amounts }] of Object.entries(grouped)) {
          const payload = { from: hiveAccount, to: recipient, ids: ids.join(','), amounts: amounts.join(','), data: '' }
          const res = await aioha.vscCallContract(contractId, 'safeBatchTransferFrom', payload, 10000, [], KeyTypes.Active)
          if (!res?.success) {
            setError(`Failed for ${recipient}: ${res?.error || 'Transaction failed'}`)
            allOk = false
            break
          }
        }
        if (allOk) { onSuccess?.(); onClose() }
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
        {collectionInfo?.symbol || '???'} — Batch Transfer
      </div>

      {/* Recipient mode toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 'var(--font-size-base)' }}>
        <span style={{ color: 'var(--color-primary-darker)' }}>Recipients:</span>
        <span style={{ display: 'flex', border: '1px solid var(--color-primary-darkest)' }}>
          <span onClick={() => setRecipientMode('same')} style={modeBtn(recipientMode === 'same')}>Same</span>
          <span onClick={() => setRecipientMode('individual')} style={{ ...modeBtn(recipientMode === 'individual'), borderLeft: '1px solid var(--color-primary-darkest)' }}>Individual</span>
        </span>
      </div>

      {/* Shared recipient field (same mode only) */}
      {recipientMode === 'same' && (
        <FormField label="Recipient" mandatory hintText="The Hive username to send tokens to.">
          {({ labelText }) => (
            <FloatingLabelInput
              label={labelText}
              type="text"
              value={to}
              onChange={(e) => setTo(normalizeReceiver(e.target.value))}
              placeholder="hive:username"
              style={{ width: '100%' }}
            />
          )}
        </FormField>
      )}

      <div style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-primary-darker)', marginTop: '0.25rem' }}>
        Select tokens to transfer:
      </div>

      {selected.map((s, idx) => (
        <div
          key={s.tokenId}
          style={{
            display: 'flex', flexDirection: 'column', gap: s.checked && recipientMode === 'individual' ? '0.3rem' : 0,
            padding: '0.4rem 0.5rem',
            border: `1px solid ${s.checked ? 'var(--color-primary-darker)' : 'var(--color-primary-darkest)'}`,
            cursor: 'pointer',
            background: s.checked ? 'rgba(var(--color-primary-rgb, 0,255,0), 0.05)' : 'transparent',
          }}
        >
          <div onClick={() => toggleChecked(idx)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="checkbox" checked={s.checked} readOnly style={{ accentColor: 'var(--color-primary)', cursor: 'pointer' }} />
            <NftImage contractId={s.contractId} tokenId={s.tokenId} nftImageUrls={nftImageUrls} baseUri={baseUri} mode="avatar" />
            <span style={{ flex: 1, fontSize: 'var(--font-size-base)', color: 'var(--color-primary)' }}>
              {s.tokenId}
            </span>
            {!s.isUnique && (
              <span style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-primary-darker)' }}>
                bal: {s.balance}
              </span>
            )}
            {s.checked && !s.isUnique && (
              <input
                type="number"
                min="1"
                max={s.balance}
                value={s.amount}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => updateAmount(idx, e.target.value)}
                style={{
                  width: '60px',
                  background: 'var(--color-primary-darkest)',
                  border: '1px solid var(--color-primary-darker)',
                  color: 'var(--color-primary)',
                  fontSize: 'var(--font-size-base)',
                  padding: '0.2rem 0.3rem',
                  fontFamily: 'var(--font-family-base)',
                  textAlign: 'right',
                }}
              />
            )}
          </div>
          {/* Individual recipient field */}
          {s.checked && recipientMode === 'individual' && (
            <div onClick={(e) => e.stopPropagation()} style={{ paddingLeft: '1.5rem' }}>
              <FloatingLabelInput
                label="Recipient"
                type="text"
                value={s.to}
                onChange={(e) => updateTo(idx, e.target.value)}
                placeholder="hive:username"
                style={{ width: '100%' }}
              />
            </div>
          )}
        </div>
      ))}

      {selected.length === 0 && (
        <div style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-primary-darker)', padding: '0.5rem 0' }}>
          No tokens in this collection.
        </div>
      )}

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
        {isProcessing ? 'Transferring...' : `Transfer ${checkedEntries.length} Token${checkedEntries.length !== 1 ? 's' : ''}`}
      </button>
    </div>
  )
}
