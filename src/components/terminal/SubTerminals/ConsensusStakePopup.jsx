import { useState, useMemo } from 'preact/hooks'
import { KeyTypes } from '@aioha/aioha'
import FloatingLabelInput from '../../common/FloatingLabelInput.jsx'
import FormField from '../../common/FormField.jsx'
import NeonSwitch from '../../common/NeonSwitch.jsx'
const formatBalance = (raw) => {
  if (!raw) return '0.000'
  return (Number(raw) / 1000).toFixed(3)
}

export default function ConsensusStakePopup({ onClose, aioha, user, balances, refresh }) {
  const [isUnstake, setIsUnstake] = useState(false)
  const [amount, setAmount] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)

  const normalizedUser = useMemo(() => {
    if (!user) return ''
    return user.startsWith('hive:') ? user.slice(5) : user
  }, [user])

  const hiveBalance = balances ? formatBalance(balances.hive) : '0.000'
  const consensusBalance = balances ? formatBalance(balances.hive_consensus) : '0.000'
  const availableBalance = isUnstake ? consensusBalance : hiveBalance

  const isValidAmount = useMemo(() => {
    if (!amount) return false
    const num = parseFloat(amount)
    return !isNaN(num) && num > 0 && num <= parseFloat(availableBalance)
  }, [amount, availableBalance])

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

  const handleMax = () => {
    setAmount(availableBalance)
  }

  const handleSubmit = async () => {
    if (!isValidAmount || isProcessing) return
    setIsProcessing(true)
    setError(null)

    try {
      const formattedAmount = parseFloat(amount).toFixed(3)
      const opId = isUnstake ? 'vsc.consensus_unstake' : 'vsc.consensus_stake'

      const account = `hive:${normalizedUser}`
      const payload = JSON.stringify({
        net_id: 'vsc-testnet',
        from: account,
        to: account,
        amount: formattedAmount,
        asset: 'hive',
        memo: '',
      })

      const ops = [
        [
          'custom_json',
          {
            required_auths: [normalizedUser],
            required_posting_auths: [],
            id: opId,
            json: payload,
          },
        ],
      ]

      const result = await aioha.signAndBroadcastTx(ops, KeyTypes.Active)

      if (result?.success) {
        refresh({ force: true, withLoading: true })
        onClose()
      } else {
        setError(result?.error || 'Transaction failed')
      }
    } catch (err) {
      setError(err.message || 'Unknown error')
    } finally {
      setIsProcessing(false)
    }
  }

  const canSubmit = isValidAmount && !isProcessing

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <FormField label="Action" hintText="Stake HIVE for consensus (node operators). Unstaking takes ~5 election epochs (~1 day).">
        {() => (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: !isUnstake ? 'var(--color-primary)' : 'var(--color-primary-darker)', fontFamily: 'var(--font-family-base)', fontSize: 'var(--font-size-base)', userSelect: 'none' }}>Stake</span>
            <NeonSwitch checked={isUnstake} onChange={setIsUnstake} />
            <span style={{ color: isUnstake ? 'var(--color-primary)' : 'var(--color-primary-darker)', fontFamily: 'var(--font-family-base)', fontSize: 'var(--font-size-base)', userSelect: 'none' }}>Unstake</span>
          </div>
        )}
      </FormField>

      <div style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-primary-darker)' }}>
        Available: {availableBalance} {isUnstake ? 'cHIVE' : 'HIVE'}
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
          style={{ flex: 1 }}
        />
        <button
          type="button"
          onClick={handleMax}
          style={{
            border: '1px solid var(--color-primary-darker)',
            background: 'transparent',
            color: 'var(--color-primary)',
            padding: '0.75rem 0.75rem',
            cursor: 'pointer',
            fontSize: 'var(--font-size-base)',
            fontFamily: 'var(--font-family-base)',
            letterSpacing: '0.1em',
          }}
        >
          MAX
        </button>
      </div>

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
        }}
      >
        {isProcessing ? 'Processing...' : isUnstake ? 'Unstake cHIVE' : 'Stake HIVE'}
      </button>
    </div>
  )
}
