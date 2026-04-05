import { useState, useMemo, useEffect } from 'preact/hooks'
import FloatingLabelInput from './FloatingLabelInput.jsx'
import FormField from './FormField.jsx'
import NeonSwitch from './NeonSwitch.jsx'

/**
 * Toggleable NFT properties input: "General" mode (name, description, imageUrl)
 * vs "Custom JSON" mode (raw textarea).
 *
 * Props:
 *   value        - raw JSON string (controlled)
 *   onChange      - (newJsonString) => void
 *   label        - FormField label (default "Properties (JSON)")
 *   hintText     - FormField hint
 *   mandatory    - FormField mandatory flag
 *   minHeight    - textarea min-height (default '100px')
 */
export default function NftPropertiesInput({ value, onChange, label, hintText, mandatory, minHeight = '100px' }) {
  const [customJson, setCustomJson] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  // When switching from general → custom, seed the textarea with current simple fields
  const handleModeSwitch = (toCustom) => {
    if (toCustom && !customJson) {
      // Build JSON from simple fields if textarea is empty
      const trimmed = (value || '').trim()
      if (!trimmed) {
        const obj = {}
        if (name.trim()) obj.name = name.trim()
        if (description.trim()) obj.description = description.trim()
        if (imageUrl.trim()) obj.image = imageUrl.trim()
        if (Object.keys(obj).length > 0) {
          onChange(JSON.stringify(obj, null, 2))
        }
      }
    } else if (!toCustom && customJson) {
      // Switching from custom → general: try to parse and populate simple fields
      const trimmed = (value || '').trim()
      if (trimmed) {
        try {
          const parsed = JSON.parse(trimmed)
          if (typeof parsed === 'object' && parsed !== null) {
            setName(parsed.name || '')
            setDescription(parsed.description || '')
            setImageUrl(parsed.image || '')
          }
        } catch {}
      }
    }
    setCustomJson(toCustom)
  }

  // In general mode, update parent whenever simple fields change
  useEffect(() => {
    if (customJson) return
    const obj = {}
    if (name.trim()) obj.name = name.trim()
    if (description.trim()) obj.description = description.trim()
    if (imageUrl.trim()) obj.image = imageUrl.trim()
    onChange(Object.keys(obj).length > 0 ? JSON.stringify(obj, null, 2) : '')
  }, [name, description, imageUrl, customJson])

  const jsonError = useMemo(() => {
    const trimmed = (value || '').trim()
    if (!trimmed) return null
    try {
      JSON.parse(trimmed)
      return null
    } catch (e) {
      return e.message
    }
  }, [value])

  // Only show JSON error in custom mode
  const showError = customJson && jsonError

  return (
    <>
      <FormField label={label || 'Properties'} hintText={hintText || 'Toggle between simple fields and raw JSON.'}>
        {() => (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--color-primary-darker)', fontFamily: 'var(--font-family-base)', fontSize: 'var(--font-size-base)', userSelect: 'none' }}>Properties:</span>
            <span style={{ color: !customJson ? 'var(--color-primary)' : 'var(--color-primary-darker)', fontFamily: 'var(--font-family-base)', fontSize: 'var(--font-size-base)', userSelect: 'none' }}>General</span>
            <NeonSwitch checked={customJson} onChange={handleModeSwitch} />
            <span style={{ color: customJson ? 'var(--color-primary)' : 'var(--color-primary-darker)', fontFamily: 'var(--font-family-base)', fontSize: 'var(--font-size-base)', userSelect: 'none' }}>Custom JSON</span>
          </div>
        )}
      </FormField>

      {!customJson ? (
        <>
          <FormField label="Name" hintText="Display name for the NFT.">
            {({ labelText }) => (
              <FloatingLabelInput label={labelText} type="text" value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%' }} />
            )}
          </FormField>
          <FormField label="Description" hintText="A short description of the NFT.">
            {({ labelText }) => (
              <FloatingLabelInput label={labelText} type="text" value={description} onChange={(e) => setDescription(e.target.value)} style={{ width: '100%' }} />
            )}
          </FormField>
          <FormField label="Image URL" hintText="URL of the NFT image.">
            {({ labelText }) => (
              <FloatingLabelInput label={labelText} type="text" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" style={{ width: '100%' }} />
            )}
          </FormField>
        </>
      ) : (
        <FormField label={label || 'Properties (JSON)'} mandatory={mandatory} hintText={hintText}>
          {({ labelText }) => (
            <div style={{ position: 'relative' }}>
              <div className="floating-label-input" style={{ borderColor: showError ? '#ff4444' : undefined }}>
                <label className="floating-label-input__label">{labelText}</label>
                <textarea
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  spellcheck={false}
                  className="floating-label-input__field"
                  style={{
                    width: '100%',
                    minHeight,
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
              {showError && (
                <div style={{ fontSize: 'var(--font-size-base)', color: '#ff4444', marginTop: '0.25rem' }}>
                  Invalid JSON: {jsonError}
                </div>
              )}
            </div>
          )}
        </FormField>
      )}
    </>
  )
}
