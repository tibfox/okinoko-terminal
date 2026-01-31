import { useState, useEffect } from 'preact/hooks'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faXmark } from '@fortawesome/free-solid-svg-icons'
import { useAssetSymbols } from '../terminal/providers/NetworkTypeProvider.jsx'
// import NeonSwitch from './NeonSwitch.jsx' // Commented out - not needed in percentage-only mode

/**
 * Winner shares input component for prize distribution
 * Two-level structure:
 * 1. Asset groups (asset + mode)
 * 2. Each group has amounts/percentages for each winner
 *
 * @param {Array} assetGroups - Array of { asset, isFixed, amounts: [] }
 * @param {Function} onChange - Callback when groups change
 * @param {Number} winnerCount - Expected number of winners (for validation)
 */
export default function WinnerSharesInput({ assetGroups = [], onChange, winnerCount = 0 }) {
  const assetSymbols = useAssetSymbols()
  const [newGroup, setNewGroup] = useState({
    asset: 'hive',
    // isFixed: false, // Commented out - always use percentage mode
  })

  // Sync amount slots with winner count changes
  useEffect(() => {
    if (winnerCount <= 0 || assetGroups.length === 0) return

    let needsUpdate = false
    const updated = assetGroups.map(group => {
      const currentLength = group.amounts.length

      if (currentLength === winnerCount) {
        return group
      }

      needsUpdate = true

      if (currentLength < winnerCount) {
        // Add empty slots
        return {
          ...group,
          amounts: [...group.amounts, ...Array(winnerCount - currentLength).fill('')]
        }
      } else {
        // Remove extra slots
        return {
          ...group,
          amounts: group.amounts.slice(0, winnerCount)
        }
      }
    })

    if (needsUpdate) {
      onChange(updated)
    }
  }, [winnerCount])

  const baseInputStyle = {
    background: 'transparent',
    border: '1px solid var(--color-primary-darkest)',
    color: 'var(--color-primary-lighter)',
    padding: '6px 8px',
  }

  const formatAmount = (value) => {
    const num = parseFloat(value)
    if (!Number.isFinite(num)) return ''
    // Always use percentage mode (1 decimal place)
    return num.toFixed(1)
    // if (isFixed) {
    //   return num.toFixed(3)
    // } else {
    //   return num.toFixed(1)
    // }
  }

  const validateAmount = (value) => {
    const num = parseFloat(value)
    if (!Number.isFinite(num) || num <= 0) return false
    // Always use percentage mode (1-100)
    return num >= 1 && num <= 100
    // if (!isFixed) {
    //   return num >= 1 && num <= 100
    // } else {
    //   return num > 0
    // }
  }

  const addAssetGroup = (e) => {
    if (e) e.preventDefault()
    const numSlots = winnerCount > 0 ? winnerCount : 1
    const newAssetGroup = {
      asset: newGroup.asset,
      isFixed: false, // Always false (percentage mode)
      amounts: Array(numSlots).fill(''),
    }
    onChange([...assetGroups, newAssetGroup])
    setNewGroup({ asset: 'hive' }) // Removed isFixed
  }

  const removeAssetGroup = (index) => {
    onChange(assetGroups.filter((_, i) => i !== index))
  }

  const updateAssetGroup = (index, updates) => {
    const updated = [...assetGroups]
    // const oldIsFixed = updated[index].isFixed // Commented out - no mode switching

    updated[index] = { ...updated[index], ...updates }

    // Commented out - no mode switching in percentage-only mode
    // // If mode changed, reset all amounts
    // if (updates.isFixed !== undefined && updates.isFixed !== oldIsFixed) {
    //   updated[index].amounts = Array(updated[index].amounts.length).fill('')
    // }

    onChange(updated)
  }

  const updateAmount = (groupIndex, amountIndex, value) => {
    const updated = [...assetGroups]
    const newAmounts = [...updated[groupIndex].amounts]
    newAmounts[amountIndex] = value
    updated[groupIndex] = { ...updated[groupIndex], amounts: newAmounts }
    onChange(updated)
  }

  const handleAmountBlur = (groupIndex, amountIndex, value) => {
    const num = parseFloat(value)
    if (Number.isFinite(num) && validateAmount(value)) {
      const formatted = formatAmount(value)
      updateAmount(groupIndex, amountIndex, formatted)
    }
  }

  const renderAssetGroup = (group, groupIndex) => {
    const { asset, /* isFixed, */ amounts } = group // isFixed commented out - always percentage mode
    const isFixed = false // Always use percentage mode

    // Get list of assets already used in other groups
    const usedAssets = assetGroups
      .map((g, idx) => idx !== groupIndex ? g.asset : null)
      .filter(Boolean)

    return (
      <div
        key={`group-${groupIndex}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '8px',
          border: '1px solid var(--color-primary-darkest)',
          background: 'rgba(0, 255, 255, 0.03)',
        }}
      >
        {/* Asset header: Asset dropdown, Remove button (Mode switch removed - always percentage) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <select
            className="vsc-input"
            value={asset}
            onChange={(e) => updateAssetGroup(groupIndex, { asset: e.target.value })}
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
              color: 'var(--color-primary-lighter)',
              border: '1px solid var(--color-primary-darkest)',
            }}
          >
            <option value="hive" disabled={usedAssets.includes('hive')}>{assetSymbols.HIVE}</option>
            <option value="hbd" disabled={usedAssets.includes('hbd')}>{assetSymbols.HBD}</option>
          </select>

          {/* Commented out - always use percentage mode */}
          {/* <div style={{ minWidth: '140px' }}>
            <NeonSwitch
              name={isFixed ? 'Fixed' : 'Percentage'}
              checked={isFixed}
              onChange={(val) => updateAssetGroup(groupIndex, { isFixed: val })}
              beep={false}
            />
          </div> */}

          <button
            onClick={() => removeAssetGroup(groupIndex)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-primary-lighter)',
              cursor: 'pointer',
              padding: '4px 8px',
              opacity: 0.7,
              marginLeft: 'auto',
            }}
            title="Remove asset group"
          >
            <FontAwesomeIcon icon={faXmark} style={
                    {fontSize:'0.9rem'}}/>
          </button>
        </div>

        {/* Amounts list */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            paddingLeft: '12px',
            borderLeft: '2px solid var(--color-primary-darkest)',
          }}
        >
          {amounts.map((amount, amountIndex) => (
            <div
              key={`amount-${groupIndex}-${amountIndex}`}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <span
                style={{
                  color: 'var(--color-primary-lighter)',
                  fontSize: 'var(--font-size-base)',
                  minWidth: '60px',
                }}
              >
                Winner {amountIndex + 1}:
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => updateAmount(groupIndex, amountIndex, e.target.value)}
                onBlur={(e) => handleAmountBlur(groupIndex, amountIndex, e.target.value)}
                placeholder="0.0"
                step="0.1"
                style={{
                  ...baseInputStyle,
                  width: '100px',
                }}
              />
              <span style={{ color: 'var(--color-primary-lighter)', fontSize: 'var(--font-size-base)' }}>
                %
              </span>
            </div>
          ))}
        </div>

        {/* Summary for this group */}
        {!isFixed && amounts.length > 0 && (
          <div style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-primary-lighter)', opacity: 0.8 }}>
            {(() => {
              const total = amounts.reduce((sum, amt) => sum + (parseFloat(amt) || 0), 0)
              const isValid = Math.abs(total - 100) < 0.1
              return (
                <span style={{ color: isValid ? 'var(--color-primary-lighter)' : 'var(--color-warning)' }}>
                  {isValid ? '✓' : '⚠'} Total: {total.toFixed(1)}% {!isValid && '(should be 100%)'}
                </span>
              )
            })()}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        width: '100%',
      }}
    >
      {/* Existing asset groups */}
      {assetGroups.length === 0 ? (
        <span
          style={{
            color: 'var(--color-primary-lighter)',
            opacity: 0.8,
            fontSize: 'var(--font-size-base)',
          }}
        >
          No asset distributions defined. Add asset groups below or leave empty for equal distribution.
        </span>
      ) : (
        assetGroups.map((group, idx) => renderAssetGroup(group, idx))
      )}

      {/* Add new asset group */}
      {(() => {
        const usedAssets = assetGroups.map(g => g.asset)
        const availableAssets = ['hive', 'hbd'].filter(a => !usedAssets.includes(a))
        const canAddGroup = availableAssets.length > 0

        // Auto-select first available asset if current selection is used
        if (canAddGroup && usedAssets.includes(newGroup.asset)) {
          setNewGroup((prev) => ({ ...prev, asset: availableAssets[0] }))
        }

        return (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px',
              border: '1px dashed var(--color-primary-darkest)',
              flexWrap: 'wrap',
              opacity: canAddGroup ? 1 : 0.5,
            }}
          >
            <select
              className="vsc-input"
              value={newGroup.asset}
              onChange={(e) => setNewGroup((prev) => ({ ...prev, asset: e.target.value }))}
              disabled={!canAddGroup}
              style={{
                ...baseInputStyle,
                width: '90px',
                cursor: canAddGroup ? 'pointer' : 'not-allowed',
                appearance: 'none',
                backgroundColor: 'black',
                padding: '0 20px 0 8px',
                backgroundImage:
                  'linear-gradient(45deg, transparent 50%, var(--color-primary-lighter) 50%), linear-gradient(135deg, var(--color-primary-lighter) 50%, transparent 50%)',
                backgroundPosition:
                  'calc(100% - 12px) center, calc(100% - 7px) center',
                backgroundSize: '5px 5px, 5px 5px',
                backgroundRepeat: 'no-repeat',
                color: 'var(--color-primary-lighter)',
                border: '1px solid var(--color-primary-darkest)',
              }}
            >
              <option value="hive" disabled={usedAssets.includes('hive')}>{assetSymbols.HIVE}</option>
              <option value="hbd" disabled={usedAssets.includes('hbd')}>{assetSymbols.HBD}</option>
            </select>

            {/* Commented out - always use percentage mode */}
            {/* <div style={{ minWidth: '140px' }}>
              <NeonSwitch
                name={newGroup.isFixed ? 'Fixed' : 'Percentage'}
                checked={newGroup.isFixed}
                onChange={(val) => setNewGroup((prev) => ({ ...prev, isFixed: val }))}
                beep={false}
              />
            </div> */}

            <button
              type="button"
              onClick={(e) => addAssetGroup(e)}
              disabled={!canAddGroup}
              style={{
                background: 'transparent',
                border: '1px solid var(--color-primary-darker)',
                color: canAddGroup ? 'var(--color-primary)' : 'gray',
                cursor: canAddGroup ? 'pointer' : 'not-allowed',
                padding: '6px 10px',
                fontSize: 'var(--font-size-base)',
                marginLeft: 'auto',
              }}
              title={canAddGroup ? 'Add asset group' : 'All assets already added'}
            >
              <FontAwesomeIcon icon={faPlus} style={
                    {fontSize:'0.9rem'}}/> Add Asset Group
            </button>

            {!canAddGroup && (
              <span style={{ color: 'var(--color-primary-lighter)', opacity: 0.7, fontSize: 'var(--font-size-base)' }}>
                All assets ({assetSymbols.HIVE} & {assetSymbols.HBD}) already added
              </span>
            )}
          </div>
        )
      })()}

      {/* Validation warning */}
      {winnerCount > 0 && assetGroups.some(g => g.amounts.length !== winnerCount) && (
        <div
          style={{
            fontSize: 'var(--font-size-base)',
            color: 'var(--color-warning)',
            padding: '6px',
            border: '1px solid var(--color-warning)',
            background: 'rgba(255, 165, 0, 0.1)',
          }}
        >
          ⚠ Some asset groups have {assetGroups.find(g => g.amounts.length !== winnerCount)?.amounts.length || 0} winner slots, but winner count is {winnerCount}. They should match.
        </div>
      )}
    </div>
  )
}
