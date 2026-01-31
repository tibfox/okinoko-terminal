import { useState, useEffect } from 'preact/hooks'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faXmark } from '@fortawesome/free-solid-svg-icons'
import NeonSwitch from './NeonSwitch.jsx'
import { useAssetSymbols } from '../terminal/providers/NetworkTypeProvider.jsx'

/**
 * Winner prizes input component for split_prize_defined
 * Structure:
 * 1. Winners (list of addresses)
 * 2. Each winner has prizes (asset + amount/percentage)
 *
 * @param {Array} winners - Array of { address, prizes: [{ asset, isFixed, amount }] }
 * @param {Function} onChange - Callback when winners change
 */
export default function WinnerPrizesInput({ winners = [], onChange }) {
  const assetSymbols = useAssetSymbols()
  const [newWinnerAddress, setNewWinnerAddress] = useState('')

  const baseInputStyle = {
    background: 'transparent',
    border: '1px solid var(--color-primary-darkest)',
    color: 'var(--color-primary-lighter)',
    padding: '6px 8px',
  }

  // Get the mode (isFixed) for a given asset from previous winners
  const getAssetMode = (asset) => {
    for (const winner of winners) {
      const prize = winner.prizes?.find(p => p.asset === asset)
      if (prize) {
        return prize.isFixed
      }
    }
    return false // Default to percentage mode
  }

  // Validate that an asset uses consistent mode across all winners
  const validateAssetModes = () => {
    const assetModes = {} // asset -> Set of modes used

    for (const winner of winners) {
      for (const prize of winner.prizes || []) {
        if (!assetModes[prize.asset]) {
          assetModes[prize.asset] = new Set()
        }
        assetModes[prize.asset].add(prize.isFixed)
      }
    }

    // Check if any asset has mixed modes
    for (const [asset, modes] of Object.entries(assetModes)) {
      if (modes.size > 1) {
        return { valid: false, asset }
      }
    }

    return { valid: true }
  }

  const formatAmount = (value, isFixed) => {
    const num = parseFloat(value)
    if (!Number.isFinite(num)) return ''
    return isFixed ? num.toFixed(3) : num.toFixed(1)
  }

  const validateAmount = (value, isFixed) => {
    const num = parseFloat(value)
    if (!Number.isFinite(num) || num <= 0) return false
    if (isFixed) {
      return num > 0
    } else {
      return num >= 1 && num <= 100
    }
  }

  const addWinner = (e) => {
    if (e) e.preventDefault()
    const address = newWinnerAddress.trim()
    if (!address) return

    // Normalize address: @username -> hive:username, plain username -> hive:username
    let normalizedAddress = address
    if (address.startsWith('@')) {
      normalizedAddress = `hive:${address.slice(1)}`
    } else if (!address.includes(':')) {
      normalizedAddress = `hive:${address}`
    }

    // Check for duplicates
    if (winners.some(w => w.address === normalizedAddress)) return

    const newWinner = {
      address: normalizedAddress,
      prizes: []
    }

    onChange([...winners, newWinner])
    setNewWinnerAddress('')
  }

  const removeWinner = (index) => {
    onChange(winners.filter((_, i) => i !== index))
  }

  const updateWinnerAddress = (index, address) => {
    const updated = [...winners]
    updated[index] = { ...updated[index], address }
    onChange(updated)
  }

  const handleWinnerAddressBlur = (index, address) => {
    const trimmed = address.trim()
    if (!trimmed) return

    // Normalize address on blur: @username -> hive:username, plain username -> hive:username
    let normalizedAddress = trimmed
    if (trimmed.startsWith('@')) {
      normalizedAddress = `hive:${trimmed.slice(1)}`
    } else if (!trimmed.includes(':')) {
      normalizedAddress = `hive:${trimmed}`
    }

    if (normalizedAddress !== address) {
      updateWinnerAddress(index, normalizedAddress)
    }
  }

  const addPrize = (winnerIndex, asset) => {
    const updated = [...winners]
    const isFixed = getAssetMode(asset)

    updated[winnerIndex].prizes = [
      ...(updated[winnerIndex].prizes || []),
      { asset, isFixed, amount: '' }
    ]

    onChange(updated)
  }

  const removePrize = (winnerIndex, prizeIndex) => {
    const updated = [...winners]
    updated[winnerIndex].prizes = updated[winnerIndex].prizes.filter((_, i) => i !== prizeIndex)
    onChange(updated)
  }

  const updatePrize = (winnerIndex, prizeIndex, updates) => {
    const updated = [...winners]
    const oldIsFixed = updated[winnerIndex].prizes[prizeIndex].isFixed

    updated[winnerIndex].prizes[prizeIndex] = {
      ...updated[winnerIndex].prizes[prizeIndex],
      ...updates
    }

    // If mode changed, reset amount
    if (updates.isFixed !== undefined && updates.isFixed !== oldIsFixed) {
      updated[winnerIndex].prizes[prizeIndex].amount = ''
    }

    onChange(updated)
  }

  const handleAmountBlur = (winnerIndex, prizeIndex, value) => {
    const prize = winners[winnerIndex].prizes[prizeIndex]
    const num = parseFloat(value)

    if (Number.isFinite(num) && validateAmount(value, prize.isFixed)) {
      const formatted = formatAmount(value, prize.isFixed)
      updatePrize(winnerIndex, prizeIndex, { amount: formatted })
    }
  }

  const validation = validateAssetModes()

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        width: '100%',
      }}
    >
      {/* Validation warning for mixed modes */}
      {!validation.valid && (
        <div
          style={{
            padding: '8px 12px',
            border: '1px solid var(--color-warning)',
            background: 'rgba(255, 165, 0, 0.1)',
            color: 'var(--color-warning)',
            fontSize: 'var(--font-size-base)',
          }}
        >
          ⚠ Asset {validation.asset?.toUpperCase()} mixes percentage and fixed modes across winners. Each asset must use the same mode for all winners.
        </div>
      )}

      {/* Winners list */}
      {winners.length === 0 ? (
        <span
          style={{
            color: 'var(--color-primary-lighter)',
            opacity: 0.8,
            fontSize: 'var(--font-size-base)',
          }}
        >
          No winners defined yet. Add winners below.
        </span>
      ) : (
        winners.map((winner, winnerIndex) => (
          <div
            key={`winner-${winnerIndex}`}
            style={{
              border: '1px solid var(--color-primary-darkest)',
              background: 'rgba(0, 255, 255, 0.03)',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            {/* Winner header: Address and remove button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="text"
                value={winner.address}
                onChange={(e) => updateWinnerAddress(winnerIndex, e.target.value)}
                onBlur={(e) => handleWinnerAddressBlur(winnerIndex, e.target.value)}
                placeholder="hive:username or @username"
                style={{
                  ...baseInputStyle,
                  flex: 1,
                }}
              />
              <button
                onClick={() => removeWinner(winnerIndex)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-primary-lighter)',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  opacity: 0.7,
                }}
                title="Remove winner"
              >
                <FontAwesomeIcon icon={faXmark} style={
                    {fontSize:'0.9rem'}}/>
              </button>
            </div>

            {/* Prizes for this winner */}
            <div
              style={{
                paddingLeft: '12px',
                borderLeft: '2px solid var(--color-primary-darkest)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {winner.prizes?.length === 0 ? (
                <span style={{ color: 'var(--color-primary-lighter)', opacity: 0.7, fontSize: 'var(--font-size-base)' }}>
                  No prizes defined
                </span>
              ) : (
                winner.prizes?.map((prize, prizeIndex) => (
                  <div
                    key={`prize-${winnerIndex}-${prizeIndex}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flexWrap: 'wrap',
                    }}
                  >
                    {/* Asset dropdown */}
                    <select
                      className="vsc-input"
                      value={prize.asset}
                      onChange={(e) => updatePrize(winnerIndex, prizeIndex, { asset: e.target.value })}
                      style={{
                        ...baseInputStyle,
                        width: '90px',
                        cursor: 'pointer',
                        appearance: 'none',
                        backgroundColor: 'black',
                        padding: '0 20px 0 8px',
                        backgroundImage:
                          'linear-gradient(45deg, transparent 50%, var(--color-primary-lighter) 50%), linear-gradient(135deg, var(--color-primary-lighter) 50%, transparent 50%)',
                        backgroundPosition:
                          'calc(100% - 12px) center, calc(100% - 7px) center',
                        backgroundSize: '5px 5px, 5px 5px',
                        backgroundRepeat: 'no-repeat',
                      }}
                    >
                      <option value="hive">{assetSymbols.HIVE}</option>
                      <option value="hbd">{assetSymbols.HBD}</option>
                    </select>

                    {/* Amount/Percentage switch */}
                    <div style={{ minWidth: '140px' }}>
                      <NeonSwitch
                        name={prize.isFixed ? 'Fixed' : 'Percentage'}
                        checked={prize.isFixed}
                        onChange={(val) => updatePrize(winnerIndex, prizeIndex, { isFixed: val })}
                        beep={false}
                      />
                    </div>

                    {/* Amount input */}
                    <input
                      type="number"
                      value={prize.amount}
                      onChange={(e) => updatePrize(winnerIndex, prizeIndex, { amount: e.target.value })}
                      onBlur={(e) => handleAmountBlur(winnerIndex, prizeIndex, e.target.value)}
                      placeholder={prize.isFixed ? '0.000' : '0.0'}
                      step={prize.isFixed ? '0.001' : '0.1'}
                      style={{
                        ...baseInputStyle,
                        width: '100px',
                      }}
                    />
                    <span style={{ color: 'var(--color-primary-lighter)', fontSize: 'var(--font-size-base)' }}>
                      {prize.isFixed ? prize.asset.toUpperCase() : '%'}
                    </span>

                    {/* Remove prize button */}
                    <button
                      onClick={() => removePrize(winnerIndex, prizeIndex)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-primary-lighter)',
                        cursor: 'pointer',
                        padding: '2px 6px',
                        opacity: 0.7,
                      }}
                      title="Remove prize"
                    >
                      <FontAwesomeIcon icon={faXmark} style={
                    {fontSize:'0.9rem'}}/>
                    </button>
                  </div>
                ))
              )}

              {/* Add prize button */}
              {(() => {
                const usedAssets = new Set(winner.prizes?.map(p => p.asset) || [])
                const availableAssets = ['hive', 'hbd'].filter(a => !usedAssets.has(a))
                const canAddPrize = availableAssets.length > 0

                return (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {canAddPrize ? (
                      availableAssets.map(asset => (
                        <button
                          key={asset}
                          type="button"
                          onClick={() => addPrize(winnerIndex, asset)}
                          style={{
                            background: 'transparent',
                            border: '1px solid var(--color-primary-darker)',
                            color: 'var(--color-primary)',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            fontSize: 'var(--font-size-base)',
                          }}
                          title={`Add ${asset.toUpperCase()} prize`}
                        >
                          <FontAwesomeIcon icon={faPlus} style={
                    {fontSize:'0.9rem'}}/> {asset.toUpperCase()}
                        </button>
                      ))
                    ) : (
                      <span style={{ color: 'var(--color-primary-lighter)', opacity: 0.7, fontSize: 'var(--font-size-base)' }}>
                        All assets added
                      </span>
                    )}
                  </div>
                )
              })()}
            </div>
          </div>
        ))
      )}

      {/* Add new winner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px',
          border: '1px dashed var(--color-primary-darkest)',
        }}
      >
        <input
          type="text"
          value={newWinnerAddress}
          onChange={(e) => setNewWinnerAddress(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addWinner()
            }
          }}
          placeholder="hive:username or @username"
          style={{
            ...baseInputStyle,
            flex: 1,
          }}
        />
        <button
          type="button"
          onClick={addWinner}
          disabled={!newWinnerAddress.trim()}
          style={{
            background: 'transparent',
            border: '1px solid var(--color-primary-darker)',
            color: newWinnerAddress.trim() ? 'var(--color-primary)' : 'gray',
            cursor: newWinnerAddress.trim() ? 'pointer' : 'not-allowed',
            padding: '6px 10px',
            fontSize: 'var(--font-size-base)',
          }}
          title="Add winner"
        >
          <FontAwesomeIcon icon={faPlus} style={
                    {fontSize:'0.9rem'}}/> Add Winner
        </button>
      </div>
    </div>
  )
}
