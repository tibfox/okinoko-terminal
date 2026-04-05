import { useState, useMemo, useEffect, useCallback } from 'preact/hooks'
import { KeyTypes } from '@aioha/aioha'
import FloatingLabelInput from '../common/FloatingLabelInput.jsx'
import FormField from '../common/FormField.jsx'
import NeonSwitch from '../common/NeonSwitch.jsx'
import NftPropertiesInput from '../common/NftPropertiesInput.jsx'
import { MAX_TOKEN_ID_LEN, validateTokenId, validateAddress } from '../../lib/nftValidation.js'

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
function generateRandomId() {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return Array.from(arr, (b) => CHARS[b % CHARS.length]).join('')
}

import ADJECTIVES from '../../data/adjectives.json'
import NOUNS from '../../data/nouns.json'

function cryptoRand() {
  return crypto.getRandomValues(new Uint32Array(1))[0] / 0x100000000
}

function generateAdjNounId() {
  const pick = (arr) => arr[Math.floor(cryptoRand() * arr.length)]
  const sep = pick(['-', '_', '.', ''])
  const noun = pick(NOUNS)
  const adj1 = pick(ADJECTIVES)
  if (cryptoRand() < 0.5) {
    const adj2 = pick(ADJECTIVES)
    return `${adj1}${sep}${adj2}${sep}${noun}`
  }
  return `${adj1}${sep}${noun}`
}

const normalizeReceiver = (val) => {
  let next = val.replace(/@/g, '')
  if (!next.startsWith('hive:') && next.trim() !== '') {
    next = 'hive:' + next.replace(/^hive:/, '').replace(/^:+/, '')
  }
  return next
}

async function checkTokenIdExists(hasuraHttp, contractId, tokenId) {
  if (!hasuraHttp || !contractId || !tokenId) return false
  try {
    const res = await fetch(hasuraHttp, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query($contractId: String!, $tokenId: String!) {
          magi_nft_token_supply(where: { contract_id: { _eq: $contractId }, token_id: { _eq: $tokenId } }) {
            current_supply
          }
        }`,
        variables: { contractId, tokenId },
      }),
    })
    const data = await res.json()
    const rows = data?.data?.magi_nft_token_supply || []
    return rows.length > 0 && Number(rows[0].current_supply) > 0
  } catch {
    return false
  }
}

async function findExistingChildren(hasuraHttp, contractId, prefix, suffix) {
  if (!hasuraHttp || !contractId || !prefix) return []
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
    const numbers = new Set()
    for (const row of rows) {
      const tid = row.token_id
      if (tid === prefix) continue
      let inner = tid.slice(prefix.length)
      if (suffix && inner.endsWith(suffix)) inner = inner.slice(0, -suffix.length)
      const n = parseInt(inner, 10)
      if (!isNaN(n) && n > 0) numbers.add(n)
    }
    return numbers
  } catch {
    return new Set()
  }
}

export default function NftMintBatchPopup({ onClose, onSuccess, aioha, user, contractId, collectionInfo, hasuraHttp, initialTemplateId }) {
  const defaultTo = user ? (user.startsWith('hive:') ? user : `hive:${user}`) : 'hive:'
  const [to, setTo] = useState(defaultTo)
  const [templateId, setTemplateId] = useState(initialTemplateId || '')
  const [copies, setCopies] = useState('5')
  const [soulbound, setSoulbound] = useState(false)
  const [properties, setProperties] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [suffix, setSuffix] = useState('')
  const [templateIdTaken, setTemplateIdTaken] = useState(!!initialTemplateId)
  const [checkingTemplateId, setCheckingTemplateId] = useState(false)
  const [takenNumbers, setTakenNumbers] = useState(new Set())
  const handleRandomId = useCallback(() => {
    setTemplateId(generateRandomId())
  }, [])

  const handleAdjNounId = useCallback(() => {
    setTemplateId(generateAdjNounId())
  }, [])

  // Debounced check if template token ID already exists + find existing children
  useEffect(() => {
    const trimmed = templateId.trim()
    if (!trimmed) {
      setTemplateIdTaken(false)
      setTakenNumbers(new Set())
      setCheckingTemplateId(false)
      return
    }
    setCheckingTemplateId(true)
    const timer = setTimeout(async () => {
      const [exists, taken] = await Promise.all([
        checkTokenIdExists(hasuraHttp, contractId, trimmed),
        findExistingChildren(hasuraHttp, contractId, trimmed, suffix.trim()),
      ])
      setTemplateIdTaken(exists)
      setTakenNumbers(taken)
      setCheckingTemplateId(false)
    }, 400)
    return () => clearTimeout(timer)
  }, [templateId, suffix, hasuraHttp, contractId])

  const parsedCopies = useMemo(() => {
    const n = parseInt(copies, 10)
    return isNaN(n) || n < 1 ? null : n
  }, [copies])

  const parsedProperties = useMemo(() => {
    const trimmed = properties.trim()
    if (!trimmed) return null
    try {
      return JSON.parse(trimmed)
    } catch {
      return undefined
    }
  }, [properties])

  // Generate the list of token IDs for preview
  // If template exists, skip it and continue from the lowest free number
  const generatedIds = useMemo(() => {
    const base = templateId.trim()
    const sfx = suffix.trim()
    if (!base || !parsedCopies) return []
    const ids = templateIdTaken ? [] : [base]
    let count = 0
    let i = 1
    while (count < parsedCopies) {
      if (!takenNumbers.has(i)) {
        ids.push(`${base}${i}${sfx}`)
        count++
      }
      i++
    }
    return ids
  }, [templateId, parsedCopies, suffix, templateIdTaken, takenNumbers])

  const templateIdError = useMemo(() => {
    const trimmed = templateId.trim()
    if (!trimmed) return null
    return validateTokenId(trimmed)
  }, [templateId])

  const addressError = useMemo(() => {
    const trimmed = to.trim()
    if (!trimmed) return null
    return validateAddress(trimmed)
  }, [to])

  // Check that generated IDs (with suffix + number) don't exceed the limit
  const generatedIdError = useMemo(() => {
    for (const id of generatedIds) {
      if (id.length > MAX_TOKEN_ID_LEN) return `Generated ID "${id.slice(0, 20)}…" exceeds ${MAX_TOKEN_ID_LEN} characters`
    }
    return null
  }, [generatedIds])

  const isValid = useMemo(() => {
    const receiverName = to.startsWith('hive:') ? to.slice(5) : to
    if (!receiverName.trim() || receiverName.length < 3) return false
    if (!templateId.trim()) return false
    if (templateIdError || addressError || generatedIdError) return false
    if (!parsedCopies || parsedCopies < 1) return false
    if (parsedProperties === undefined) return false // invalid JSON
    return true
  }, [to, templateId, parsedCopies, parsedProperties, templateIdError, addressError, generatedIdError])

  const handleMintBatch = async () => {
    if (!isValid || isProcessing) return
    setIsProcessing(true)
    setError(null)

    try {
      const ids = generatedIds
      const base = templateId.trim()

      const payload = {
        to: to.trim(),
        ids: ids,
        amounts: ids.map(() => 1),
        maxSupplies: ids.map(() => 1),
        data: '',
      }

      if (templateIdTaken) {
        // Template already exists — only mint children, all follow the soulbound toggle
        payload.soulbound = ids.map(() => soulbound)
        payload.propertiesTemplate = base
      } else {
        // Template token (index 0) is always soulbound; copies follow the toggle
        payload.soulbound = ids.map((_, i) => i === 0 ? true : soulbound)

        // Set properties on the template (first) token
        if (parsedProperties) {
          payload.properties = ids.map((_, i) =>
            i === 0 ? (typeof parsedProperties === 'object' ? JSON.stringify(parsedProperties) : parsedProperties) : ''
          )
        }

        // All copies after the first inherit from the template
        if (ids.length > 1) {
          payload.propertiesTemplate = ids[0]
        }
      }

      const res = await aioha.vscCallContract(contractId, 'mintBatch', payload, 10000, [], KeyTypes.Active)
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
      <FormField label="Recipient" mandatory hintText="The Hive username to mint the NFTs to.">
        {({ labelText }) => (
          <>
            <FloatingLabelInput
              label={labelText}
              type="text"
              value={to}
              onChange={(e) => setTo(normalizeReceiver(e.target.value))}
              placeholder="hive:username"
              style={{ width: '100%' }}
            />
            {addressError && <div style={{ fontSize: 'var(--font-size-base)', color: '#ff4444', marginTop: '0.25rem' }}>{addressError}</div>}
          </>
        )}
      </FormField>

      <FormField label="Prefix (Template ID)" mandatory hintText={`Base token ID. First NFT uses this ID (max ${MAX_TOKEN_ID_LEN} chars).`}>
        {({ labelText }) => (
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'stretch' }}>
            <FloatingLabelInput label={labelText} type="text" value={templateId} maxLength={MAX_TOKEN_ID_LEN} onChange={(e) => setTemplateId(e.target.value.slice(0, MAX_TOKEN_ID_LEN))} style={{ flex: 1 }} />
            <button type="button" onClick={handleRandomId} title="Generate random 32-char ID" style={{ border: '1px solid var(--color-primary-darkest)', background: 'transparent', color: 'var(--color-primary)', padding: '0 0.6rem', cursor: 'pointer', fontSize: 'var(--font-size-label)', fontFamily: 'var(--font-family-base)', letterSpacing: '0.05em', whiteSpace: 'nowrap', flexShrink: 0 }}>
              Random
            </button>
            <button type="button" onClick={handleAdjNounId} title="Generate adjective+noun ID" style={{ border: '1px solid var(--color-primary-darkest)', background: 'transparent', color: 'var(--color-primary)', padding: '0 0.6rem', cursor: 'pointer', fontSize: 'var(--font-size-label)', fontFamily: 'var(--font-family-base)', letterSpacing: '0.05em', whiteSpace: 'nowrap', flexShrink: 0 }}>
              Adj+Noun
            </button>
          </div>
        )}
      </FormField>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
        <FormField label="Copies" mandatory hintText="Transferable copies. Template is minted separately." style={{ flex: 1 }}>
          {({ labelText }) => (
            <FloatingLabelInput label={labelText} type="number" min="1" value={copies} onChange={(e) => setCopies(e.target.value)} style={{ width: '100%' }} />
          )}
        </FormField>

        <FormField label="Suffix" hintText="Appended after number." style={{ flex: 1 }}>
          {({ labelText }) => (
            <FloatingLabelInput label={labelText} type="text" value={suffix} onChange={(e) => setSuffix(e.target.value)} placeholder="" style={{ width: '100%' }} />
          )}
        </FormField>
      </div>

      {templateIdError && <div style={{ fontSize: 'var(--font-size-base)', color: '#ff4444', marginTop: '-0.1rem' }}>{templateIdError}</div>}
      {generatedIdError && <div style={{ fontSize: 'var(--font-size-base)', color: '#ff4444', marginTop: '-0.1rem' }}>{generatedIdError}</div>}
      {templateIdTaken && !checkingTemplateId && (
        <div style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-primary)', marginTop: '-0.1rem' }}>
          Template exists — will mint children only{takenNumbers.size > 0 ? `, skipping ${takenNumbers.size} existing` : ''}.
        </div>
      )}
      {checkingTemplateId && templateId.trim() && (
        <div style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-primary-darker)', marginTop: '-0.1rem' }}>
          Checking availability...
        </div>
      )}

      <FormField label="Non-transferable" hintText="Non-transferable tokens cannot be transferred by the recipient after receiving them.">
        {() => (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--color-primary-darker)', fontFamily: 'var(--font-family-base)', fontSize: 'var(--font-size-base)', userSelect: 'none' }}>Copies:</span>
            <span style={{ color: !soulbound ? 'var(--color-primary)' : 'var(--color-primary-darker)', fontFamily: 'var(--font-family-base)', fontSize: 'var(--font-size-base)', userSelect: 'none' }}>Transferable</span>
            <NeonSwitch checked={soulbound} onChange={setSoulbound} />
            <span style={{ color: soulbound ? 'var(--color-primary)' : 'var(--color-primary-darker)', fontFamily: 'var(--font-family-base)', fontSize: 'var(--font-size-base)', userSelect: 'none' }}>Non-transferable</span>
          </div>
        )}
      </FormField>

      <NftPropertiesInput
        value={properties}
        onChange={setProperties}
        label="Properties (JSON)"
        hintText="Optional metadata for the template token. Copies inherit these properties via propertiesTemplate."
      />

      {generatedIds.length > 0 && (
        <div style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-primary-darker)', padding: '0.25rem 0' }}>
          Will mint {generatedIds.length} NFT{generatedIds.length > 1 ? 's' : ''}{templateIdTaken ? '' : ` (1 non-transferable template + ${generatedIds.length - 1} copies)`}:{' '}
          <span style={{ color: 'var(--color-primary)' }}>
            {generatedIds.length <= 5
              ? generatedIds.join(', ')
              : `${generatedIds.slice(0, 3).join(', ')}, … ${generatedIds[generatedIds.length - 1]}`
            }
          </span>
        </div>
      )}

      {error && <div style={{ fontSize: 'var(--font-size-base)', color: '#ff4444', padding: '0.25rem 0' }}>{error}</div>}

      <button
        type="button"
        onClick={handleMintBatch}
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
        {isProcessing ? 'Minting...' : `Mint ${generatedIds.length || 0} NFT${generatedIds.length !== 1 ? 's' : ''}`}
      </button>
    </div>
  )
}
