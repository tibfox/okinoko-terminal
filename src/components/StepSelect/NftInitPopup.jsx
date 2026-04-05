import { useState, useMemo } from 'preact/hooks'
import { KeyTypes } from '@aioha/aioha'
import FloatingLabelInput from '../common/FloatingLabelInput.jsx'
import FormField from '../common/FormField.jsx'
import NeonSwitch from '../common/NeonSwitch.jsx'
import { MAX_NAME_LEN, MAX_SYMBOL_LEN, MAX_URI_LEN } from '../../lib/nftValidation.js'

export default function NftInitPopup({ onClose, onSuccess, aioha, user, contractId, defaultName }) {
  const [name, setName] = useState(defaultName || '')
  const [symbol, setSymbol] = useState('')
  const [baseUri, setBaseUri] = useState('')
  const [trackMinted, setTrackMinted] = useState(false)
  const [customProperties, setCustomProperties] = useState(false)
  const [description, setDescription] = useState('')
  const [iconUrl, setIconUrl] = useState('')
  const [metadataJson, setMetadataJson] = useState('')
  const [jsonError, setJsonError] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)

  const parsedMetadataJson = useMemo(() => {
    const trimmed = metadataJson.trim()
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
  }, [metadataJson])

  const nameError = useMemo(() => {
    if (name.trim() && name.trim().length > MAX_NAME_LEN) return `Name exceeds ${MAX_NAME_LEN} characters`
    return null
  }, [name])

  const symbolError = useMemo(() => {
    if (symbol.trim() && symbol.trim().length > MAX_SYMBOL_LEN) return `Symbol exceeds ${MAX_SYMBOL_LEN} characters`
    return null
  }, [symbol])

  const baseUriError = useMemo(() => {
    if (baseUri.trim() && baseUri.trim().length > MAX_URI_LEN) return `Base URI exceeds ${MAX_URI_LEN} characters`
    if (baseUri.trim() && !baseUri.trim().endsWith('/')) return 'Base URI must end with a trailing slash'
    return null
  }, [baseUri])

  const isValid = useMemo(() => {
    if (name.trim() === '' || symbol.trim() === '') return false
    if (nameError || symbolError || baseUriError) return false
    if (customProperties && parsedMetadataJson === undefined) return false
    return true
  }, [name, symbol, customProperties, parsedMetadataJson, nameError, symbolError, baseUriError])

  const handleInit = async () => {
    if (!isValid || isProcessing) return
    setIsProcessing(true)
    setError(null)

    try {
      const payload = {
        name: name.trim(),
        symbol: symbol.trim(),
        baseUri: baseUri.trim(),
      }
      if (trackMinted) payload.trackMinted = true

      if (customProperties) {
        if (parsedMetadataJson) payload.metadata = JSON.stringify(parsedMetadataJson)
      } else {
        const meta = {}
        if (description.trim()) meta.description = description.trim()
        if (iconUrl.trim()) meta.icon = iconUrl.trim()
        if (Object.keys(meta).length > 0) payload.metadata = JSON.stringify(meta)
      }

      const res = await aioha.vscCallContract(contractId, 'init', payload, 10000, [], KeyTypes.Active)
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

      <FormField label="Collection Name" mandatory hintText={`The name of your NFT collection (max ${MAX_NAME_LEN} chars).`}>
        {({ labelText }) => (
          <>
            <FloatingLabelInput label={labelText} type="text" value={name} maxLength={MAX_NAME_LEN} onChange={(e) => setName(e.target.value.slice(0, MAX_NAME_LEN))} style={{ width: '100%' }} />
            {nameError && <div style={{ fontSize: 'var(--font-size-base)', color: '#ff4444', marginTop: '0.25rem' }}>{nameError}</div>}
          </>
        )}
      </FormField>

      <FormField label="Symbol" mandatory hintText={`The ticker symbol for your collection (max ${MAX_SYMBOL_LEN} chars).`}>
        {({ labelText }) => (
          <>
            <FloatingLabelInput label={labelText} type="text" value={symbol} maxLength={MAX_SYMBOL_LEN} onChange={(e) => setSymbol(e.target.value.toUpperCase().slice(0, MAX_SYMBOL_LEN))} style={{ width: '100%' }} />
            {symbolError && <div style={{ fontSize: 'var(--font-size-base)', color: '#ff4444', marginTop: '0.25rem' }}>{symbolError}</div>}
          </>
        )}
      </FormField>

      <FormField label="Base URI" hintText={`Base URI for token metadata. Token IDs are appended (max ${MAX_URI_LEN} chars).`}>
        {({ labelText }) => (
          <>
            <FloatingLabelInput label={labelText} type="text" value={baseUri} maxLength={MAX_URI_LEN} onChange={(e) => setBaseUri(e.target.value.slice(0, MAX_URI_LEN))} style={{ width: '100%' }} />
            {baseUriError && <div style={{ fontSize: 'var(--font-size-base)', color: '#ff4444', marginTop: '0.25rem' }}>{baseUriError}</div>}
          </>
        )}
      </FormField>

      <FormField label="Track Minted" hintText="If enabled, burned tokens cannot be re-minted.">
        {() => (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--color-primary-darker)', fontFamily: 'var(--font-family-base)', fontSize: 'var(--font-size-base)', userSelect: 'none' }}>Burned tokens:</span>
            <span style={{ color: !trackMinted ? 'var(--color-primary)' : 'var(--color-primary-darker)', fontFamily: 'var(--font-family-base)', fontSize: 'var(--font-size-base)', userSelect: 'none' }}>Re-mintable</span>
            <NeonSwitch checked={trackMinted} onChange={setTrackMinted} />
            <span style={{ color: trackMinted ? 'var(--color-primary)' : 'var(--color-primary-darker)', fontFamily: 'var(--font-family-base)', fontSize: 'var(--font-size-base)', userSelect: 'none' }}>Burned forever</span>
          </div>
        )}
      </FormField>

      <FormField label="Custom Properties" hintText="Toggle to enter metadata as raw JSON instead of individual fields.">
        {() => (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--color-primary-darker)', fontFamily: 'var(--font-family-base)', fontSize: 'var(--font-size-base)', userSelect: 'none' }}>Collection properties:</span>
            <span style={{ color: !customProperties ? 'var(--color-primary)' : 'var(--color-primary-darker)', fontFamily: 'var(--font-family-base)', fontSize: 'var(--font-size-base)', userSelect: 'none' }}>Simple</span>
            <NeonSwitch checked={customProperties} onChange={setCustomProperties} />
            <span style={{ color: customProperties ? 'var(--color-primary)' : 'var(--color-primary-darker)', fontFamily: 'var(--font-family-base)', fontSize: 'var(--font-size-base)', userSelect: 'none' }}>Custom JSON</span>
          </div>
        )}
      </FormField>

      {!customProperties ? (
        <>
          <FormField label="Description" hintText="A short description of the collection.">
            {({ labelText }) => (
              <FloatingLabelInput label={labelText} type="text" value={description} onChange={(e) => setDescription(e.target.value)} style={{ width: '100%' }} />
            )}
          </FormField>

          <FormField label="Collection Icon URL" hintText="URL of the collection's icon or logo image.">
            {({ labelText }) => (
              <FloatingLabelInput label={labelText} type="text" value={iconUrl} onChange={(e) => setIconUrl(e.target.value)} placeholder="https://…" style={{ width: '100%' }} />
            )}
          </FormField>
        </>
      ) : (
        <FormField label="Metadata (JSON)" hintText="Custom collection metadata as a JSON object. Stored in contract state.">
          {({ labelText }) => (
            <div style={{ position: 'relative' }}>
              <div className="floating-label-input" style={{ borderColor: jsonError ? '#ff4444' : undefined }}>
                <label className="floating-label-input__label">{labelText}</label>
                <textarea
                  value={metadataJson}
                  onChange={(e) => setMetadataJson(e.target.value)}
                  spellcheck={false}
                  className="floating-label-input__field"
                  style={{
                    width: '100%',
                    minHeight: '100px',
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
      )}

      {error && <div style={{ fontSize: 'var(--font-size-base)', color: '#ff4444', padding: '0.25rem 0' }}>{error}</div>}

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
        {isProcessing ? 'Initializing...' : 'Initialize Collection'}
      </button>
    </div>
  )
}
