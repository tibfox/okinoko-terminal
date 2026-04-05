import { useState, useMemo } from 'preact/hooks'
import { KeyTypes } from '@aioha/aioha'
import NftImage from '../common/NftImage.jsx'

export default function NftBurnBatchPopup({ onClose, onSuccess, aioha, user, contractId, userNfts, collectionInfo, nftImageUrls, baseUri }) {
  const hiveAccount = user ? (user.startsWith('hive:') ? user : `hive:${user}`) : ''
  const [selected, setSelected] = useState(() =>
    (userNfts || []).map((n) => ({
      tokenId: n.tokenId, balance: n.balance, isUnique: n.isUnique,
      amount: '', checked: false, contractId: n.contractId,
    }))
  )
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)

  const toggleChecked = (idx) => {
    const updated = [...selected]
    const wasChecked = updated[idx].checked
    updated[idx] = { ...updated[idx], checked: !wasChecked, amount: !wasChecked ? String(updated[idx].balance) : '' }
    setSelected(updated)
  }

  const updateAmount = (idx, val) => {
    const updated = [...selected]
    updated[idx] = { ...updated[idx], amount: val }
    setSelected(updated)
  }

  const checkedEntries = selected.filter((s) => s.checked)

  const validation = useMemo(() => {
    if (checkedEntries.length === 0) return { valid: false, error: null }
    for (const e of checkedEntries) {
      const amt = parseInt(e.amount, 10)
      if (isNaN(amt) || amt <= 0) return { valid: false, error: `Invalid amount for ${e.tokenId}` }
      if (amt > e.balance) return { valid: false, error: `Amount exceeds balance for ${e.tokenId}` }
    }
    return { valid: true, error: null }
  }, [checkedEntries])

  const handleBurnBatch = async () => {
    if (!validation.valid || isProcessing) return
    setIsProcessing(true)
    setError(null)

    try {
      const ids = checkedEntries.map((e) => e.tokenId).join(',')
      const amounts = checkedEntries.map((e) => parseInt(e.amount, 10)).join(',')

      const payload = {
        from: hiveAccount,
        ids,
        amounts,
      }

      const res = await aioha.vscCallContract(contractId, 'burnBatch', payload, 10000, [], KeyTypes.Active)
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
        {collectionInfo?.symbol || '???'} — Batch Burn
      </div>

      <div style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-primary-darker)' }}>
        Select tokens to burn:
      </div>

      {selected.map((s, idx) => (
        <div
          key={s.tokenId}
          onClick={() => toggleChecked(idx)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.4rem 0.5rem',
            border: `1px solid ${s.checked ? '#ff4444' : 'var(--color-primary-darkest)'}`,
            cursor: 'pointer',
            background: s.checked ? 'rgba(255, 68, 68, 0.05)' : 'transparent',
          }}
        >
          <input type="checkbox" checked={s.checked} readOnly style={{ accentColor: '#ff4444', cursor: 'pointer' }} />
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
        onClick={handleBurnBatch}
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
        {isProcessing ? 'Burning...' : `Burn ${checkedEntries.length} Token${checkedEntries.length !== 1 ? 's' : ''}`}
      </button>
    </div>
  )
}
