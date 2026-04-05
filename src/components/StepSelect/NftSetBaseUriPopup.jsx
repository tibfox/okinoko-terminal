import { useState, useMemo } from 'preact/hooks'
import { KeyTypes } from '@aioha/aioha'
import FloatingLabelInput from '../common/FloatingLabelInput.jsx'
import FormField from '../common/FormField.jsx'
import { MAX_URI_LEN } from '../../lib/nftValidation.js'

export default function NftSetBaseUriPopup({ onClose, onSuccess, aioha, contractId, collectionInfo }) {
  const [baseUri, setBaseUri] = useState(collectionInfo?.baseUri || '')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)

  const baseUriError = useMemo(() => {
    const trimmed = baseUri.trim()
    if (!trimmed) return null
    if (trimmed.length > MAX_URI_LEN) return `Base URI exceeds ${MAX_URI_LEN} characters`
    if (!trimmed.endsWith('/')) return 'Base URI must end with a trailing slash'
    return null
  }, [baseUri])

  const isValid = useMemo(() => {
    if (baseUri.trim() === '') return false
    if (baseUriError) return false
    return true
  }, [baseUri, baseUriError])

  const handleSubmit = async () => {
    if (!isValid || isProcessing) return
    setIsProcessing(true)
    setError(null)

    try {
      const payload = { baseUri: baseUri.trim() }

      const res = await aioha.vscCallContract(contractId, 'setBaseURI', payload, 10000, [], KeyTypes.Active)
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
        {collectionInfo?.symbol || '???'} — Set Base URI
      </div>

      <FormField label="Base URI" mandatory hintText={`The base URI for all token metadata. Must end with / (max ${MAX_URI_LEN} chars).`}>
        {({ labelText }) => (
          <>
            <FloatingLabelInput label={labelText} type="text" value={baseUri} maxLength={MAX_URI_LEN} onChange={(e) => setBaseUri(e.target.value.slice(0, MAX_URI_LEN))} style={{ width: '100%' }} />
            {baseUriError && <div style={{ fontSize: 'var(--font-size-base)', color: '#ff4444', marginTop: '0.25rem' }}>{baseUriError}</div>}
          </>
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
        {isProcessing ? 'Setting...' : 'Set Base URI'}
      </button>
    </div>
  )
}
