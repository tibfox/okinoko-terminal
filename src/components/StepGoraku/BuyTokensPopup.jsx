import { useState, useMemo } from 'preact/hooks'
import { KeyTypes } from '@aioha/aioha'
import FloatingLabelInput from '../common/FloatingLabelInput.jsx'
import FormField from '../common/FormField.jsx'
import contractsCfg from '../../data/contracts.json'

// Get the Goraku contract config
const gorakuContract = contractsCfg.contracts.find(c => c.vscId === 'vsc1PLACEHOLDER_GAMES2')
const buyTokensFn = gorakuContract?.functions?.find(f => f.name === 'buy_tokens')
const amountConfig = buyTokensFn?.parameters?.find(p => p.payloadName === 'amount') || {}

export default function BuyTokensPopup({ onClose, aioha, user, currentTokens, hiveBalance = 0 }) {
  const [amount, setAmount] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showHiveAuthMessage, setShowHiveAuthMessage] = useState(false)

  const normalizedUser = useMemo(() => {
    if (!user) return 'unknown'
    return user.startsWith('hive:') ? user.slice(5) : user
  }, [user])

  const minAmount = amountConfig.min ?? 1

  const isValidAmount = useMemo(() => {
    if (!amount) return false
    const num = parseInt(amount, 10)
    return !isNaN(num) && num >= minAmount && Number.isInteger(num) && num <= Math.floor(hiveBalance)
  }, [amount, hiveBalance, minAmount])

  const exceedsBalance = useMemo(() => {
    if (!amount) return false
    const num = parseInt(amount, 10)
    return !isNaN(num) && num > Math.floor(hiveBalance)
  }, [amount, hiveBalance])

  const handleAmountChange = (e) => {
    // Only allow integer values for tokens
    let val = e.target.value.replace(/[^0-9]/g, '')
    setAmount(val)
  }

  const handleBuy = async () => {
    if (!isValidAmount || isProcessing) return

    setIsProcessing(true)

    try {
      const tokenAmount = parseInt(amount, 10)

      // Buy tokens transaction
      const ops = [
        [
          'custom_json',
          {
            required_auths: [],
            required_posting_auths: [normalizedUser],
            id: 'vsc.tx',
            json: JSON.stringify({
              action: 'buy_tokens',
              contract: gorakuContract?.vscId,
              amount: tokenAmount,
            }),
          },
        ],
      ]

      console.log('Sending buy tokens transaction:', ops)

      // Check if using HiveAuth
      const isHiveAuth = aioha.getCurrentProvider && aioha.getCurrentProvider() === 'hiveauth'
      if (isHiveAuth) {
        setShowHiveAuthMessage(true)
      }

      // Execute the transaction using Aioha
      const result = await aioha.signAndBroadcastTx(ops, KeyTypes.Posting)

      setShowHiveAuthMessage(false)

      console.log('Transaction result:', result)

      if (result?.success) {
        alert(`Tokens purchased successfully! Transaction ID: ${result.result}`)
        onClose()
      } else {
        console.error('Transaction failed:', result?.error)
        alert(`Transaction failed: ${result?.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error buying tokens:', error)
      alert(`Error: ${error.message || 'Unknown error'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="neon-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '60vh', overflowY: 'auto' }}>
      <div style={{
        display: 'flex',
        gap: '1.5rem',
        alignItems: 'flex-start',
        flexWrap: 'wrap'
      }}>
        {/* Left side - Amount input */}
        <div style={{ flex: '1 1 200px', minWidth: '150px' }}>
          <FormField
            label={amountConfig.name || 'Token Amount'}
            mandatory={amountConfig.mandatory !== false}
            hintText={amountConfig.hintText}
          >
            {({ labelText }) => (
              <FloatingLabelInput
                label={labelText}
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={amount}
                onChange={handleAmountChange}
                style={{ width: '100%' }}
              />
            )}
          </FormField>
          <div style={{
            fontSize: '1.65rem',
            color: exceedsBalance ? '#ff4444' : 'var(--color-primary-darker)',
            marginTop: '-8px',
          }}>
            Available: {hiveBalance.toFixed(3)} HIVE (max {Math.floor(hiveBalance)} tokens)
          </div>
        </div>

        {/* Right side - Current balance */}
        <div style={{
          flex: '0 0 auto',
          border: '1px solid var(--color-primary-darkest)',
          padding: '1rem',
          background: 'rgba(0, 0, 0, 0.3)',
          minWidth: '140px'
        }}>
          <div style={{
            fontSize: 'var(--font-size-base)',
            color: 'var(--color-primary-lighter)',
            marginBottom: '0.5rem',
            textTransform: 'uppercase',
            letterSpacing: '0.1em'
          }}>
            Current Balance
          </div>
          <div style={{
            fontSize: '2.5rem',
            color: 'var(--color-primary-lightest)',
            fontWeight: 'bold',
            textAlign: 'center'
          }}>
            {currentTokens}
          </div>
          <div style={{
            fontSize: 'var(--font-size-base)',
            color: 'var(--color-primary-darker)',
            textAlign: 'center',
            textTransform: 'uppercase'
          }}>
            Tokens
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleBuy}
        disabled={!isValidAmount || isProcessing}
        style={{
          border: '1px solid var(--color-primary-darkest)',
          background: isValidAmount && !isProcessing ? 'var(--color-primary-darkest)' : 'transparent',
          color: isValidAmount && !isProcessing ? 'var(--color-primary)' : 'var(--color-primary-darker)',
          padding: '0.75rem 1rem',
          cursor: isValidAmount && !isProcessing ? 'pointer' : 'not-allowed',
          fontSize: 'var(--font-size-base)',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          fontFamily: 'var(--font-family-base)',
          transition: 'all 0.2s ease',
          opacity: isValidAmount && !isProcessing ? 1 : 0.4,
        }}
      >
        {isProcessing ? 'Processing...' : 'Buy'}
      </button>

      {showHiveAuthMessage && (
        <div style={{
          fontSize: 'var(--font-size-base)',
          color: '#ff4444',
          textAlign: 'center',
          marginTop: '0.5rem',
          letterSpacing: '0.05em'
        }}>
          Please accept the transaction in HiveAuth
        </div>
      )}
    </div>
  )
}
