import { useState, useMemo, useEffect } from 'preact/hooks'
import { KeyTypes } from '@aioha/aioha'
import FormField from '../common/FormField.jsx'

const fetchProperties = async (graphqlEndpoint, contractId, tokenId) => {
  const query = `query GetProps($contractId: String!, $keys: [String!]!) {
    getStateByKeys(contractId: $contractId, keys: $keys)
  }`
  const res = await fetch(graphqlEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { contractId, keys: [`props|${tokenId}`] } }),
  })
  const json = await res.json()
  const state = json?.data?.getStateByKeys
  if (!state) return null
  const val = state[`props|${tokenId}`]
  if (val === undefined || val === null || val === '') return null
  return val
}

export default function NftSetPropertiesPopup({ onClose, onSuccess, aioha, contractId, tokenId, templateId, hasOwnProperties, collectionInfo, graphqlEndpoint }) {
  const [properties, setProperties] = useState('')
  const [jsonError, setJsonError] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [loadingProps, setLoadingProps] = useState(false)
  const isInherited = !hasOwnProperties && !!templateId

  useEffect(() => {
    if (!graphqlEndpoint || !contractId) return
    // If token has own properties, load them; otherwise load from template
    const targetTokenId = hasOwnProperties ? tokenId : (templateId || tokenId)
    if (!targetTokenId) return
    let cancelled = false
    setLoadingProps(true)
    fetchProperties(graphqlEndpoint, contractId, targetTokenId)
      .then((val) => {
        if (cancelled) return
        if (val != null) {
          try {
            let parsed = JSON.parse(val)
            // Unescape double-encoded JSON strings like "{\"hp\":100}"
            if (typeof parsed === 'string') parsed = JSON.parse(parsed)
            setProperties(JSON.stringify(parsed, null, 2))
          } catch {
            setProperties(val)
          }
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingProps(false) })
    return () => { cancelled = true }
  }, [graphqlEndpoint, contractId, tokenId, templateId, hasOwnProperties])

  const parsedProperties = useMemo(() => {
    const trimmed = properties.trim()
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
  }, [properties])

  const isValid = parsedProperties !== null && parsedProperties !== undefined

  const handleSubmit = async () => {
    if (!isValid || isProcessing) return
    setIsProcessing(true)
    setError(null)

    try {
      const payload = {
        id: tokenId,
        properties: typeof parsedProperties === 'object' ? JSON.stringify(parsedProperties) : parsedProperties,
      }

      const res = await aioha.vscCallContract(contractId, 'setProperties', payload, 10000, [], KeyTypes.Active)
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

  const canSubmit = isValid && !isProcessing && !loadingProps

  return (
    <div className="neon-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
      {isInherited && (
        <div style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-primary-darker)', padding: '0.25rem 0.5rem', border: '1px solid var(--color-primary-darkest)', marginBottom: '0.25rem' }}>
          These properties are inherited from template <span style={{ color: 'var(--color-primary)' }}>#{templateId}</span>. Saving will give this token its own properties permanently.
        </div>
      )}

      <FormField label="Properties (JSON)" mandatory hintText="Custom metadata to attach to this token. Must be valid JSON.">
        {({ labelText }) => (
          <div style={{ position: 'relative' }}>
            <div className="floating-label-input" style={{ borderColor: jsonError ? '#ff4444' : undefined }}>
              <label className="floating-label-input__label">{labelText}</label>
              <textarea
                value={loadingProps ? 'Loading...' : properties}
                onChange={(e) => setProperties(e.target.value)}
                disabled={loadingProps}
                spellcheck={false}
                className="floating-label-input__field"
                style={{
                  width: '100%',
                  minHeight: '100px',
                  background: '#000',
                  color: 'var(--color-primary)',
                  fontFamily: 'monospace',
                  fontSize: 'var(--font-size-label)',
                  border: 'none',
                resize: 'vertical',
                borderRadius: '0',
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
        {isProcessing ? 'Setting...' : 'Set Properties'}
      </button>
    </div>
  )
}
