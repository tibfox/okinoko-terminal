import { useState, useEffect, useMemo } from 'preact/hooks'
import NeonSwitch from '../common/NeonSwitch.jsx'
import { useAccountBalances } from '../terminal/providers/AccountBalanceProvider.jsx'
import GamblingInfoIcon from '../common/GamblingInfoIcon.jsx'

export default function GameJoin({ game, user, setParams, onBalanceCheck }) {
  const [pfm, setPfm] = useState(false)
  const [insufficient, setInsufficient] = useState(false)
  const { balances: accountBalances } = useAccountBalances()
  const balances = useMemo(() => {
    if (!accountBalances) return { hive: 0, hbd: 0 }
    return {
      hive: Number(accountBalances.hive ?? 0) / 1000,
      hbd: Number(accountBalances.hbd ?? 0) / 1000,
    }
  }, [accountBalances])

  // ✅ reset FMP every time game changes
  useEffect(() => {
    setPfm(false)
    setParams(prev => ({
      ...prev,
      __gameFmpEnabled: false,
    }))
  }, [game])

  // ✅ Calculate required balance based on PFM toggle
  const required = pfm
    ? parseFloat(game?.bet ?? 0) + parseFloat(game?.firstMovePurchase ?? 0)
    : parseFloat(game?.bet ?? 0)

  const asset = (game?.asset || 'HIVE').toUpperCase() // HIVE or HBD
  const available = asset === 'HIVE' ? balances.hive : balances.hbd

  // ✅ Recheck insufficient funds whenever toggle changes or balance loads
  useEffect(() => {
    // Handle edge cases: NaN values, undefined, etc.
    const reqAmount = Number.isFinite(required) ? required : 0
    const availAmount = Number.isFinite(available) ? available : 0
    const isInsufficient = reqAmount > availAmount

    setInsufficient(isInsufficient)
    // Notify parent component about balance status
    onBalanceCheck?.(isInsufficient)

    // Debug logging
    console.log('[GameJoin] Balance check:', {
      required: reqAmount,
      available: availAmount,
      asset,
      isInsufficient,
      rawBalances: accountBalances,
      parsedBalances: balances
    })
  }, [required, available, asset, accountBalances, balances, onBalanceCheck])

  const toggleFmp = (val) => {
    setPfm(val)

    setParams(prev => ({
      ...prev,
      __gameFmpEnabled: val
    }))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <table style={{ width: '100%', tableLayout: 'fixed' }}>
        <colgroup>
                <col style={{ width: '25%' }} />
                <col style={{ width: '70%' }} />
                
              </colgroup>
        <tbody>
          <tr><td><strong>Creator:</strong></td><td>{game?.creator}</td></tr>
          <tr><td><strong>Created on:</strong></td><td>{game?.createdOn}</td></tr>
          <tr><td><strong>Name:</strong></td><td>{game?.name}</td></tr>
        </tbody>
      </table>

      <div style={{ marginTop: '50px' }}>
        {game?.firstMovePurchase > 0 && (
          <div style={{ marginBottom: '20px' }}>
            The creator defined a <b>FMP cost of {game.firstMovePurchase} {game.asset}</b>. If you pay this amount to the creator, you will get the first move in the game.
            <br /><br />
            <NeonSwitch
              name="Send First Move Payment (FMP) to Creator?"
              checked={pfm}
              onChange={toggleFmp}
            />
          </div>
        )}

     <div
  style={{
    display: 'flex',
    justifyContent: 'center',
    width: '100%',
    marginTop: '16px'
  }}
>
  {/* <div style={{ maxWidth: '260px', width: '100%' }}> */}
    
     <table style={{ tableLayout: 'auto', borderCollapse: 'collapse' }}>
  <tbody>
    <tr>
      <td>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <strong>Bet:</strong>
          <GamblingInfoIcon size={14} style={{ marginLeft: 0 }} />
        </span>
      </td>
      <td style={{ paddingLeft: 24 }}>
        {(game?.bet ?? 0).toFixed(3)} {(game?.asset || 'HIVE').toUpperCase()}
      </td>
    </tr>

    {pfm && (
      <tr>
        <td><strong>+ First Move Purchase:</strong></td>
        <td style={{ paddingLeft: 24 }}>
          {(game?.firstMovePurchase ?? 0).toFixed(3)} {(game?.asset || 'HIVE').toUpperCase()}
        </td>
      </tr>
    )}

    {/* single stroke ABOVE total */}
    <tr>
      <td colSpan={2} style={{ borderTop: '1px solid var(--color-primary-lighter)', height: 6 }} />
    </tr>

    {/* total row */}
    <tr>
      <td style={{ verticalAlign: 'top' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <strong>Total to Join:</strong>
          <GamblingInfoIcon size={14} style={{ marginLeft: 0 }} />
        </span>
      </td>
      <td style={{ paddingLeft: 24 }}>
        <strong>{required.toFixed(3)} {asset}{' '}</strong>
        {insufficient && <span style={{ color: 'red' }}>(Insufficient balance)</span>}
      </td>
    </tr>

    {/* double stroke BELOW total */}
    <tr>
      <td colSpan={2} style={{ borderTop: '3px double var(--color-primary-lighter)', height: 24 }} />
    </tr>

    <tr>
      <td><strong>You can win:</strong></td>
      <td style={{ paddingLeft: 24 }}>
        {((game?.bet ?? 0) * 2).toFixed(3)} {(game?.asset || 'HIVE').toUpperCase()}
      </td>
    </tr>
  </tbody>
</table>
      </div>
            </div>

      {/* </div> */}
    </div>
  )
}
