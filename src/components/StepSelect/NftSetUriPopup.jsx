import { useState, useMemo } from 'preact/hooks'
import { KeyTypes } from '@aioha/aioha'
import FloatingLabelInput from '../common/FloatingLabelInput.jsx'
import FormField from '../common/FormField.jsx'
import { MAX_TOKEN_ID_LEN, MAX_URI_LEN, validateTokenId } from '../../lib/nftValidation.js'

export default function NftSetUriPopup({ onClose, onSuccess, aioha, contractId, collectionInfo }) {
  const [tokenId, setTokenId] = useState('')
  const [uri, setUri] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)

  const tokenIdError = useMemo(() => {
    const trimmed = tokenId.trim()
    if (!trimmed) return null
    return validateTokenId(trimmed)
  }, [tokenId])

  const uriError = useMemo(() => {
    if (uri.trim() && uri.trim().length > MAX_URI_LEN) return `URI exceeds ${MAX_URI_LEN} characters`
    return null
  }, [uri])

  const isValid = useMemo(() => {
    if (tokenId.trim() === '' || uri.trim() === '') return false
    if (tokenIdError || uriError) return false
    return true
  }, [tokenId, uri, tokenIdError, uriError])

  const handleSubmit = async () => {
    if (!isValid || isProcessing) return
    setIsProcessing(true)
    setError(null)

    try {
      const payload = {
        id: tokenId.trim(),
        uri: uri.trim(),
      }

      const res = await aioha.vscCallContract(contractId, 'setURI', payload, 10000, [], KeyTypes.Active)
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
        {collectionInfo?.symbol || '???'} — Set Token URI
      </div>

      <FormField label="Token ID" mandatory hintText={`The token ID to set the URI for (max ${MAX_TOKEN_ID_LEN} chars).`}>
        {({ labelText }) => (
          <>
            <FloatingLabelInput label={labelText} type="text" value={tokenId} maxLength={MAX_TOKEN_ID_LEN} onChange={(e) => setTokenId(e.target.value.slice(0, MAX_TOKEN_ID_LEN))} style={{ width: '100%' }} />
            {tokenIdError && <div style={{ fontSize: 'var(--font-size-base)', color: '#ff4444', marginTop: '0.25rem' }}>{tokenIdError}</div>}
          </>
        )}
      </FormField>

      <FormField label="URI" mandatory hintText={`The metadata URI for this token (max ${MAX_URI_LEN} chars).`}>
        {({ labelText }) => (
          <>
            <FloatingLabelInput label={labelText} type="text" value={uri} maxLength={MAX_URI_LEN} onChange={(e) => setUri(e.target.value.slice(0, MAX_URI_LEN))} style={{ width: '100%' }} />
            {uriError && <div style={{ fontSize: 'var(--font-size-base)', color: '#ff4444', marginTop: '0.25rem' }}>{uriError}</div>}
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
        {isProcessing ? 'Setting URI...' : 'Set URI'}
      </button>
    </div>
  )
}
