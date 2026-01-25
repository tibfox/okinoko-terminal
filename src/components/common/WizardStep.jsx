/**
 * Renders the fields for a single wizard step
 */
export default function WizardStep({
  step,
  parameters = [],
  params = {},
  renderField,
  isReviewStep = false,
  showValidationErrors = false,
  renderHeader,
  isMobile = false,
}) {
  if (!step) return null

  // Review step shows a summary of all values
  if (isReviewStep) {
    // Check if poll mode is active
    const isPollMode = params['Poll Mode'] === true || params['Poll Mode'] === 'true' ||
      params['forcePoll'] === true || params['forcePoll'] === 'true'

    return (
      <div className="wizard-step wizard-step--review">
        <div className="wizard-step__header">
          <h3>{step.title}</h3>
          {step.description && !isMobile && <p>{step.description}</p>}
        </div>
        <div className="wizard-step__content wizard-step__review-content neon-scroll">
          {parameters.length === 0 ? (
            <p style={{ opacity: 0.7 }}>No settings to review.</p>
          ) : (
            <div className="wizard-review-grid">
              {parameters.map((param) => {
                const value = params[param.name] ?? params[param.payloadName]
                const displayValue = formatReviewValue(param, value, params)

                // Skip empty optional fields, but always show options in poll mode
                const isOptionsField = param.payloadName === 'options'
                if (!param.mandatory && (value === undefined || value === null || value === '')) {
                  // Show options field in poll mode even if empty (shows default)
                  if (!(isOptionsField && isPollMode)) {
                    return null
                  }
                }

                // Use friendly labels for specific fields
                let displayLabel = param.name
                if (param.payloadName === 'options') displayLabel = 'Answers'
                if (param.payloadName === 'payoutInstructions' || param.payloadName === 'payouts') displayLabel = 'Treasury Payouts'
                if (param.payloadName === 'icc') displayLabel = 'Inter-Contract Call'

                return (
                  <div
                    key={param.name}
                    className="wizard-review-item"
                    style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}
                  >
                    <span className="wizard-review-item__label">{displayLabel}</span>
                    <span className="wizard-review-item__value">{displayValue}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Regular step with form fields (possibly disabled)
  return (
    <div className={`wizard-step ${step.disabled ? 'wizard-step--disabled' : ''}`}>
      {step.disabled && step.disabledMessage && (
        <div className="wizard-step__disabled-message">
          {step.disabledMessage}
        </div>
      )}
      {step.description && !step.disabled && !isMobile && (
        <p className="wizard-step__description">{step.description}</p>
      )}
      {renderHeader && !step.disabled && (
        <div className="wizard-step__header-content">
          {renderHeader(step)}
        </div>
      )}
      <div
        className={`wizard-step__content neon-scroll ${step.disabled ? 'wizard-step__content--disabled' : ''}`}
      >
        {parameters.length === 0 ? (
          <p style={{ opacity: 0.7 }}>No fields for this step.</p>
        ) : (
          parameters.map((param) => (
            <div key={param.name} className="wizard-step__field">
              {renderField?.(param)}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

/**
 * Format a parameter value for display in the review step
 */
function formatReviewValue(param, value, allParams = {}) {
  // Handle options field first (even if empty, to show default)
  if (param.payloadName === 'options') {
    const strValue = String(value ?? '')
    // Parse options with URL support: "Option A###https://url.com;Option B"
    const options = strValue
      .split(';')
      .map(o => o.trim())
      .filter(Boolean)
      .map(o => {
        const parts = o.split('###')
        return { text: parts[0] || '', url: parts[1] || '' }
      })
    const optionStyle = {
      background: 'var(--color-primary-darkest)',
      border: '1px solid var(--color-primary-darker)',
      padding: '4px 8px',
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
    }
    if (options.length === 0) {
      return (
        <span style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={optionStyle}>No</span>
          <span style={optionStyle}>Yes</span>
          <span style={{ opacity: 0.5, fontSize: 'var(--font-size-small)' }}>(default)</span>
        </span>
      )
    }
    return (
      <span style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {options.map((opt, idx) => (
          <span
            key={idx}
            style={optionStyle}
          >
            <span>{opt.text}</span>
            {opt.url && (
              <a
                href={opt.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 'var(--font-size-small)',
                  color: 'var(--color-primary)',
                  opacity: 0.8,
                  textDecoration: 'none',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {opt.url}
              </a>
            )}
          </span>
        ))}
      </span>
    )
  }

  // Handle payout instructions field
  if (param.payloadName === 'payoutInstructions' || param.payloadName === 'payouts') {
    const strValue = String(value ?? '')

    // Get display label for asset (hbd_savings -> "sHBD")
    const getAssetDisplayLabel = (asset) => {
      if (asset === 'hbd_savings') return 'sHBD'
      return asset.toUpperCase()
    }

    // Parse format: hive:user:amount:asset;hive:user2:amount2:asset2
    const payouts = strValue
      .split(';')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const parts = entry.split(':')
        if (parts.length < 3) return null
        const receiver = parts.slice(0, 2).join(':') // hive:username
        const amount = parts[2]
        const asset = parts[3] || 'HIVE'
        return { receiver, amount, asset }
      })
      .filter(Boolean)

    if (payouts.length === 0) {
      return <span style={{ opacity: 0.5 }}>No payouts</span>
    }

    const payoutStyle = {
      background: 'var(--color-primary-darkest)',
      border: '1px solid var(--color-primary)',
      padding: '4px 8px',
      display: 'flex',
      justifyContent: 'space-between',
      gap: '12px',
    }

    return (
      <span style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {payouts.map((payout, idx) => (
          <span key={idx} style={payoutStyle}>
            <span style={{ color: 'var(--color-primary-lighter)' }}>
              {payout.receiver}
            </span>
            <span style={{ color: 'var(--color-primary)' }}>
              {payout.amount} {getAssetDisplayLabel(payout.asset)}
            </span>
          </span>
        ))}
      </span>
    )
  }

  // Handle ICC (Inter-Contract Call) field
  if (param.type === 'icc' || param.payloadName === 'icc') {
    const strValue = String(value ?? '')
    if (!strValue) {
      return <span style={{ opacity: 0.5 }}>No inter-contract call</span>
    }

    // Parse format: vsc1abc...|swap|{"from":"HIVE","to":"HBD"}|HIVE=1.000,HBD=2.000
    // Using | as delimiter (same as CSV format)
    const parts = strValue.split('|')

    let contract = ''
    let action = ''
    let jsonParams = ''
    let amountsStr = ''
    const amountPattern = /^([A-Za-z_]+=[0-9.]+)(,[A-Za-z_]+=[0-9.]+)*$/

    if (parts.length >= 1) contract = parts[0] || ''
    if (parts.length >= 2) action = parts[1] || ''
    if (parts.length >= 3) {
      // Check if last part looks like amounts (asset=amount,asset=amount)
      const lastPart = parts[parts.length - 1]
      if (parts.length >= 4 && amountPattern.test(lastPart)) {
        // Last part is amounts, rejoin middle parts as payload (in case payload contains |)
        amountsStr = lastPart
        jsonParams = parts.slice(2, -1).join('|')
      } else {
        // No amounts, rejoin all parts after action as payload (in case payload contains |)
        jsonParams = parts.slice(2).join('|')
      }
    }

    // Parse amounts string to array
    const amounts = amountsStr
      ? amountsStr.split(',').map(pair => {
          const [asset, amount] = pair.split('=')
          return { asset: asset || '', amount: amount || '' }
        }).filter(a => a.asset && a.amount)
      : []

    // Get display label for asset (hbd_savings -> "sHBD")
    const getAssetDisplayLabel = (asset) => {
      if (asset === 'hbd_savings') return 'sHBD'
      return asset.toUpperCase()
    }

    const iccStyle = {
      background: 'var(--color-primary-darkest)',
      border: '1px solid var(--color-primary-darker)',
      padding: '4px 8px',
      display: 'flex',
      justifyContent: 'space-between',
      gap: '12px',
    }

    return (
      <span style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {contract && (
          <span style={iccStyle}>
            <span style={{ color: 'var(--color-primary-lighter)', opacity: 0.7 }}>Contract</span>
            <span style={{ color: 'var(--color-primary)' }}>{contract}</span>
          </span>
        )}
        {action && (
          <span style={iccStyle}>
            <span style={{ color: 'var(--color-primary-lighter)', opacity: 0.7 }}>Action</span>
            <span style={{ color: 'var(--color-primary)' }}>{action}</span>
          </span>
        )}
        {jsonParams && (
          <span style={iccStyle}>
            <span style={{ color: 'var(--color-primary-lighter)', opacity: 0.7 }}>Payload</span>
            <span style={{ color: 'var(--color-primary)', wordBreak: 'break-all' }}>{jsonParams}</span>
          </span>
        )}
        {amounts.length > 0 && (
          <span style={iccStyle}>
            <span style={{ color: 'var(--color-primary-lighter)', opacity: 0.7 }}>Amounts</span>
            <span style={{ color: 'var(--color-primary)', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
              {amounts.map((a, i) => (
                <span key={i}>{a.amount} {getAssetDisplayLabel(a.asset)}</span>
              ))}
            </span>
          </span>
        )}
      </span>
    )
  }

  // Handle Meta Actions field
  if (param.payloadName === 'meta') {
    const strValue = String(value ?? '')
    if (!strValue) {
      return <span style={{ opacity: 0.5 }}>No meta actions</span>
    }

    // Parse format: key=value;key2=value2
    const metaActions = strValue
      .split(';')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const eqIndex = entry.indexOf('=')
        if (eqIndex === -1) return { key: entry, value: '' }
        return {
          key: entry.substring(0, eqIndex),
          value: entry.substring(eqIndex + 1),
        }
      })

    if (metaActions.length === 0) {
      return <span style={{ opacity: 0.5 }}>No meta actions</span>
    }

    const metaStyle = {
      background: 'var(--color-primary-darkest)',
      border: '1px solid var(--color-primary)',
      padding: '4px 8px',
      display: 'flex',
      justifyContent: 'space-between',
      gap: '12px',
    }

    return (
      <span style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {metaActions.map((meta, idx) => (
          <span key={idx} style={metaStyle}>
            <span style={{ color: 'var(--color-primary-lighter)' }}>
              {meta.key}
            </span>
            <span style={{ color: 'var(--color-primary)' }}>
              {meta.value}
            </span>
          </span>
        ))}
      </span>
    )
  }

  if (value === undefined || value === null || value === '') {
    return <span style={{ opacity: 0.5 }}>Not set</span>
  }

  // Handle vscIntent type (amount + asset)
  if (param.type === 'vscIntent' && typeof value === 'object') {
    const amount = value.amount || '0'
    const asset = value.asset || 'HIVE'
    return `${amount} ${asset}`
  }

  // Handle numeric fields that should show the asset (stake, cost fields)
  if (param.type === 'number') {
    const payloadName = (param.payloadName || '').toLowerCase()
    const shouldShowAsset = payloadName === 'stakemin' || payloadName === 'proposalcost'
    if (shouldShowAsset) {
      // Get asset from vscIntent field
      const vscIntent = allParams['Initial deposit (stake + treasury)'] || allParams['vscIntent'] || {}
      const asset = vscIntent.asset || 'HIVE'
      return `${value} ${asset}`
    }
  }

  // Handle boolean type
  if (param.type === 'bool') {
    const boolVal = value === true || value === 'true' || value === '1'
    // Use display labels if available
    const trueLabel = param.displayTrue ?? param.DisplayTrue ?? param.display_true ?? 'Yes'
    const falseLabel = param.displayFalse ?? param.DisplayFalse ?? param.display_false ?? 'No'
    return boolVal ? trueLabel : falseLabel
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.join(', ') || <span style={{ opacity: 0.5 }}>None</span>
  }

  // Handle objects
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }

  return String(value)
}
