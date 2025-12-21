import { useEffect, useMemo, useState } from 'preact/hooks'
import { useAioha } from '@aioha/react-ui'
import { useAccountBalances } from '../providers/AccountBalanceProvider.jsx'
import InfoIcon from '../../common/InfoIcon.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRotateLeft } from '@fortawesome/free-solid-svg-icons'

const panelStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  padding: '0.5rem',
  fontSize: '0.9rem',
  color: 'var(--color-primary-lighter)',
  flex: 1,
  minHeight: 0,
}

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '0.85rem',
}

const cellLabelStyle = {
  // textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: 'var(--color-primary-lighter)',
  padding: '0.25rem 0.35rem 0.25rem 0',
  width: '40%',
}

const labelContentStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
}

const tooltipStyle = {
  color: 'var(--color-primary-lighter)',
}

const cellValueStyle = {
  padding: '0.25rem 0.1rem',
  color: 'var(--color-primary-lighter)',
}

const skeletonRowStyle = {
  height: '0.75rem',
  
  background: 'linear-gradient(90deg, rgba(255,255,255,0.08), rgba(255,255,255,0.2), rgba(255,255,255,0.08))',
}

const progressWrapperStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.35rem',
}

const progressTrackStyle = {
  width: '100%',
  height: '0.65rem',
  borderRadius: '999px',
  background: 'rgba(255,255,255,0.08)',
  overflow: 'hidden',
  border: '1px solid rgba(255,255,255,0.1)',
}

const progressFillBase = {
  height: '100%',
  borderRadius: '999px',
  background: 'var(--color-primary-darker)',
  transition: 'width 180ms ease-out',
}

const progressSkeletonStyle = {
  width: '100%',
  height: '0.65rem',
  borderRadius: '999px',
  background: 'linear-gradient(90deg, rgba(255,255,255,0.08), rgba(255,255,255,0.2), rgba(255,255,255,0.08))',
}

const formatNumber = (value, forceDecimals = false) => {
  if (value === null || value === undefined) {
    return '-'
  }
  const numeric = Number(value)
  if (Number.isNaN(numeric)) {
    return '-'
  }
  if (numeric === 0) {
    return '-'
  }
  const options = forceDecimals
    ? { minimumFractionDigits: 3, maximumFractionDigits: 3 }
    : { maximumFractionDigits: 3 }
  return numeric.toLocaleString('en-US', { ...options, useGrouping: false })
}

export default function AccountDataPanel() {
  const { user } = useAioha()
  const { balances, rc, loading, refresh } = useAccountBalances()
  const [fakePercent, setFakePercent] = useState(0)

  const showSkeleton = loading && (!balances || !rc)
  const normalizedUser = useMemo(() => {
    if (!user) {
      return null
    }
    return user.startsWith('hive:') ? user.slice(5) : user
  }, [user])

  useEffect(() => {
    if (!showSkeleton) {
      return
    }
    let t = 0
    const interval = setInterval(() => {
      const sineValue = (Math.sin(t) + 1) / 2
      setFakePercent(Math.round(sineValue * 100))
      t += 0.2
    }, 80)
    return () => clearInterval(interval)
  }, [showSkeleton])

  const rcRatio = rc?.max_rcs ? rc.amount / rc.max_rcs : 0
  const rcPercent = showSkeleton ? fakePercent : Math.min(100, Math.max(0, rcRatio * 100))

  const accountRows = useMemo(
    () => [
      {
        label: 'RC',
        tooltip: 'Ressource Credits on the Magi Network. These refill automatically based on your HBD (unstaked).',
        value: rc
          ? `${formatNumber(Math.floor(rc.amount / 1000))} / ${formatNumber(Math.floor(rc.max_rcs / 1000))}`
          : '—',
      },
      {
        label: 'HIVE',
        tooltip: 'The amount of unstaked HIVE in your wallet.',
        value: balances ? formatNumber(Number(balances.hive) / 1000, true) : '—',
      },
      {
        label: 'HBD',
        tooltip: 'The amount of unstaked HBD in your account. These are reposible of the the amount of RC you have available.',
        value: balances ? formatNumber(Number(balances.hbd) / 1000, true) : '—',
      },
      {
        label: 'sHBD',
        tooltip: 'Staked HBD give you 15% APR while still being transferrable',
        value: balances ? formatNumber(Number(balances.hbd_savings) / 1000, true) : '—',
      },
      {
        label: 'cHIVE',
        tooltip: 'Staked HIVE which is only needed for node operators',
        value: balances ? formatNumber(Number(balances.hive_consensus) / 1000, true) : '—',
      },
      {
        label: 'cHIVE unst.',
        tooltip: 'currently unstaking HIVE. Unstaked coins will be made available after an unbonding period of five elections (about a day).',
        value: balances ? formatNumber(Number(balances.consensus_unstaking) / 1000, true) : '—',
      },
      {
        label: 'sHBD unst.',
        tooltip: 'currently unstaking HBD. Unstaked coins will be made available after about three days.',
        value: balances ? formatNumber(Number(balances.pending_hbd_unstaking) / 1000, true) : '—',
      },
    ],
    [balances, rc, rcPercent],
  )

  if (!normalizedUser) {
    return (
      <div style={panelStyle}>
        <div style={{ color: 'var(--color-primary-lighter)', fontSize: '0.9rem' }}>
          Sign in to view account data.
        </div>
      </div>
    )
  }

  const handleRefresh = () => {
    refresh({ force: true, withLoading: true })
  }

  return (
    <div style={panelStyle}>
      <div className="neon-scroll" style={{ flex: 1, overflowY: 'auto', paddingRight: '0.35rem' }}>
        <div
          style={{
            // position: 'sticky',
            top: 0,
            zIndex: 1,
            background: 'transparent',
            paddingBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '0.85rem' }}>
              {normalizedUser}
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              aria-label="Refresh balances"
              title="Refresh balances"
              style={{
                border: '1px solid var(--color-primary-dark)',
                background: 'transparent',
                color: 'var(--color-primary-lighter)',
                padding: '0.25rem 0.75rem',
                
                cursor: 'pointer',
                fontSize: '0.75rem',
                letterSpacing: '0.1em',
              }}
            >
              <FontAwesomeIcon icon={faRotateLeft} />
            </button>
          </div>

          <div style={{ ...progressWrapperStyle, marginTop: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', letterSpacing: '0.1em' }}>
              <span style={{ color: 'var(--color-primary-lighter)' }}>RC</span>
              <span style={{ color: 'var(--color-primary-lighter)' }}>
                {showSkeleton ? '—' : `${rcPercent.toFixed(1)}%`}
              </span>
            </div>
            {showSkeleton ? (
              <div style={progressSkeletonStyle} />
            ) : (
              <div style={progressTrackStyle}>
                <div style={{ ...progressFillBase, width: `${rcPercent}%` }} />
              </div>
            )}
          </div>
        </div>

        <div style={{ paddingTop: '1rem' }}>
          {showSkeleton ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={`skeleton-${index}`} style={skeletonRowStyle} />
              ))}
            </div>
          ) : (
            <table style={tableStyle}>
              <tbody>
                {accountRows.map((row) => (
                  <tr key={row.label}>
                    <td style={cellLabelStyle}>
                      <span style={labelContentStyle}>
                        {row.label}
                        {row.tooltip ? <InfoIcon tooltip={row.tooltip} size={14} style={tooltipStyle} /> : null}
                      </span>
                    </td>
                    <td style={cellValueStyle}>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
