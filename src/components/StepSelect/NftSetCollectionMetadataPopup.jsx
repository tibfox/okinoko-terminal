import { useState, useMemo } from 'preact/hooks'
import { KeyTypes } from '@aioha/aioha'
import FormField from '../common/FormField.jsx'

export default function NftSetCollectionMetadataPopup({ onClose, onSuccess, aioha, contractId, collectionInfo }) {
  const [metadata, setMetadata] = useState('')
  const [jsonError, setJsonError] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)

  const parsedMetadata = useMemo(() => {
    const trimmed = metadata.trim()
    if (!trimmed) {
      setJsonError(null)
      return null
    }
    try {
      const parsed = JSON.parse(trimmed)
      setJsonError(null)
      return parsed
    } catch (e) {
      setJsonError(e.message)
      return undefined
    }
  }, [metadata])

  const isValid = useMemo(() => {
    if (metadata.trim() === '') return false
    if (parsedMetadata === undefined) return false
    return true
  }, [metadata, parsedMetadata])

  const handleSubmit = async () => {
    if (!isValid || isProcessing) return
    setIsProcessing(true)
    setError(null)

    try {
      const payload = {
        metadata: typeof parsedMetadata === 'object' ? JSON.stringify(parsedMetadata) : metadata.trim(),
      }

      const res = await aioha.vscCallContract(contractId, 'setCollectionMetadata', payload, 10000, [], KeyTypes.Active)
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
        {collectionInfo?.symbol || '???'} — Set Collection Metadata
      </div>

      <FormField label="Metadata (JSON)" mandatory hintText="Collection-level metadata as a JSON object (e.g. name, description, icon URL, external links).">
        {({ labelText }) => (
          <div style={{ position: 'relative' }}>
            <div className="floating-label-input" style={{ borderColor: jsonError ? '#ff4444' : undefined }}>
              <label className="floating-label-input__label">{labelText}</label>
              <textarea
                value={metadata}
                onChange={(e) => setMetadata(e.target.value)}
                spellcheck={false}
                className="floating-label-input__field"
                style={{
                  width: '100%',
                  minHeight: '120px',
                  background: '#000',
                  color: 'var(--color-primary)',
                  fontFamily: 'monospace',
                  fontSize: 'var(--font-size-label)',
                  padding: '0.5rem',
                  resize: 'vertical',
                  border: 'none',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            {jsonError && (
              <div style={{ fontSize: 'var(--font-size-base)', color: '#ff4444', marginTop: '0.25rem' }}>
                Invalid JSON: {jsonError}
              </div>
            )}
          </div>
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
        {isProcessing ? 'Setting...' : 'Set Collection Metadata'}
      </button>
    </div>
  )
}
