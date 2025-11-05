import { h } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import { useVscQuery } from '../../lib/useVscQuery.js'
import RcCircleGraph from './RcCircleGraph.jsx'
import Menu from "../buttons/MenuButton.jsx" 

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
  const [hovered, setHovered] = useState(false)
  const [fakePercent, setFakePercent] = useState(0)

  // Fake loading bar animation
  useEffect(() => {
    if (!loading) return
    let t = 0
    const interval = setInterval(() => {
      const sineValue = (Math.sin(t) + 1) / 2
      setFakePercent(Math.round(sineValue * 100))
      t += 0.15
    }, 50)
    return () => clearInterval(interval)
  }, [loading])

  // Load account + RC
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
    return () => { cancelled = true }
  }, [account])

  const format = (n, forceDecimals = false) => {
    const num = Number(n)
    const options = forceDecimals
      ? { minimumFractionDigits: 3, maximumFractionDigits: 3 }
      : { maximumFractionDigits: 3 }
    return num.toLocaleString("en-US", options).replace(/,/g, ".")
  }

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
    <Menu
      closeOnOutsideClick={true}
      title={account} 
      trigger={
        <RcCircleGraph
          rcPercent={rcPercent}
          rcRatio={rcRatio}
          hovered={hovered}
          setHovered={setHovered}
        />
      }
      style={{ minWidth: "240px" }}
      menuStyle={{ background: "#000" }}
    >
      <table style={{ borderCollapse: "collapse", color: "var(--color-primary)", fontSize: `${0.85 * fontMult}rem` }}>
        <tbody>
          <tr>
            <td style={{ textAlign: "left", paddingRight: "0.2rem" }}>
              <b>RC:</b>
            </td>
            <td style={{ textAlign: "left", paddingRight: "0.4rem" }}>
              {format(rc.amount)} / {format(rc.max_rcs)}
            </td>
          </tr>
          <tr>
            <td style={{ textAlign: "left", paddingRight: "0.2rem" }}>
              <b>HIVE:</b>
            </td>
            <td style={{ textAlign: "left", paddingRight: "0.4rem" }}>
              {format(Number(bal.hive) / 1000, true)}
            </td>
           
          </tr>
          <tr>
            
            <td style={{ textAlign: "left", paddingRight: "0.2rem" }}>
              <b>HBD:</b>
            </td>
            <td style={{ textAlign: "left", paddingRight: "0.4rem" }}>
          {format(Number(bal.hbd) / 1000, true)}
          </td>
          </tr>
        </tbody>
      </table>
    </Menu>
  )
}
