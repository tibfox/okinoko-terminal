import { useState, useMemo, useCallback, useEffect } from 'preact/hooks'
import { KeyTypes } from '@aioha/aioha'
import FloatingLabelInput from '../common/FloatingLabelInput.jsx'
import FormField from '../common/FormField.jsx'
import NeonSwitch from '../common/NeonSwitch.jsx'
import NftPropertiesInput from '../common/NftPropertiesInput.jsx'
import { MAX_TOKEN_ID_LEN, MAX_ADDRESS_LEN, validateAddress } from '../../lib/nftValidation.js'

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
function generateRandomPrefix() {
  const arr = new Uint8Array(12)
  crypto.getRandomValues(arr)
  return Array.from(arr, (b) => CHARS[b % CHARS.length]).join('') + '-'
}

import ADJECTIVES from '../../data/adjectives.json'
import NOUNS from '../../data/nouns.json'

function cryptoRand() {
  return crypto.getRandomValues(new Uint32Array(1))[0] / 0x100000000
}

function generateAdjNounPrefix() {
  const pick = (arr) => arr[Math.floor(cryptoRand() * arr.length)]
  const sep = pick(['-', '_', '.', ''])
  const noun = pick(NOUNS)
  const adj = pick(ADJECTIVES)
  return `${adj}${sep}${noun}-`
}

/**
 * Detect a prefix + number + suffix pattern in a template token ID.
 * Examples:
 *   "EndlessFlame#0"  → { prefix: "EndlessFlame#", number: 0, suffix: "" }
 *   "card-42"         → { prefix: "card-", number: 42, suffix: "" }
 *   "nft_1_gold"      → { prefix: "nft_", number: 1, suffix: "_gold" }
 *   "item3"           → { prefix: "item", number: 3, suffix: "" }
 *   "abc"             → null (no number found)
 */
function detectSeriesPattern(templateId) {
  if (!templateId) return null
  // Match: (non-digit prefix)(digits)(optional suffix)
  // Try to find the last number group that could be a series index
  const match = templateId.match(/^(.*?)(\d+)([^\d]*)$/)
  if (!match) return null
  const [, prefix, numStr, suffix] = match
  if (!prefix && !suffix) return null // bare number like "42" — not a useful pattern
  return { prefix, number: parseInt(numStr, 10), suffix }
}

async function findHighestSeriesNumber(hasuraHttp, contractId, prefix, suffix) {
  if (!hasuraHttp || !contractId || !prefix) return null
  try {
    const res = await fetch(hasuraHttp, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query($contractId: String!, $prefix: String!) {
          magi_nft_token_supply(where: { contract_id: { _eq: $contractId }, token_id: { _like: $prefix } }) {
            token_id
          }
        }`,
        variables: { contractId, prefix: `${prefix}%` },
      }),
    })
    const data = await res.json()
    const rows = data?.data?.magi_nft_token_supply || []
    let highest = -1
    for (const row of rows) {
      const tid = row.token_id
      let inner = tid.slice(prefix.length)
      if (suffix && inner.endsWith(suffix)) inner = inner.slice(0, -suffix.length)
      const n = parseInt(inner, 10)
      if (!isNaN(n) && n > highest) highest = n
    }
    return highest >= 0 ? highest : null
  } catch {
    return null
  }
}

const normalizeReceiver = (val) => {
  let next = val.replace(/@/g, '')
  if (!next.startsWith('hive:') && next.trim() !== '') {
    next = 'hive:' + next.replace(/^hive:/, '').replace(/^:+/, '')
  }
  return next
}

export default function NftMintSeriesPopup({ onClose, onSuccess, aioha, user, contractId, collectionInfo, initialTemplateId, hasuraHttp }) {
  const defaultTo = user ? (user.startsWith('hive:') ? user : `hive:${user}`) : 'hive:'

  // Detect pattern from template ID
  const detectedPattern = useMemo(() => initialTemplateId ? detectSeriesPattern(initialTemplateId) : null, [initialTemplateId])

  const [to, setTo] = useState(defaultTo)
  const [idPrefix, setIdPrefix] = useState(detectedPattern?.prefix || '')
  const [suffix, setSuffix] = useState(detectedPattern?.suffix || '')
  const [startNumber, setStartNumber] = useState('1')
  const [count, setCount] = useState('10')
  const [isEditioned, setIsEditioned] = useState(false)
  const [amount, setAmount] = useState('1')
  const [maxSupply, setMaxSupply] = useState('100')
  const [soulbound, setSoulbound] = useState(false)
  const [useTemplate, setUseTemplate] = useState(true)
  const [useFirstAsTemplate, setUseFirstAsTemplate] = useState(!initialTemplateId)
  const [externalTemplate, setExternalTemplate] = useState(initialTemplateId || '')
  const [properties, setProperties] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [loadingNextNumber, setLoadingNextNumber] = useState(false)

  // When opened from a template with detected pattern, find the next free start number
  useEffect(() => {
    if (!detectedPattern || !hasuraHttp) return
    setLoadingNextNumber(true)
    findHighestSeriesNumber(hasuraHttp, contractId, detectedPattern.prefix, detectedPattern.suffix)
      .then((highest) => {
        if (highest !== null) {
          setStartNumber(String(highest + 1))
        }
      })
      .finally(() => setLoadingNextNumber(false))
  }, [detectedPattern, hasuraHttp, contractId])

  const handleRandomPrefix = useCallback(() => {
    setIdPrefix(generateRandomPrefix())
  }, [])

  const handleAdjNounPrefix = useCallback(() => {
    setIdPrefix(generateAdjNounPrefix())
  }, [])

  const addressError = useMemo(() => {
    const trimmed = to.trim()
    if (!trimmed) return null
    return validateAddress(trimmed)
  }, [to])

  const prefixError = useMemo(() => {
    const trimmed = idPrefix.trim()
    if (!trimmed) return null
    if (trimmed.includes('|')) return 'ID prefix cannot contain the pipe character (|)'
    if (suffix.trim().includes('|')) return 'Suffix cannot contain the pipe character (|)'
    return null
  }, [idPrefix, suffix])

  const parsedCount = useMemo(() => {
    const n = parseInt(count, 10)
    return isNaN(n) || n <= 0 ? null : n
  }, [count])

  const parsedStartNumber = useMemo(() => {
    const n = parseInt(startNumber, 10)
    return isNaN(n) || n < 0 ? null : n
  }, [startNumber])

  const parsedAmount = useMemo(() => {
    const n = parseInt(amount, 10)
    return isNaN(n) || n <= 0 ? null : n
  }, [amount])

  const parsedMaxSupply = useMemo(() => {
    const n = parseInt(maxSupply, 10)
    return isNaN(n) || n <= 0 ? null : n
  }, [maxSupply])

  const amountExceedsSupply = isEditioned && parsedAmount !== null && parsedMaxSupply !== null && parsedAmount > parsedMaxSupply

  const sfx = suffix.trim()

  // Check generated IDs won't exceed max token ID length
  const generatedIdError = useMemo(() => {
    if (!idPrefix.trim() || parsedCount === null || parsedStartNumber === null) return null
    const lastNumber = parsedStartNumber + parsedCount - 1
    const longestId = `${idPrefix.trim()}${lastNumber}${sfx}`
    if (longestId.length > MAX_TOKEN_ID_LEN) return `Generated IDs would exceed ${MAX_TOKEN_ID_LEN} characters (e.g. "${longestId.slice(0, 30)}...")`
    return null
  }, [idPrefix, sfx, parsedCount, parsedStartNumber])

  // Computed template ID = first generated ID
  const firstGeneratedId = useMemo(() => {
    if (!idPrefix.trim() || parsedStartNumber === null) return ''
    return `${idPrefix.trim()}${parsedStartNumber}${sfx}`
  }, [idPrefix, sfx, parsedStartNumber])

  const externalTemplateError = useMemo(() => {
    if (!useTemplate || useFirstAsTemplate) return null
    const trimmed = externalTemplate.trim()
    if (!trimmed) return null
    if (trimmed.includes('|')) return 'Template ID cannot contain the pipe character (|)'
    if (trimmed.length > MAX_TOKEN_ID_LEN) return `Template ID exceeds ${MAX_TOKEN_ID_LEN} characters`
    return null
  }, [useTemplate, useFirstAsTemplate, externalTemplate])

  const parsedProperties = useMemo(() => {
    const trimmed = properties.trim()
    if (!trimmed) return null
    try {
      return JSON.parse(trimmed)
    } catch {
      return undefined
    }
  }, [properties])

  const isValid = useMemo(() => {
    const receiverName = to.startsWith('hive:') ? to.slice(5) : to
    if (!receiverName.trim() || receiverName.length < 3) return false
    if (!idPrefix.trim()) return false
    if (addressError || prefixError || generatedIdError) return false
    if (parsedCount === null || parsedStartNumber === null) return false
    if (initialTemplateId) {
      // Simplified mode — only need prefix, start, count, recipient
      return true
    }
    if (externalTemplateError) return false
    if (isEditioned && (parsedAmount === null || parsedMaxSupply === null)) return false
    if (amountExceedsSupply) return false
    if (parsedProperties === undefined) return false
    // When using external template, it must be filled in
    if (useTemplate && !useFirstAsTemplate && !externalTemplate.trim()) return false
    return true
  }, [to, idPrefix, parsedCount, parsedStartNumber, isEditioned, parsedAmount, parsedMaxSupply, parsedProperties, addressError, prefixError, generatedIdError, externalTemplateError, amountExceedsSupply, useTemplate, useFirstAsTemplate, externalTemplate, initialTemplateId])

  const handleSubmit = async () => {
    if (!isValid || isProcessing) return
    setIsProcessing(true)
    setError(null)

    try {
      const amt = initialTemplateId ? 1 : (isEditioned ? parsedAmount : 1)
      const ms = initialTemplateId ? 1 : (isEditioned ? parsedMaxSupply : 1)
      const propsStr = initialTemplateId ? undefined : (parsedProperties ? (typeof parsedProperties === 'object' ? JSON.stringify(parsedProperties) : properties.trim()) : undefined)

      let res

      if (initialTemplateId) {
        // Simplified mode: mintSeries with external template
        const payload = {
          to: to.trim(),
          idPrefix: idPrefix.trim(),
          startNumber: parsedStartNumber,
          count: parsedCount,
          amount: amt,
          maxSupply: ms,
          propertiesTemplate: initialTemplateId,
        }
        if (sfx) payload.idSuffix = sfx

        res = await aioha.vscCallContract(contractId, 'mintSeries', payload, 10000, [], KeyTypes.Active)
      } else if (useTemplate && useFirstAsTemplate && parsedCount > 1) {
        // Two-op transaction: 1) mint template NFT, 2) mintSeries for the rest with template
        const netId = aioha.vscNetId || 'vsc-mainnet'
        const user = aioha.getCurrentUser()

        const mintPayload = {
          to: to.trim(),
          id: firstGeneratedId,
          amount: amt,
          maxSupply: ms,
        }
        if (soulbound) mintPayload.soulbound = true
        if (propsStr) mintPayload.properties = propsStr

        const seriesPayload = {
          to: to.trim(),
          idPrefix: idPrefix.trim(),
          startNumber: parsedStartNumber + 1,
          count: parsedCount - 1,
          amount: amt,
          maxSupply: ms,
          propertiesTemplate: firstGeneratedId,
        }
        if (sfx) seriesPayload.idSuffix = sfx
        if (soulbound) seriesPayload.soulbound = true

        const makeOp = (action, payload) => ['custom_json', {
          required_auths: [user],
          required_posting_auths: [],
          id: 'vsc.call',
          json: JSON.stringify({ net_id: netId, contract_id: contractId, action, payload, rc_limit: 10000, intents: [] }),
        }]

        res = await aioha.signAndBroadcastTx([
          makeOp('mint', mintPayload),
          makeOp('mintSeries', seriesPayload),
        ], KeyTypes.Active)
      } else {
        // Single-op: standard mintSeries
        const payload = {
          to: to.trim(),
          idPrefix: idPrefix.trim(),
          startNumber: parsedStartNumber,
          count: parsedCount,
          amount: amt,
          maxSupply: ms,
        }
        if (sfx) payload.idSuffix = sfx
        if (soulbound) payload.soulbound = true
        if (propsStr) payload.properties = propsStr
        if (useTemplate && !useFirstAsTemplate && externalTemplate.trim()) {
          payload.propertiesTemplate = externalTemplate.trim()
        }

        res = await aioha.vscCallContract(contractId, 'mintSeries', payload, 10000, [], KeyTypes.Active)
      }
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

  const handleReceiverChange = (e) => {
    setTo(normalizeReceiver(e.target.value))
  }

  const canSubmit = isValid && !isProcessing

  // Preview: show first and last generated ID
  const previewIds = useMemo(() => {
    if (!idPrefix.trim() || parsedCount === null || parsedStartNumber === null) return null
    const first = `${idPrefix.trim()}${parsedStartNumber}${sfx}`
    const last = `${idPrefix.trim()}${parsedStartNumber + parsedCount - 1}${sfx}`
    return parsedCount === 1 ? first : `${first} ... ${last}`
  }, [idPrefix, sfx, parsedCount, parsedStartNumber])

  return (
    <div className="neon-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
      <FormField label="Recipient" mandatory hintText="The Hive username to mint the series to.">
        {({ labelText }) => (
          <>
            <FloatingLabelInput label={labelText} type="text" value={to} onChange={handleReceiverChange} placeholder="hive:username" maxLength={MAX_ADDRESS_LEN} style={{ width: '100%' }} />
            {addressError && <div style={{ fontSize: 'var(--font-size-base)', color: '#ff4444', marginTop: '0.25rem' }}>{addressError}</div>}
          </>
        )}
      </FormField>

      <FormField label="ID Prefix" mandatory hintText="Token IDs will be generated as prefix + number (e.g. 'card-' produces card-1, card-2, ...).">
        {({ labelText }) => (
          <>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'stretch' }}>
              <FloatingLabelInput label={labelText} type="text" value={idPrefix} maxLength={MAX_TOKEN_ID_LEN} onChange={detectedPattern ? undefined : (e) => setIdPrefix(e.target.value.slice(0, MAX_TOKEN_ID_LEN))} placeholder="e.g. card-" disabled={!!detectedPattern} style={{ flex: 1, opacity: detectedPattern ? 0.5 : 1 }} />
              {!detectedPattern && (
                <>
                  <button type="button" onClick={handleRandomPrefix} title="Generate random prefix" style={{ border: '1px solid var(--color-primary-darkest)', background: 'transparent', color: 'var(--color-primary)', padding: '0 0.6rem', cursor: 'pointer', fontSize: 'var(--font-size-label)', fontFamily: 'var(--font-family-base)', letterSpacing: '0.05em', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    Random
                  </button>
                  <button type="button" onClick={handleAdjNounPrefix} title="Generate adjective+noun prefix" style={{ border: '1px solid var(--color-primary-darkest)', background: 'transparent', color: 'var(--color-primary)', padding: '0 0.6rem', cursor: 'pointer', fontSize: 'var(--font-size-label)', fontFamily: 'var(--font-family-base)', letterSpacing: '0.05em', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    Adj+Noun
                  </button>
                </>
              )}
            </div>
            {prefixError && <div style={{ fontSize: 'var(--font-size-base)', color: '#ff4444', marginTop: '0.25rem' }}>{prefixError}</div>}
            {generatedIdError && <div style={{ fontSize: 'var(--font-size-base)', color: '#ff4444', marginTop: '0.25rem' }}>{generatedIdError}</div>}
          </>
        )}
      </FormField>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <div style={{ flex: 1 }}>
          <FormField label="Start Number" mandatory hintText="The first number in the series.">
            {({ labelText }) => (
              <FloatingLabelInput label={labelText} type="number" min="0" value={startNumber} onChange={detectedPattern ? undefined : (e) => setStartNumber(e.target.value)} disabled={!!detectedPattern} style={{ width: '100%', opacity: detectedPattern ? 0.5 : 1 }} />
            )}
          </FormField>
        </div>
        <div style={{ flex: 1 }}>
          <FormField label="Count" mandatory hintText="Number of tokens to create in this series.">
            {({ labelText }) => (
              <FloatingLabelInput label={labelText} type="number" min="1" value={count} onChange={(e) => setCount(e.target.value)} style={{ width: '100%' }} />
            )}
          </FormField>
        </div>
        <div style={{ flex: 1 }}>
          <FormField label="Suffix" hintText="Appended after number.">
            {({ labelText }) => (
              <FloatingLabelInput label={labelText} type="text" value={suffix} onChange={detectedPattern ? undefined : (e) => setSuffix(e.target.value)} disabled={!!detectedPattern} style={{ width: '100%', opacity: detectedPattern ? 0.5 : 1 }} />
            )}
          </FormField>
        </div>
      </div>

      {previewIds && (
        <div style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-primary-darker)', padding: '0.25rem 0' }}>
          IDs: {previewIds} ({parsedCount} token{parsedCount !== 1 ? 's' : ''})
        </div>
      )}

      {loadingNextNumber && (
        <div style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-primary-darker)', padding: '0.25rem 0' }}>
          Finding next available number...
        </div>
      )}

      {initialTemplateId ? (
        <div style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-primary-darker)', padding: '0.25rem 0' }}>
          Template: <span style={{ color: 'var(--color-primary)' }}>{initialTemplateId}</span>
        </div>
      ) : (
        <>
          <FormField label="Token Type" hintText="Unique = 1-of-1 NFTs. Editioned = multiple copies per token ID with a max supply.">
            {() => (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--color-primary-darker)', fontFamily: 'var(--font-family-base)', fontSize: 'var(--font-size-base)', userSelect: 'none' }}>Token Type:</span>
                <span style={{ color: !isEditioned ? 'var(--color-primary)' : 'var(--color-primary-darker)', fontFamily: 'var(--font-family-base)', fontSize: 'var(--font-size-base)', userSelect: 'none' }}>Unique</span>
                <NeonSwitch checked={isEditioned} onChange={setIsEditioned} />
                <span style={{ color: isEditioned ? 'var(--color-primary)' : 'var(--color-primary-darker)', fontFamily: 'var(--font-family-base)', fontSize: 'var(--font-size-base)', userSelect: 'none' }}>Editioned</span>
              </div>
            )}
          </FormField>

          {isEditioned && (
            <>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                  <FormField label="Amount" mandatory hintText="Copies per token ID.">
                    {({ labelText }) => (
                      <FloatingLabelInput label={labelText} type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ width: '100%' }} />
                    )}
                  </FormField>
                </div>
                <div style={{ flex: 1 }}>
                  <FormField label="Max Supply" mandatory hintText="Max supply per token ID.">
                    {({ labelText }) => (
                      <FloatingLabelInput label={labelText} type="number" min="1" value={maxSupply} onChange={(e) => setMaxSupply(e.target.value)} style={{ width: '100%' }} />
                    )}
                  </FormField>
                </div>
              </div>
              {amountExceedsSupply && (
                <div style={{ fontSize: 'var(--font-size-base)', color: '#ff4444', marginTop: '0.25rem' }}>
                  Amount ({parsedAmount}) exceeds max supply ({parsedMaxSupply}).
                </div>
              )}
            </>
          )}

          <FormField label="Transferable" hintText="Soulbound tokens cannot be transferred after minting.">
            {() => (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--color-primary-darker)', fontFamily: 'var(--font-family-base)', fontSize: 'var(--font-size-base)', userSelect: 'none' }}>Transferable:</span>
                <span style={{ color: !soulbound ? 'var(--color-primary)' : 'var(--color-primary-darker)', fontFamily: 'var(--font-family-base)', fontSize: 'var(--font-size-base)', userSelect: 'none' }}>Yes</span>
                <NeonSwitch checked={soulbound} onChange={setSoulbound} />
                <span style={{ color: soulbound ? 'var(--color-primary)' : 'var(--color-primary-darker)', fontFamily: 'var(--font-family-base)', fontSize: 'var(--font-size-base)', userSelect: 'none' }}>Soulbound</span>
              </div>
            )}
          </FormField>

          <FormField label="Use Template NFT" hintText="Use a template NFT whose properties are inherited by all other tokens in the series.">
            {() => (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--color-primary-darker)', fontFamily: 'var(--font-family-base)', fontSize: 'var(--font-size-base)', userSelect: 'none' }}>Use Template NFT:</span>
                <span style={{ color: !useTemplate ? 'var(--color-primary)' : 'var(--color-primary-darker)', fontFamily: 'var(--font-family-base)', fontSize: 'var(--font-size-base)', userSelect: 'none' }}>No</span>
                <NeonSwitch checked={useTemplate} onChange={setUseTemplate} />
                <span style={{ color: useTemplate ? 'var(--color-primary)' : 'var(--color-primary-darker)', fontFamily: 'var(--font-family-base)', fontSize: 'var(--font-size-base)', userSelect: 'none' }}>Yes</span>
              </div>
            )}
          </FormField>

          {!useTemplate && (
            <NftPropertiesInput
              value={properties}
              onChange={setProperties}
              label="Properties (JSON)"
              hintText="Optional metadata applied to every token in the series. Must be valid JSON."
              minHeight="80px"
            />
          )}

          {useTemplate && (
            <>
              <FormField label="Use 1st NFT as Template" hintText="The first token in the series will hold the properties, all others inherit from it.">
                {() => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: 'var(--color-primary-darker)', fontFamily: 'var(--font-family-base)', fontSize: 'var(--font-size-base)', userSelect: 'none' }}>Use 1st NFT as Template:</span>
                    <span style={{ color: !useFirstAsTemplate ? 'var(--color-primary)' : 'var(--color-primary-darker)', fontFamily: 'var(--font-family-base)', fontSize: 'var(--font-size-base)', userSelect: 'none' }}>No</span>
                    <NeonSwitch checked={useFirstAsTemplate} onChange={setUseFirstAsTemplate} />
                    <span style={{ color: useFirstAsTemplate ? 'var(--color-primary)' : 'var(--color-primary-darker)', fontFamily: 'var(--font-family-base)', fontSize: 'var(--font-size-base)', userSelect: 'none' }}>Yes</span>
                  </div>
                )}
              </FormField>

              {useFirstAsTemplate && (
                <>
                  {firstGeneratedId && (
                    <div style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-primary-darker)', padding: '0.25rem 0' }}>
                      Template NFT: <span style={{ color: 'var(--color-primary)' }}>{firstGeneratedId}</span>
                      <div style={{ color: 'var(--color-primary-darker)', marginTop: '0.25rem', opacity: 0.7 }}>
                        The template NFT is non-transferable and serves only as a properties source for the series.
                      </div>
                    </div>
                  )}
                  <NftPropertiesInput
                    value={properties}
                    onChange={setProperties}
                    label="Template Properties (JSON)"
                    hintText="Metadata stored on the 1st NFT. All other tokens in the series inherit these properties."
                    mandatory
                    minHeight="80px"
                  />
                </>
              )}

              {!useFirstAsTemplate && (
                <FormField label="Template NFT ID" mandatory hintText="Token ID of an existing NFT to use as properties template.">
                  {({ labelText }) => (
                    <>
                      <FloatingLabelInput label={labelText} type="text" value={externalTemplate} maxLength={MAX_TOKEN_ID_LEN} onChange={(e) => setExternalTemplate(e.target.value.slice(0, MAX_TOKEN_ID_LEN))} placeholder="e.g. my-template-nft" style={{ width: '100%' }} />
                      {externalTemplateError && <div style={{ fontSize: 'var(--font-size-base)', color: '#ff4444', marginTop: '0.25rem' }}>{externalTemplateError}</div>}
                    </>
                  )}
                </FormField>
              )}
            </>
          )}
        </>
      )}

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
        {isProcessing ? 'Minting Series...' : `Mint Series (${parsedCount || 0} tokens)`}
      </button>
    </div>
  )
}
