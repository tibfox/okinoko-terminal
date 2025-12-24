import { h } from 'preact'
import { useEffect, useState, useContext } from 'preact/hooks'
import RcCircleGraph from './RcCircleGraph.jsx'
import Menu from "../../buttons/MenuButton.jsx"
import { useAccountBalances } from '../providers/AccountBalanceProvider.jsx'
import { useAioha } from '@aioha/providers/react'
import { PopupContext } from '../../../popup/context.js'
import DepositPopup from '../SubTerminals/DepositPopup.jsx'
import WithdrawPopup from '../SubTerminals/WithdrawPopup.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowDown, faArrowUp } from '@fortawesome/free-solid-svg-icons'

export default function BalanceDisplay({ account, fontMult = 1 }) {
  const { balances: bal, rc, loading, refresh } = useAccountBalances()
  const { user, aioha } = useAioha()
  const { openPopup, closePopup } = useContext(PopupContext)
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

  const handleDeposit = () => {
    const capturedAioha = aioha
    const capturedUser = user
    openPopup({
      title: 'Deposit',
      body: () => <DepositPopup onClose={closePopup} aioha={capturedAioha} user={capturedUser} />,
    })
  }

  const handleWithdraw = () => {
    const capturedAioha = aioha
    const capturedUser = user
    openPopup({
      title: 'Withdraw',
      body: () => <WithdrawPopup onClose={closePopup} aioha={capturedAioha} user={capturedUser} />,
    })
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

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
        <button
          type="button"
          onClick={handleDeposit}
          aria-label="Deposit"
          title="Deposit"
          className="account-action-btn"
          style={{
            border: '1px solid var(--color-primary-darker)',
            background: 'rgba(0, 0, 0, 0.6)',
            color: 'var(--color-primary-lighter)',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            fontSize: '0.75rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            flex: 1,
            transition: 'all 0.2s ease',
          }}
        >
          <FontAwesomeIcon icon={faArrowUp} style={{ marginRight: '0.5rem' }} />
          Deposit
        </button>
        <button
          type="button"
          onClick={handleWithdraw}
          aria-label="Withdraw"
          title="Withdraw"
          className="account-action-btn"
          style={{
            border: '1px solid var(--color-primary-darker)',
            background: 'rgba(0, 0, 0, 0.6)',
            color: 'var(--color-primary-lighter)',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            fontSize: '0.75rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            flex: 1,
            transition: 'all 0.2s ease',
          }}
        >
          <FontAwesomeIcon icon={faArrowDown} style={{ marginRight: '0.5rem' }} />
          Withdraw
        </button>
      </div>
    </Menu>
  )
}
