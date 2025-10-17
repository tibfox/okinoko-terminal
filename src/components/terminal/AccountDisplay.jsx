import { h } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import { useVscQuery } from '../../lib/useVscQuery.js'

const QUERY_ACC_BAL = `
  query AccBal($acc: String!) {
    bal: getAccountBalance(account: $acc) {
      hbd
      hbd_savings
      hive
      hive_consensus
      consensus_unstaking
      pending_hbd_unstaking
    }
    rc: getAccountRC(account: $acc) {
      amount
      max_rcs
    }
  }
`

export default function BalanceDisplay({ account, fontMult = 1 }) {
  const { runQuery } = useVscQuery()
  const [rc, setRc] = useState(null)
  const [bal, setBal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [hovered, setHovered] = useState(false) 

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data, error } = await runQuery(QUERY_ACC_BAL, { acc: account })
      if (!cancelled && !error && data?.rc && data?.bal) {
        setRc(data.rc)
        setBal(data.bal)
      }
      setLoading(false)
    }
    if (account) load()
    return () => {
      cancelled = true
    }
  }, [account])

  if (loading) return
  if (!rc || !bal) return

  // 👇 place this inside BalanceDisplay
const format = (n, forceDecimals = false) => {
  const num = Number(n)

  // Use .000 only for balances (HIVE, HBD), not RC counts
  const options = forceDecimals
    ? { minimumFractionDigits: 3, maximumFractionDigits: 3 }
    : { maximumFractionDigits: 3 }

  let str = num.toLocaleString('en-US', options)
  return str.replace(/,/g, '.')
}

  const rcRatio = rc.max_rcs > 0 ? rc.amount / rc.max_rcs : 0
  const rcPercent = (rcRatio * 100).toFixed(1)

  // circle geometry
  const radius = 16
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - rcRatio)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1.25rem',
        fontSize: '0.85rem',
        textAlign: 'left',
      }}
    >
      {/* LEFT: details (only when expanded) */}
      {expanded && (
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'flex-start',
            fontSize: `${0.85 * fontMult}rem`,
          }}
        >
          {/* HIVE/HBD & RC table */}
         
        <table style={{ borderCollapse: 'collapse', color: 'var(--color-primary)' }}>
  <tbody>
    <tr>
      <td style={{ textAlign: 'right', paddingRight: '0.2rem' }}>RC:</td>
      <td colSpan={3} style={{ textAlign: 'left', paddingRight: '0.4rem' }}>
        {format(rc.amount)}&nbsp;/&nbsp;{format(rc.max_rcs)}
      </td>
    </tr>
    <tr>
      <td style={{ textAlign: 'right', paddingRight: '0.2rem' }}>HIVE:</td>
      <td style={{ textAlign: 'left', paddingRight: '0.4rem' }}>
        {format(Number(bal.hive) / 1000, true)}
      </td>
      <td style={{ textAlign: 'right', paddingRight: '0.2rem' }}>HBD:</td>
      <td>{format(Number(bal.hbd) / 1000, true)}</td>
    </tr>
  </tbody>
</table>


        </div>
      )}

      {/* RIGHT: circular RC indicator + chevron toggle */}
      <button
        onClick={() => setExpanded((v) => !v)}
        onMouseEnter={() => setHovered(true)} // 👈 add hover detection
        onMouseLeave={() => setHovered(false)} // 👈 add hover detection
        title={`RC: ${rcPercent}% (${format(rc.amount)}/${format(rc.max_rcs)}) - Click to ${
          expanded ? 'collapse' : 'expand'
        }`}
        style={{
          cursor: 'pointer',
          width: '48px',
          height: '48px',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: 'none',
          padding: 0,
        }}
        aria-expanded={expanded}
        aria-label={expanded ? 'Collapse balances' : 'Expand balances'}
      >
        {/* chevron sits to the LEFT of the circle */}
        <span
          style={{
            position: 'absolute',
            left: '-12px',
            fontSize: '1.5rem',
            color: 'var(--color-primary-darker)',
            userSelect: 'none',
          
              transition: 'all 0.3s ease',
              filter: hovered
                ? 'drop-shadow(0 0 6px var(--color-primary-lightest)) drop-shadow(0 0 12px var(--color-primary-darker))'
                : 'none',
          
          }}
        >
          {expanded ? '›' : '‹'}
        </span>

        <svg width="48" height="48" viewBox="0 0 48 48" role="img" aria-label={`RC ${rcPercent}%`}>
          <circle
            cx="24"
            cy="24"
            r={radius}
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="4"
            fill="none"
          />
          <circle
            cx="24"
            cy="24"
            r={radius}
            stroke="var(--color-primary-darker)"
            strokeWidth="4"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 24 24)"
            style={{ transition: 'stroke-dashoffset 0.3s ease' }}
          />
          <text
            x="24"
            y="28"
            textAnchor="middle"
            fontSize="10"
            fill="var(--color-primary)"
            style={{
              transition: 'all 0.3s ease',
              filter: hovered
                ? 'drop-shadow(0 0 6px var(--color-primary-lightest)) drop-shadow(0 0 12px var(--color-primary-darker))'
                : 'none',
            }}
          >
            {Math.round(rcPercent)}%
          </text>
        </svg>
      </button>
    </div>
  )
}
