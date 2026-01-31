import { useMemo } from 'preact/hooks'
import FloatingLabelInput from './FloatingLabelInput.jsx'
import NeonListDropdown from './NeonListDropdown.jsx'
import { useAssetSymbols } from '../terminal/providers/NetworkTypeProvider.jsx'

/**
 * Asset amount input component with asset dropdown and balance display
 *
 * @param {string} label - Label for the input field
 * @param {string} amount - Current amount value
 * @param {function} onAmountChange - Callback when amount changes
 * @param {string} asset - Current asset ('HIVE' or 'HBD')
 * @param {function} onAssetChange - Callback when asset changes
 * @param {object} balances - Object with { hive, hbd } balances
 * @param {boolean} hideAssetDropdown - If true, hides the asset dropdown
 * @param {object} style - Additional styles for the container
 */
export default function AssetAmountInput({
  label = 'Amount',
  amount,
  onAmountChange,
  asset = 'HIVE',
  onAssetChange,
  balances = {},
  hideAssetDropdown = false,
  style = {},
}) {
  const assetSymbols = useAssetSymbols()

  const currentBalance = useMemo(() => {
    if (asset === 'HIVE') return balances.hive || 0
    if (asset === 'hbd_savings' || asset === 'tbd_savings') return balances.hbd_savings || 0
    return balances.hbd || 0
  }, [asset, balances])

  // Display label for asset (hbd_savings -> "sHBD" or "sTBD" for balance display)
  const assetDisplayLabel = useMemo(() => {
    if (asset === 'hbd_savings' || asset === 'tbd_savings') return assetSymbols.sHBD
    if (asset === 'HBD' || asset === 'TBD') return assetSymbols.HBD
    if (asset === 'HIVE') return assetSymbols.HIVE
    return asset
  }, [asset, assetSymbols])

  const exceedsBalance = useMemo(() => {
    if (!amount) return false
    const num = parseFloat(amount)
    return !isNaN(num) && num > currentBalance
  }, [amount, currentBalance])

  const handleAmountChange = (e) => {
    let val = e.target.value
    // Convert commas to dots for decimal separator
    val = val.replace(/,/g, '.')
    // Allow only digits and dots
    val = val.replace(/[^0-9.]/g, '')
    // Only allow one decimal point
    const parts = val.split('.')
    if (parts.length > 2) {
      val = parts[0] + '.' + parts.slice(1).join('')
    }
    onAmountChange(val)
  }

  const handleAmountBlur = (e) => {
    const val = parseFloat(String(e.target.value).replace(',', '.'))
    if (!isNaN(val) && val > 0) {
      onAmountChange(val.toFixed(3))
    }
  }

  const baseInputStyle = {
    background: 'transparent',
    border: '1px solid var(--color-primary-darkest)',
    color: 'var(--color-primary-lighter)',
    padding: '6px 8px',
    fontFamily: 'var(--font-family-base)',
    fontSize: 'var(--font-size-base)',
  }

  return (
    <div style={style}>
      <div
        style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <FloatingLabelInput
          label={label}
          type="text"
          inputMode="decimal"
          placeholder="0.000"
          value={amount}
          onChange={handleAmountChange}
          onBlur={handleAmountBlur}
          style={{
            flex: '0 0 50%',
            borderColor: exceedsBalance ? 'red' : 'var(--color-primary-darkest)',
            boxShadow: exceedsBalance ? '0 0 8px red' : 'none',
          }}
        />

        {hideAssetDropdown ? (
          <div
            style={{
              ...baseInputStyle,
              flex: '0 0 auto',
              height: '50px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 12px',
              color: 'var(--color-primary-lighter)',
            }}
          >
            {assetDisplayLabel}
          </div>
        ) : (
          <NeonListDropdown
            options={[
              { value: 'HIVE', label: assetSymbols.HIVE },
              { value: 'HBD', label: assetSymbols.HBD },
              { value: 'hbd_savings', label: assetSymbols.stakedHBD },
            ]}
            value={asset}
            onChange={(val) => onAssetChange?.(val)}
            style={{ flex: '0 0 auto', width: 'auto', minWidth: '120px' }}
            buttonStyle={{
              height: '50px',
              padding: '0 32px 0 12px',
              fontSize: 'var(--font-size-base)',
              fontFamily: 'var(--font-family-base)',
            }}
            menuOffsetY="4px"
          />
        )}

        <span
          style={{
            flex: '0 0 auto',
            fontSize: 'var(--font-size-base)',
            fontFamily: 'var(--font-family-base)',
            color: exceedsBalance ? 'red' : 'var(--color-primary-lighter)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            lineHeight: 1.2,
          }}
        >
          <span>{currentBalance.toFixed(3)}</span>
          <span>{assetDisplayLabel}</span>
        </span>
      </div>
    </div>
  )
}
