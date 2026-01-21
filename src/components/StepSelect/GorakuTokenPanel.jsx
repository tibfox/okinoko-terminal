import { useContext, useMemo } from 'preact/hooks'
import NeonButtonSimple from '../buttons/NeonButtonSimple.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaperPlane, faDice, faGavel, faCalendarPlus, faCoins } from '@fortawesome/free-solid-svg-icons'
import { useDeviceBreakpoint } from '../../hooks/useDeviceBreakpoint.js'
import { useAioha } from '@aioha/react-ui'
import { PopupContext } from '../../popup/context.js'
import { useAccountBalances } from '../terminal/providers/AccountBalanceProvider.jsx'
import BuyTokensPopup from '../StepGoraku/BuyTokensPopup.jsx'
import ClaimTokensPopup from '../StepGoraku/ClaimTokensPopup.jsx'
import HostEventPopup from '../StepGoraku/HostEventPopup.jsx'

// Dummy user stats
const userStats = {
  gameTokens: 100,
  daysInSeason: '3 days 12 hours',
  seasonPot: '12.001 HIVE',
}

export default function GorakuTokenPanel() {
  const isMobile = useDeviceBreakpoint()
  const { user, aioha } = useAioha()
  const { openPopup, closePopup } = useContext(PopupContext)
  const { balances: accountBalances } = useAccountBalances()

  const hiveBalance = useMemo(() => {
    if (!accountBalances) return 0
    return Number(accountBalances.hive ?? 0) / 1000
  }, [accountBalances])

  const handleBuyTokens = () => {
    const capturedAioha = aioha
    const capturedUser = user
    const capturedHiveBalance = hiveBalance
    openPopup({
      title: 'Buy Tokens',
      body: () => (
        <BuyTokensPopup
          onClose={closePopup}
          aioha={capturedAioha}
          user={capturedUser}
          currentTokens={userStats.gameTokens}
          hiveBalance={capturedHiveBalance}
        />
      ),
    })
  }

  const handleClaimTokens = () => {
    const capturedAioha = aioha
    const capturedUser = user
    openPopup({
      title: 'Claim Tokens',
      body: () => (
        <ClaimTokensPopup
          onClose={closePopup}
          aioha={capturedAioha}
          user={capturedUser}
        />
      ),
    })
  }

  const handleHostEvent = () => {
    const capturedAioha = aioha
    const capturedUser = user
    const capturedHiveBalance = hiveBalance
    openPopup({
      title: 'Host Event',
      body: () => (
        <HostEventPopup
          onClose={closePopup}
          aioha={capturedAioha}
          user={capturedUser}
          hiveBalance={capturedHiveBalance}
        />
      ),
    })
  }

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '20px',
        padding: '10px 0',
      }}
    >
      {/* Left column: Action buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: '1 1 300px', minWidth: isMobile ? '100px' : '200px' }}>
        <div style={{ display: 'flex', flexWrap: isMobile ? 'nowrap' : 'wrap', gap: '10px', justifyContent: isMobile ? 'space-between' : undefined }}>
          <NeonButtonSimple onClick={handleClaimTokens} style={{ flex: isMobile ? '1' : '1 1 auto', minWidth: isMobile ? 'auto' : '100px', padding: isMobile ? '8px 12px' : '12px 1rem' }}>
            {isMobile ? <FontAwesomeIcon icon={faDice} /> : 'Claim Tokens'}
          </NeonButtonSimple>
          <NeonButtonSimple onClick={handleBuyTokens} style={{ flex: isMobile ? '1' : '1 1 auto', minWidth: isMobile ? 'auto' : '100px', padding: isMobile ? '8px 12px' : '12px 1rem' }}>
            {isMobile ? <FontAwesomeIcon icon={faCoins} /> : 'Buy Tokens'}
          </NeonButtonSimple>
          <NeonButtonSimple onClick={handleHostEvent} style={{ flex: isMobile ? '1' : '1 1 auto', minWidth: isMobile ? 'auto' : '100px', padding: isMobile ? '8px 12px' : '12px 1rem' }}>
            {isMobile ? <FontAwesomeIcon icon={faCalendarPlus} /> : 'Host Event'}
          </NeonButtonSimple>
          <NeonButtonSimple onClick={() => {}} style={{ flex: isMobile ? '1' : '1 1 auto', minWidth: isMobile ? 'auto' : '100px', padding: isMobile ? '8px 12px' : '12px 1rem' }}>
            {isMobile ? <FontAwesomeIcon icon={faPaperPlane} /> : 'Send Token'}
          </NeonButtonSimple>
          <NeonButtonSimple disabled onClick={() => {}} style={{ flex: isMobile ? '1' : '1 1 auto', minWidth: isMobile ? 'auto' : '100px', padding: isMobile ? '8px 12px' : '12px 1rem' }}>
            {isMobile ? <FontAwesomeIcon icon={faGavel} /> : 'Execute Season'}
          </NeonButtonSimple>
        </div>
      </div>

      {/* Right column: User stats table */}
      <div
        style={{
          border: '1px solid var(--color-primary-darkest)',
          padding: '10px',
          background: 'rgba(0, 0, 0, 0.3)',
          flex: '1 1 250px',
          minWidth: '200px',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ padding: '6px 0', color: 'var(--color-primary-lighter)' }}>Your tokens:</td>
              <td style={{ padding: '6px 0', textAlign: 'right', color: 'var(--color-primary-lightest)', fontSize: '5rem' }}>
                {userStats.gameTokens}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '6px 0', color: 'var(--color-primary-lighter)' }}>Days in season:</td>
              <td style={{ padding: '6px 0', textAlign: 'right', color: 'var(--color-primary-lightest)' }}>
                {userStats.daysInSeason}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '6px 0', color: 'var(--color-primary-lighter)' }}>Season pot:</td>
              <td style={{ padding: '6px 0', textAlign: 'right', color: 'var(--color-primary-lightest)' }}>
                {userStats.seasonPot}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
