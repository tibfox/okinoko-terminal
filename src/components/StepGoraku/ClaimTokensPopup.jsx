import { useState, useMemo, useEffect, useRef } from 'preact/hooks'
import { KeyTypes } from '@aioha/aioha'
import contractsCfg from '../../data/contracts'

// Get the Goraku contract config
const gorakuContract = contractsCfg.contracts.find(c => c.vscId === 'vsc1PLACEHOLDER_GAMES2')

// Pixel dice face patterns (5x5 grid, 1 = dot)
const DICE_FACES = {
  1: [
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
  ],
  2: [
    [1, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1],
  ],
  3: [
    [1, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1],
  ],
  4: [
    [1, 0, 0, 0, 1],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [1, 0, 0, 0, 1],
  ],
  5: [
    [1, 0, 0, 0, 1],
    [0, 0, 0, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 0, 0, 0],
    [1, 0, 0, 0, 1],
  ],
  6: [
    [1, 0, 0, 0, 1],
    [0, 0, 0, 0, 0],
    [1, 0, 0, 0, 1],
    [0, 0, 0, 0, 0],
    [1, 0, 0, 0, 1],
  ],
}

function PixelDice({ value, isSpinning }) {
  const [displayValue, setDisplayValue] = useState(value || 1)
  const spinIntervalRef = useRef(null)

  useEffect(() => {
    if (isSpinning) {
      // Rapidly change dice face while spinning
      spinIntervalRef.current = setInterval(() => {
        setDisplayValue(Math.floor(Math.random() * 6) + 1)
      }, 100)
    } else {
      if (spinIntervalRef.current) {
        clearInterval(spinIntervalRef.current)
        spinIntervalRef.current = null
      }
      if (value) {
        setDisplayValue(value)
      }
    }

    return () => {
      if (spinIntervalRef.current) {
        clearInterval(spinIntervalRef.current)
      }
    }
  }, [isSpinning, value])

  const face = DICE_FACES[displayValue] || DICE_FACES[1]
  const pixelSize = 16

  return (
    <div
      style={{
        display: 'inline-block',
        padding: '12px',
        background: 'var(--color-primary-darkest)',
        border: '3px solid var(--color-primary)',
        boxShadow: isSpinning ? '0 0 20px var(--color-primary)' : '0 0 10px var(--color-primary-darker)',
        transition: 'box-shadow 0.3s ease',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(5, ${pixelSize}px)`,
          gridTemplateRows: `repeat(5, ${pixelSize}px)`,
          gap: '2px',
        }}
      >
        {face.flat().map((dot, idx) => (
          <div
            key={idx}
            style={{
              width: pixelSize,
              height: pixelSize,
              background: dot ? 'var(--color-primary)' : 'transparent',
              borderRadius: '2px',
              transition: 'background 0.1s ease',
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default function ClaimTokensPopup({ onClose, aioha, user }) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSpinning, setIsSpinning] = useState(false)
  const [result, setResult] = useState(null)
  const [showHiveAuthMessage, setShowHiveAuthMessage] = useState(false)

  const normalizedUser = useMemo(() => {
    if (!user) return 'unknown'
    return user.startsWith('hive:') ? user.slice(5) : user
  }, [user])

  const handleClaim = async () => {
    if (isProcessing) return

    setIsProcessing(true)
    setResult(null)

    try {
      // Claim tokens transaction
      const ops = [
        [
          'custom_json',
          {
            required_auths: [],
            required_posting_auths: [normalizedUser],
            id: 'vsc.tx',
            json: JSON.stringify({
              action: 'claim_tokens',
              contract: gorakuContract?.vscId,
            }),
          },
        ],
      ]

      console.log('Sending claim tokens transaction:', ops)

      // Check if using HiveAuth
      const isHiveAuth = aioha.getCurrentProvider && aioha.getCurrentProvider() === 'hiveauth'
      if (isHiveAuth) {
        setShowHiveAuthMessage(true)
      }

      // Execute the transaction using Aioha
      const txResult = await aioha.signAndBroadcastTx(ops, KeyTypes.Posting)

      setShowHiveAuthMessage(false)

      console.log('Transaction result:', txResult)

      if (txResult?.success) {
        // Transaction signed - start spinning the dice!
        setIsSpinning(true)

        // Spin for 2 seconds then show result
        setTimeout(() => {
          const diceResult = Math.floor(Math.random() * 6) + 1
          setIsSpinning(false)
          setResult(diceResult)
        }, 2000)
      } else {
        console.error('Transaction failed:', txResult?.error)
        alert(`Transaction failed: ${txResult?.error || 'Unknown error'}`)
        setIsProcessing(false)
      }
    } catch (error) {
      console.error('Error claiming tokens:', error)
      alert(`Error: ${error.message || 'Unknown error'}`)
      setIsProcessing(false)
      setShowHiveAuthMessage(false)
    }
  }

  const buttonDisabled = isProcessing || isSpinning

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
      <div style={{
        fontSize: 'var(--font-size-base)',
        lineHeight: '1.5',
        color: 'var(--color-primary-lighter)',
        textAlign: 'center'
      }}>
        {result === null
          ? 'Roll the dice to claim your tokens!'
          : `You rolled a ${result}! Tokens claimed.`
        }
      </div>

      {/* Pixel Dice */}
      <PixelDice value={result || 1} isSpinning={isSpinning} />

      {result === null ? (
        <button
          type="button"
          onClick={handleClaim}
          disabled={buttonDisabled}
          style={{
            border: '1px solid var(--color-primary-darkest)',
            background: !buttonDisabled ? 'var(--color-primary-darkest)' : 'transparent',
            color: !buttonDisabled ? 'var(--color-primary)' : 'var(--color-primary-darker)',
            padding: '0.75rem 2rem',
            cursor: !buttonDisabled ? 'pointer' : 'not-allowed',
            fontSize: 'var(--font-size-base)',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            fontFamily: 'var(--font-family-base)',
            transition: 'all 0.2s ease',
            opacity: !buttonDisabled ? 1 : 0.4,
          }}
        >
          {isSpinning ? 'Rolling...' : isProcessing ? 'Processing...' : 'Roll Dice'}
        </button>
      ) : (
        <button
          type="button"
          onClick={onClose}
          style={{
            border: '1px solid var(--color-primary-darkest)',
            background: 'var(--color-primary-darkest)',
            color: 'var(--color-primary)',
            padding: '0.75rem 2rem',
            cursor: 'pointer',
            fontSize: 'var(--font-size-base)',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            fontFamily: 'var(--font-family-base)',
            transition: 'all 0.2s ease',
          }}
        >
          Close
        </button>
      )}

      {showHiveAuthMessage && (
        <div style={{
          fontSize: 'var(--font-size-base)',
          color: '#ff4444',
          textAlign: 'center',
          letterSpacing: '0.05em'
        }}>
          Please accept the transaction in HiveAuth
        </div>
      )}
    </div>
  )
}
