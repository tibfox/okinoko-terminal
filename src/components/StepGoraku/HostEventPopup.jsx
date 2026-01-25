import { useState, useMemo } from 'preact/hooks'
import { KeyTypes } from '@aioha/aioha'
import FloatingLabelInput from '../common/FloatingLabelInput.jsx'
import FormField from '../common/FormField.jsx'
import contractsCfg from '../../data/contracts'

// Get the Goraku contract config
const gorakuContract = contractsCfg.contracts.find(c => c.vscId === 'vsc1PLACEHOLDER_GAMES2')
const hostEventFn = gorakuContract?.functions?.find(f => f.name === 'host_event')

// Get available games (functions with parse === 'game')
const AVAILABLE_GAMES = gorakuContract?.functions
  ?.filter(f => f.parse === 'game')
  ?.map(f => ({ id: f.name, name: f.friendlyName })) || []

// Get parameter configs from contract
const getParamConfig = (paramName) => hostEventFn?.parameters?.find(p => p.payloadName === paramName) || {}
const nameConfig = getParamConfig('name')
const burnConfig = getParamConfig('burn_percent')
const durationConfig = getParamConfig('duration_days')
const urlConfig = getParamConfig('event_url')
const gamesConfig = getParamConfig('games')
const prizeConfig = getParamConfig('vscIntent')

// URL validation helper
const isValidUrl = (val) => {
  if (!val) return true // Empty is valid (optional field)
  try {
    const url = new URL(val)
    return !!url.protocol && !!url.host
  } catch {
    return false
  }
}

// Format amount to 3 decimals
const formatThreeDecimals = (val) => {
  const num = parseFloat(val)
  if (isNaN(num)) return ''
  return num.toFixed(3)
}

export default function HostEventPopup({ onClose, aioha, user, hiveBalance = 0 }) {
  const [name, setName] = useState('')
  const [burnPercent, setBurnPercent] = useState('0')
  const [eventUrl, setEventUrl] = useState('')
  const [amount, setAmount] = useState('')
  const [duration, setDuration] = useState('7')
  const [selectedGames, setSelectedGames] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [showHiveAuthMessage, setShowHiveAuthMessage] = useState(false)

  const normalizedUser = useMemo(() => {
    if (!user) return 'unknown'
    return user.startsWith('hive:') ? user.slice(5) : user
  }, [user])

  // Validation using contract config
  const maxNameLength = nameConfig.maxLength || 60
  const burnMin = burnConfig.min ?? 0
  const burnMax = burnConfig.max ?? 50
  const durationMin = durationConfig.min ?? 1
  const durationMax = durationConfig.max ?? 30

  const isNameValid = name.length > 0 && name.length <= maxNameLength
  const isBurnValid = (() => {
    const num = parseInt(burnPercent, 10)
    return !isNaN(num) && num >= burnMin && num <= burnMax
  })()
  const isUrlValid = isValidUrl(eventUrl)
  const isAmountValid = (() => {
    if (!amount) return false
    const num = parseFloat(amount)
    return !isNaN(num) && num > 0 && num <= hiveBalance
  })()
  const isDurationValid = (() => {
    const num = parseInt(duration, 10)
    return !isNaN(num) && num >= durationMin && num <= durationMax
  })()
  const isGamesValid = selectedGames.length > 0

  const exceedsBalance = (() => {
    if (!amount) return false
    const num = parseFloat(amount)
    return !isNaN(num) && num > hiveBalance
  })()

  const isFormValid = isNameValid && isBurnValid && isUrlValid && isAmountValid && isDurationValid && isGamesValid

  const handleNameChange = (e) => {
    const val = e.target.value.slice(0, maxNameLength)
    setName(val)
  }

  const handleBurnChange = (e) => {
    let val = e.target.value.replace(/[^0-9]/g, '')
    if (val !== '') {
      const num = parseInt(val, 10)
      if (num > burnMax) val = String(burnMax)
    }
    setBurnPercent(val)
  }

  const handleAmountChange = (e) => {
    let val = e.target.value.replace(',', '.')
    if (/^\d*(\.\d{0,3})?$/.test(val)) {
      setAmount(val)
    }
  }

  const handleAmountBlur = () => {
    if (amount) {
      setAmount(formatThreeDecimals(amount))
    }
  }

  const handleDurationChange = (e) => {
    let val = e.target.value.replace(/[^0-9]/g, '')
    if (val !== '') {
      const num = parseInt(val, 10)
      if (num > durationMax) val = String(durationMax)
    }
    setDuration(val)
  }

  const toggleGame = (gameId) => {
    setSelectedGames((prev) =>
      prev.includes(gameId)
        ? prev.filter((id) => id !== gameId)
        : [...prev, gameId]
    )
  }

  const handleCreate = async () => {
    if (!isFormValid || isProcessing) return

    setIsProcessing(true)

    try {
      const ops = [
        [
          'custom_json',
          {
            required_auths: [],
            required_posting_auths: [normalizedUser],
            id: 'vsc.tx',
            json: JSON.stringify({
              action: 'host_event',
              contract: gorakuContract?.vscId,
              name,
              burn_percent: parseInt(burnPercent, 10),
              event_url: eventUrl || null,
              prize_pool: parseFloat(amount),
              duration_days: parseInt(duration, 10),
              games: selectedGames,
            }),
          },
        ],
      ]

      console.log('Sending host event transaction:', ops)

      const isHiveAuth = aioha.getCurrentProvider && aioha.getCurrentProvider() === 'hiveauth'
      if (isHiveAuth) {
        setShowHiveAuthMessage(true)
      }

      const result = await aioha.signAndBroadcastTx(ops, KeyTypes.Posting)

      setShowHiveAuthMessage(false)

      console.log('Transaction result:', result)

      if (result?.success) {
        alert(`Event created successfully! Transaction ID: ${result.result}`)
        onClose()
      } else {
        console.error('Transaction failed:', result?.error)
        alert(`Transaction failed: ${result?.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error creating event:', error)
      alert(`Error: ${error.message || 'Unknown error'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const smallInputStyle = {
    background: 'transparent',
    border: '1px solid var(--color-primary-darkest)',
    color: 'var(--color-primary-lighter)',
    padding: '8px 12px',
    fontSize: 'var(--font-size-base)',
    fontFamily: 'var(--font-family-base)',
    width: '80px',
    textAlign: 'right',
  }

  return (
    <div className="neon-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingTop: '1rem', maxHeight: '60vh', overflowY: 'auto' }}>
      {/* Event Name */}
      <FormField
        label={nameConfig.name || 'Event Name'}
        mandatory={nameConfig.mandatory}
        hintText={nameConfig.hintText}
      >
        {({ labelText }) => (
          <FloatingLabelInput
            label={labelText}
            type="text"
            placeholder="My Awesome Event"
            value={name}
            onChange={handleNameChange}
            style={{ width: '100%' }}
          />
        )}
      </FormField>

      {/* Burn Percentage & Duration in a row */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '0', flexWrap: 'wrap' }}>
        <FormField
          label={burnConfig.name || 'Burn Percent'}
          mandatory={burnConfig.mandatory}
          hintText={burnConfig.hintText}
          style={{ flex: '1 1 120px', marginBottom: 0 }}
        >
          {({ labelText }) => (
            <FloatingLabelInput
              label={labelText}
              type="text"
              inputMode="numeric"
              value={burnPercent}
              onChange={handleBurnChange}
              style={{ width: '100%' }}
            />
          )}
        </FormField>

        <FormField
          label={durationConfig.name || 'Duration (days)'}
          mandatory={durationConfig.mandatory}
          hintText={durationConfig.hintText}
          style={{ flex: '1 1 120px', marginBottom: 0 }}
        >
          {({ labelText }) => (
            <FloatingLabelInput
              label={labelText}
              type="text"
              inputMode="numeric"
              value={duration}
              onChange={handleDurationChange}
              style={{ width: '100%' }}
            />
          )}
        </FormField>
      </div>

      {/* Prize Pool Amount */}
      <FormField
        label={prizeConfig.name || 'Prize Pool'}
        mandatory={prizeConfig.mandatory}
        hintText={prizeConfig.hintText}
      >
        {({ labelText }) => (
          <FloatingLabelInput
            label={labelText}
            type="text"
            inputMode="decimal"
            placeholder="0.000"
            value={amount}
            onChange={handleAmountChange}
            onBlur={handleAmountBlur}
            style={{ width: '100%' }}
          />
        )}
      </FormField>
      <div style={{
        fontSize: '1.65rem',
        color: exceedsBalance ? '#ff4444' : 'var(--color-primary-darker)',
        marginTop: '-8px',
        marginBottom: '0.75rem',
      }}>
        Available: {hiveBalance.toFixed(3)} HIVE
      </div>

      {/* Event URL */}
      <FormField
        label={urlConfig.name || 'Event URL'}
        mandatory={urlConfig.mandatory}
        hintText={urlConfig.hintText}
      >
        {({ labelText }) => (
          <FloatingLabelInput
            label={labelText}
            type="text"
            placeholder="https://example.com/event"
            value={eventUrl}
            onChange={(e) => setEventUrl(e.target.value)}
            style={{
              width: '100%',
              borderColor: eventUrl && !isUrlValid ? '#ff4444' : undefined,
            }}
          />
        )}
      </FormField>

      {/* Games Selection */}
      <FormField
        label={gamesConfig.name || 'Games'}
        mandatory={gamesConfig.mandatory}
        hintText={gamesConfig.hintText}
      >
        {({ labelText }) => (
          <div>
            <div style={{
              fontSize: 'var(--font-size-base)',
              color: 'var(--color-primary-lighter)',
              marginBottom: '0.5rem',
            }}>
              {labelText}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {AVAILABLE_GAMES.map((game) => {
                const isSelected = selectedGames.includes(game.id)
                return (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() => toggleGame(game.id)}
                    style={{
                      padding: '8px 16px',
                      border: '1px solid var(--color-primary-darkest)',
                      background: isSelected ? 'var(--color-primary-darker)' : 'transparent',
                      color: isSelected ? 'black' : 'var(--color-primary-lighter)',
                      cursor: 'pointer',
                      fontSize: 'var(--font-size-base)',
                      fontFamily: 'var(--font-family-base)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {game.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </FormField>

      {/* Create Button */}
      <button
        type="button"
        onClick={handleCreate}
        disabled={!isFormValid || isProcessing}
        style={{
          border: '1px solid var(--color-primary-darkest)',
          background: isFormValid && !isProcessing ? 'var(--color-primary-darkest)' : 'transparent',
          color: isFormValid && !isProcessing ? 'var(--color-primary)' : 'var(--color-primary-darker)',
          padding: '0.75rem 1rem',
          cursor: isFormValid && !isProcessing ? 'pointer' : 'not-allowed',
          fontSize: 'var(--font-size-base)',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          fontFamily: 'var(--font-family-base)',
          transition: 'all 0.2s ease',
          opacity: isFormValid && !isProcessing ? 1 : 0.4,
          marginTop: '0.5rem',
        }}
      >
        {isProcessing ? 'Creating...' : 'Create Event'}
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
