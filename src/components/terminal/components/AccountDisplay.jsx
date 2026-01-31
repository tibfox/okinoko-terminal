import { h } from 'preact'
import { useEffect, useState, useContext, useRef } from 'preact/hooks'
import RcCircleGraph from './RcCircleGraph.jsx'
import Menu from "../../buttons/MenuButton.jsx"
import { useAccountBalances } from '../providers/AccountBalanceProvider.jsx'
import { useAssetSymbols } from '../providers/NetworkTypeProvider.jsx'
import { useAioha } from '@aioha/providers/react'
import { PopupContext } from '../../../popup/context.js'
import DepositPopup from '../SubTerminals/DepositPopup.jsx'
import WithdrawPopup from '../SubTerminals/WithdrawPopup.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowDown, faArrowUp } from '@fortawesome/free-solid-svg-icons'

export default function BalanceDisplay({ account, fontMult = 1 }) {
  const assetSymbols = useAssetSymbols()
  const { balances: bal, rc, loading, refresh } = useAccountBalances()
  const { user, aioha } = useAioha()
  const { openPopup, closePopup } = useContext(PopupContext)
  const [hovered, setHovered] = useState(false)
  const [fakePercent, setFakePercent] = useState(0)
  const [compactButtons, setCompactButtons] = useState(false)
  const buttonContainerRef = useRef(null)

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

  // Detect when buttons don't fit and switch to compact mode (icons only)
  useEffect(() => {
    const container = buttonContainerRef.current
    if (!container) return

    const checkForWrap = () => {
      const buttons = container.querySelectorAll('.account-action-btn')
      if (buttons.length < 2) return

      const textSpans = container.querySelectorAll('.button-text')

      // First, show text and remove overflow hidden temporarily to measure true content width
      textSpans.forEach((span) => { span.style.display = '' })
      buttons.forEach((btn) => { btn.style.overflow = 'visible' })

      // Check if any button's content overflows (scrollWidth > clientWidth)
      let hasOverflow = false
      buttons.forEach((btn) => {
        if (btn.scrollWidth > btn.clientWidth) {
          hasOverflow = true
        }
      })

      // Restore overflow hidden
      buttons.forEach((btn) => { btn.style.overflow = 'hidden' })

      setCompactButtons(hasOverflow)

      // Hide text if overflow detected
      if (hasOverflow) {
        textSpans.forEach((span) => { span.style.display = 'none' })
      }
    }

    const resizeObserver = new ResizeObserver(checkForWrap)
    resizeObserver.observe(container)

    // Initial check after a short delay to ensure layout is complete
    requestAnimationFrame(checkForWrap)

    return () => resizeObserver.disconnect()
  }, [user])

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

  // Fallback to 0 if RC or balance data is missing
  const rcAmount = rc?.amount ?? 0
  const rcMaxRcs = rc?.max_rcs ?? 0
  const rcRatio = rcMaxRcs > 0 ? rcAmount / rcMaxRcs : 0
  const rcPercent = (rcRatio * 100).toFixed(1)

  const hiveBalance = bal?.hive ? Number(bal.hive) / 1000 : 0
  const hbdBalance = bal?.hbd ? Number(bal.hbd) / 1000 : 0

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
      <table style={{ borderCollapse: "collapse", color: "var(--color-primary)", fontSize: 'var(--font-size-base)' }}>
        <tbody>
          <tr>
            <td style={{ textAlign: "left", paddingRight: "0.2rem" }}>
              <b>RC:</b>
            </td>
            <td style={{ textAlign: "left", paddingRight: "0.4rem" }}>
              {format(rcAmount)} / {format(rcMaxRcs)}
            </td>
          </tr>
          <tr>
            <td style={{ textAlign: "left", paddingRight: "0.2rem" }}>
              <b>{assetSymbols.HIVE}:</b>
            </td>
            <td style={{ textAlign: "left", paddingRight: "0.4rem" }}>
              {format(hiveBalance, true)}
            </td>

          </tr>
          <tr>

            <td style={{ textAlign: "left", paddingRight: "0.2rem" }}>
              <b>{assetSymbols.HBD}:</b>
            </td>
            <td style={{ textAlign: "left", paddingRight: "0.4rem" }}>
          {format(hbdBalance, true)}
          </td>
          </tr>
        </tbody>
      </table>

      <div ref={buttonContainerRef} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
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
            fontSize: 'var(--font-size-base)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            flex: 1,
            transition: 'all 0.2s ease',
            overflow: 'hidden',
          }}
        >
          <FontAwesomeIcon icon={faArrowUp} style={{fontSize: '0.9rem', marginRight: compactButtons ? 0 : '0.5rem' }} />
          <span className="button-text">Deposit</span>
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
            fontSize: 'var(--font-size-base)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            flex: 1,
            transition: 'all 0.2s ease',
            overflow: 'hidden',
          }}
        >
          <FontAwesomeIcon icon={faArrowDown} style={{ fontSize: '0.9rem',marginRight: compactButtons ? 0 : '0.5rem' }} />
          <span className="button-text">Withdraw</span>
        </button>
      </div>
    </Menu>
  )
}
