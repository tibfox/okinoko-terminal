import { useState, useMemo } from 'preact/hooks'
import { KeyTypes } from '@aioha/aioha'
import FloatingLabelInput from '../../common/FloatingLabelInput.jsx'
import NeonListDropdown from '../../common/NeonListDropdown.jsx'

export default function WithdrawPopup({ onClose, aioha, user }) {
  const [amount, setAmount] = useState('')
  const [asset, setAsset] = useState('HIVE')
  const [receiver, setReceiver] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showHiveAuthMessage, setShowHiveAuthMessage] = useState(false)

  const normalizedUser = useMemo(() => {
    if (!user) return 'unknown'
    const normalized = user.startsWith('hive:') ? user.slice(5) : user
    return normalized
  }, [user])

  const hiveUser = useMemo(() => {
    return `hive:${normalizedUser}`
  }, [normalizedUser])

  // The receiver for the withdrawal (defaults to the connected user)
  const effectiveReceiver = useMemo(() => {
    const trimmed = receiver.trim().toLowerCase().replace(/^@/, '')
    return trimmed || normalizedUser
  }, [receiver, normalizedUser])

  const isValidAmount = useMemo(() => {
    if (!amount) return false
    const num = parseFloat(amount)
    return !isNaN(num) && num > 0
  }, [amount])

  const handleAmountChange = (e) => {
    let val = e.target.value.replace(',', '.')
    if (val === '' || /^\d*([.]\d{0,3})?$/.test(val)) {
      setAmount(val)
    }
  }

  const handleAmountBlur = () => {
    if (amount && !isNaN(parseFloat(amount))) {
      setAmount(parseFloat(amount).toFixed(3))
    }
  }

  const handleSend = async () => {
    if (!isValidAmount || isProcessing) return

    setIsProcessing(true)

    try {
      const formattedAmount = parseFloat(amount).toFixed(3)
      const assetLowerCase = asset.toLowerCase()

      // Construct the custom_json operation for withdrawal
      const jsonData = {
        from: hiveUser,
        to: `hive:${effectiveReceiver}`,
        asset: assetLowerCase,
        net_id: 'vsc-mainnet',
        amount: formattedAmount,
      }

      const ops = [
        [
          'custom_json',
          {
            required_auths: [normalizedUser],
            required_posting_auths: [],
            id: 'vsc.withdraw',
            json: JSON.stringify(jsonData),
          },
        ],
      ]

      console.log('Sending withdrawal transaction:', ops)

      // Check if using HiveAuth
      const isHiveAuth = aioha.getCurrentProvider && aioha.getCurrentProvider() === 'hiveauth'
      if (isHiveAuth) {
        setShowHiveAuthMessage(true)
      }

      // Execute the transaction using Aioha with Active key
      const result = await aioha.signAndBroadcastTx(ops, KeyTypes.Active)

      setShowHiveAuthMessage(false)

      console.log('Transaction result:', result)

      if (result?.success) {
        // Success - close the popup
        alert(`Withdrawal successful! Transaction ID: ${result.result}\n\nYour withdrawal is being processed by the Magi network now. Please wait a moment and refresh your balance in the account data panel.`)
        onClose()
      } else {
        console.error('Transaction failed:', result?.error)
        alert(`Transaction failed: ${result?.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error sending transaction:', error)
      alert(`Error: ${error.message || 'Unknown error'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ fontSize: 'var(--font-size-base)', lineHeight: '1.5', color: 'var(--color-primary-lighter)' }}>
        Withdraw from Magi wallet @{normalizedUser} to Hive L1.
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
        <FloatingLabelInput
          type="text"
          inputMode="decimal"
          placeholder="0.000"
          label="Amount"
          value={amount}
          onChange={handleAmountChange}
          onBlur={handleAmountBlur}
          style={{
            flex: '1',
          }}
        />

        <NeonListDropdown
          options={[
            { value: 'HIVE', label: 'HIVE' },
            { value: 'HBD', label: 'HBD' },
          ]}
          value={asset}
          onChange={(val) => setAsset(val)}
          style={{ flex: '0 0 auto', width: 'auto', minWidth: '100px' }}
          buttonStyle={{
            height: '50px',
            padding: '0 32px 0 12px',
            fontSize: 'var(--font-size-base)',
            fontFamily: 'var(--font-family-base)',
          }}
          menuOffsetY="4px"
        />
      </div>

      <FloatingLabelInput
        type="text"
        placeholder={normalizedUser}
        label="Receiver (optional)"
        value={receiver}
        onChange={(e) => setReceiver(e.target.value.replace(/@/g, ''))}
        style={{ width: '100%' }}
      />

      <button
        type="button"
        onClick={handleSend}
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
        {isProcessing ? 'Processing...' : 'Send'}
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
