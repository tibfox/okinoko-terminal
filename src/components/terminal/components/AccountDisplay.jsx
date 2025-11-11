import { h } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import RcCircleGraph from './RcCircleGraph.jsx'
import Menu from "../../buttons/MenuButton.jsx" 
import { useAccountBalances } from '../providers/AccountBalanceProvider.jsx'

export default function BalanceDisplay({ account, fontMult = 1 }) {
  const { balances: bal, rc, loading, refresh } = useAccountBalances()
  const [hovered, setHovered] = useState(false)
  const [fakePercent, setFakePercent] = useState(0)

  const showSkeleton = loading && (!bal || !rc)

  useEffect(() => {
    if (!showSkeleton) return
    let t = 0
    const interval = setInterval(() => {
      const sineValue = (Math.sin(t) + 1) / 2
      setFakePercent(Math.round(sineValue * 100))
      t += 0.15
    }, 50)
    return () => clearInterval(interval)
  }, [showSkeleton])

  const handleMenuToggle = (isOpen) => {
    if (isOpen) {
      refresh({ force: true })
    }
  }

  const format = (n, forceDecimals = false) => {
    const num = Number(n)
    const options = forceDecimals
      ? { minimumFractionDigits: 3, maximumFractionDigits: 3 }
      : { maximumFractionDigits: 3 }
    return num.toLocaleString("en-US", options).replace(/,/g, ".")
  }

  if (showSkeleton) {
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
      onToggle={handleMenuToggle}
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
