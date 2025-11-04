import { h } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import { useVscQuery } from '../../lib/useVscQuery.js'
import RcCircleGraph from './RcCircleGraph.jsx'

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
  const [fakePercent, setFakePercent] = useState(0)

  // Simulated loading animation with easing
useEffect(() => {
  if (!loading) return

  let t = 0
  const interval = setInterval(() => {
    // sine wave from 0 to 1 -> multiply by 100
    const sineValue = (Math.sin(t) + 1) / 2 // range 0 → 1
    const easedPercent = Math.round(sineValue * 100)
    setFakePercent(easedPercent)

    t += 0.15 // speed of animation (adjust to taste)
  }, 50) // frame rate

  return () => clearInterval(interval)
}, [loading])


  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      console.log("🔍 RC fetch triggered", Date.now());

      const { data, error } = await runQuery(QUERY_ACC_BAL, { acc: account })
      if (!cancelled && !error && data?.rc && data?.bal) {
        setRc(data.rc)
        setBal(data.bal)
      }
      setLoading(false)
    }
    if (account) load()
    return () => { cancelled = true }
  }, [account])

  const format = (n, forceDecimals = false) => {
    const num = Number(n)
    const options = forceDecimals
      ? { minimumFractionDigits: 3, maximumFractionDigits: 3 }
      : { maximumFractionDigits: 3 }
    return num.toLocaleString('en-US', options).replace(/,/g, '.')
  }

  // If still loading, show fake values
  if (loading) {
    return (
      <RcCircleGraph
        rcPercent={fakePercent}
        rcRatio={fakePercent / 100}
        hovered={hovered}
        setHovered={setHovered}
        expanded={false}
        loading={true}
      />
    )
  }

  if (!rc || !bal) return null

  const rcRatio = rc.max_rcs > 0 ? rc.amount / rc.max_rcs : 0
  const rcPercent = (rcRatio * 100).toFixed(1)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        fontSize: '0.85rem',
        textAlign: 'left',
      }}
    >
      {expanded && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            padding: '0 0.3rem',
            background: '#000',
            border: '1px solid var(--color-primary-darkest)',
            fontSize: `${0.85 * fontMult}rem`,
          }}
        >
          <table style={{ borderCollapse: 'collapse', color: 'var(--color-primary)' }}>
            <tbody>
              <tr>
                <td style={{ textAlign: 'right', paddingRight: '0.2rem' }}><b>RC:</b></td>
                <td colSpan={3} style={{ textAlign: 'left', paddingRight: '0.4rem' }}>
                  {format(rc.amount)}&nbsp;/&nbsp;{format(rc.max_rcs)}
                </td>
              </tr>
              <tr>
                <td style={{ textAlign: 'right', paddingRight: '0.2rem' }}><b>HIVE:</b></td>
                <td style={{ textAlign: 'left', paddingRight: '0.4rem' }}>
                  {format(Number(bal.hive) / 1000, true)}
                </td>
                <td style={{ textAlign: 'right', paddingRight: '0.2rem' }}><b>HBD:</b></td>
                <td>{format(Number(bal.hbd) / 1000, true)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <RcCircleGraph
        rcPercent={rcPercent}
        rcRatio={rcRatio}
        hovered={hovered}
        setHovered={setHovered}
        onClick={() => setExpanded(v => !v)}
        expanded={expanded}
        loading={loading}
      />
    </div>
  )
}
