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

export default function NftMintPopup({ onClose, onSuccess, aioha, user, contractId, collectionInfo, hasuraHttp, initialTokenId, initialEditioned }) {
  const defaultTo = user ? (user.startsWith('hive:') ? user : `hive:${user}`) : 'hive:'
  const [to, setTo] = useState(defaultTo)
  const [tokenId, setTokenId] = useState(initialTokenId || '')
  const [isEditioned, setIsEditioned] = useState(initialEditioned || false)
  const [amount, setAmount] = useState('1')
  const [maxSupply, setMaxSupply] = useState('100')
  const [soulbound, setSoulbound] = useState(false)
  const [properties, setProperties] = useState('')
  const [propertiesTemplate, setPropertiesTemplate] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [tokenIdTaken, setTokenIdTaken] = useState(!!initialTokenId)
  const [checkingTokenId, setCheckingTokenId] = useState(false)
  const handleRandomId = useCallback(() => {
    setTokenId(generateRandomId())
  }, [])

  const handleAdjNounId = useCallback(() => {
    setTokenId(generateAdjNounId())
  }, [])

  // Debounced check if token ID already exists
  useEffect(() => {
    const trimmed = tokenId.trim()
    if (!trimmed) {
      setTokenIdTaken(false)
      setCheckingTokenId(false)
      return
    }
    setCheckingTokenId(true)
    const timer = setTimeout(async () => {
      const exists = await checkTokenIdExists(hasuraHttp, contractId, trimmed)
      setTokenIdTaken(exists)
      setCheckingTokenId(false)
    }, 400)
    return () => clearTimeout(timer)
  }, [tokenId, hasuraHttp, contractId])

  const parsedAmount = useMemo(() => {
    const n = parseInt(amount, 10)
    return isNaN(n) || n <= 0 ? null : n
  }, [amount])

  const parsedMaxSupply = useMemo(() => {
    const n = parseInt(maxSupply, 10)
    return isNaN(n) || n <= 0 ? null : n
  }, [maxSupply])

  const parsedProperties = useMemo(() => {
    const trimmed = properties.trim()
    if (!trimmed) return null
    try {
      return JSON.parse(trimmed)
    } catch {
      return undefined
    }
  }, [properties])

  const amountExceedsSupply = isEditioned && parsedAmount !== null && parsedMaxSupply !== null && parsedAmount > parsedMaxSupply

  const tokenIdError = useMemo(() => {
    const trimmed = tokenId.trim()
    if (!trimmed) return null
    return validateTokenId(trimmed)
  }, [tokenId])

  const addressError = useMemo(() => {
    const trimmed = to.trim()
    if (!trimmed) return null
    return validateAddress(trimmed)
  }, [to])

  const templateError = useMemo(() => {
    const trimmed = propertiesTemplate.trim()
    if (!trimmed) return null
    return validateTokenId(trimmed)
  }, [propertiesTemplate])

  const mintingExisting = isEditioned && tokenIdTaken

  const isValid = useMemo(() => {
    const receiverName = to.startsWith('hive:') ? to.slice(5) : to
    if (!receiverName.trim() || receiverName.length < 3) return false
    if (!tokenId.trim()) return false
    if (tokenIdError || addressError) return false
    if (tokenIdTaken && !isEditioned) return false
    if (mintingExisting) {
      // Only need a valid amount when minting to an existing token
      if (parsedAmount === null) return false
      return true
    }
    if (!mintingExisting && templateError) return false
    if (isEditioned && (parsedAmount === null || parsedMaxSupply === null)) return false
    if (amountExceedsSupply) return false
    if (parsedProperties === undefined) return false
    return true
  }, [to, tokenId, isEditioned, parsedAmount, parsedMaxSupply, parsedProperties, tokenIdTaken, mintingExisting, amountExceedsSupply, tokenIdError, addressError, templateError])

  const handleMint = async () => {
    if (!isValid || isProcessing) return
    setIsProcessing(true)
    setError(null)

    try {
      const payload = {
        to: to.trim(),
        id: tokenId.trim(),
        amount: isEditioned ? parsedAmount : 1,
        data: '',
      }
      if (mintingExisting) {
        // Minting to existing token — only send to, id, amount, data
      } else if (isEditioned) {
        if (parsedMaxSupply) payload.maxSupply = parsedMaxSupply
        if (soulbound) payload.soulbound = true
        if (parsedProperties) payload.properties = typeof parsedProperties === 'object' ? JSON.stringify(parsedProperties) : parsedProperties
        if (propertiesTemplate.trim()) payload.propertiesTemplate = propertiesTemplate.trim()
      } else {
        payload.maxSupply = 1
        if (soulbound) payload.soulbound = true
        if (parsedProperties) payload.properties = typeof parsedProperties === 'object' ? JSON.stringify(parsedProperties) : parsedProperties
        if (propertiesTemplate.trim()) payload.propertiesTemplate = propertiesTemplate.trim()
      }

      const res = await aioha.vscCallContract(contractId, 'mint', payload, 10000, [], KeyTypes.Active)
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

  return (
    <div className="neon-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
      <FormField label="Recipient" mandatory hintText="The Hive username to mint the NFT to.">
        {({ labelText }) => (
          <>
            <FloatingLabelInput
              label={labelText}
              type="text"
              value={to}
              onChange={handleReceiverChange}
              placeholder="hive:username"
              style={{ width: '100%' }}
            />
            {addressError && <div style={{ fontSize: 'var(--font-size-base)', color: '#ff4444', marginTop: '0.25rem' }}>{addressError}</div>}
          </>
        )}
      </FormField>

      <FormField label="Token ID" mandatory hintText={`A unique identifier for this token (max ${MAX_TOKEN_ID_LEN} chars).`}>
        {({ labelText }) => (
          <>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'stretch' }}>
              <FloatingLabelInput label={labelText} type="text" value={tokenId} maxLength={MAX_TOKEN_ID_LEN} onChange={(e) => setTokenId(e.target.value.slice(0, MAX_TOKEN_ID_LEN))} style={{ flex: 1 }} />
              <button type="button" onClick={handleRandomId} title="Generate random 32-char ID" style={{ border: '1px solid var(--color-primary-darkest)', background: 'transparent', color: 'var(--color-primary)', padding: '0 0.6rem', cursor: 'pointer', fontSize: 'var(--font-size-label)', fontFamily: 'var(--font-family-base)', letterSpacing: '0.05em', whiteSpace: 'nowrap', flexShrink: 0 }}>
                Random
              </button>
              <button type="button" onClick={handleAdjNounId} title="Generate adjective+noun ID" style={{ border: '1px solid var(--color-primary-darkest)', background: 'transparent', color: 'var(--color-primary)', padding: '0 0.6rem', cursor: 'pointer', fontSize: 'var(--font-size-label)', fontFamily: 'var(--font-family-base)', letterSpacing: '0.05em', whiteSpace: 'nowrap', flexShrink: 0 }}>
                Adj+Noun
              </button>
            </div>
            {tokenIdError && <div style={{ fontSize: 'var(--font-size-base)', color: '#ff4444', marginTop: '0.25rem' }}>{tokenIdError}</div>}
            {tokenIdTaken && !checkingTokenId && (
              <div style={{ fontSize: 'var(--font-size-base)', color: isEditioned ? 'var(--color-primary)' : '#ff4444', marginTop: '0.25rem' }}>
                {isEditioned
                  ? 'This token ID already exists. Minting will add to the existing supply.'
                  : 'This token ID already exists. Unique tokens cannot be minted again.'}
              </div>
            )}
            {checkingTokenId && tokenId.trim() && (
              <div style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-primary-darker)', marginTop: '0.25rem' }}>
                Checking availability...
              </div>
            )}
          </>
        )}
      </FormField>

      {mintingExisting ? (
        <FormField label="Amount" mandatory hintText="Number of additional tokens to mint.">
          {({ labelText }) => (
            <FloatingLabelInput label={labelText} type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ width: '100%' }} />
          )}
        </FormField>
      ) : (
        <>
          <FormField label="Editions" hintText="Unique = 1-of-1 NFT. Editioned = multiple copies with a max supply.">
            {() => (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--color-primary-darker)', fontFamily: 'var(--font-family-base)', fontSize: 'var(--font-size-base)', userSelect: 'none' }}>Editions:</span>
                <span style={{ color: !isEditioned ? 'var(--color-primary)' : 'var(--color-primary-darker)', fontFamily: 'var(--font-family-base)', fontSize: 'var(--font-size-base)', userSelect: 'none' }}>Unique</span>
                <NeonSwitch checked={isEditioned} onChange={setIsEditioned} />
                <span style={{ color: isEditioned ? 'var(--color-primary)' : 'var(--color-primary-darker)', fontFamily: 'var(--font-family-base)', fontSize: 'var(--font-size-base)', userSelect: 'none' }}>Editioned</span>
              </div>
            )}
          </FormField>

          {isEditioned && (
            <>
              <FormField label="Amount" mandatory hintText="Number of tokens to mint in this batch.">
                {({ labelText }) => (
                  <FloatingLabelInput label={labelText} type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ width: '100%' }} />
                )}
              </FormField>

              <FormField label="Max Supply" hintText="Maximum total supply for this token ID. Set on first mint.">
                {({ labelText }) => (
                  <FloatingLabelInput label={labelText} type="number" min="1" value={maxSupply} onChange={(e) => setMaxSupply(e.target.value)} style={{ width: '100%' }} />
                )}
              </FormField>
              {amountExceedsSupply && (
                <div style={{ fontSize: 'var(--font-size-base)', color: '#ff4444', marginTop: '0.25rem' }}>
                  Amount ({parsedAmount}) exceeds max supply ({parsedMaxSupply}).
                </div>
              )}
            </>
          )}

          <FormField label="Non-transferable" hintText="Non-transferable tokens cannot be transferred by the recipient after receiving them. Set on first mint.">
            {() => (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--color-primary-darker)', fontFamily: 'var(--font-family-base)', fontSize: 'var(--font-size-base)', userSelect: 'none' }}>Token:</span>
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
            hintText="Optional metadata to attach on first mint. Must be valid JSON."
          />

          <FormField label="Properties Template" hintText={`Token ID to inherit properties from (max ${MAX_TOKEN_ID_LEN} chars).`}>
            {({ labelText }) => (
              <>
                <FloatingLabelInput
                  label={labelText}
                  type="text"
                  value={propertiesTemplate}
                  maxLength={MAX_TOKEN_ID_LEN} onChange={(e) => setPropertiesTemplate(e.target.value.slice(0, MAX_TOKEN_ID_LEN))}
                  placeholder="e.g. base-template"
                  style={{ width: '100%' }}
                />
                {templateError && <div style={{ fontSize: 'var(--font-size-base)', color: '#ff4444', marginTop: '0.25rem' }}>{templateError}</div>}
              </>
            )}
          </FormField>
        </>
      )}

      {error && <div style={{ fontSize: 'var(--font-size-base)', color: '#ff4444', padding: '0.25rem 0' }}>{error}</div>}

      <button
        type="button"
        onClick={handleMint}
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
        {isProcessing ? 'Minting...' : 'Mint NFT'}
      </button>
    </div>
  )
}
