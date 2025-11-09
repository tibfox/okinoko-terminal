import { useState, useEffect } from 'preact/hooks'
import NeonSwitch from '../common/NeonSwitch.jsx'
import { useVscQuery } from '../../lib/useVscQuery.js'

export default function GameJoin({ game, user, setParams }) {
  const [pfm, setPfm] = useState(false)
  const [balances, setBalances] = useState({ hive: 0, hbd: 0 })
  const [insufficient, setInsufficient] = useState(false)
  const { runQuery } = useVscQuery()

  // ✅ reset FMP every time game changes
  useEffect(() => {
    setPfm(false)
    setParams(prev => ({
      ...prev,
      __gameFmpEnabled: false,
    }))
  }, [game])

  // ✅ Fetch wallet balances
  useEffect(() => {
    if (!user) return

    async function fetchBalances() {
      const query = `
        query GetBalances($acc: String!) {
          bal: getAccountBalance(account: $acc) {
            hive
            hbd
          }
        }
      `
      const hiveUser = user.startsWith('hive:') ? user : `hive:${user}`
      const { data, error } = await runQuery(query, { acc: hiveUser })

      if (!error && data?.bal) {
        setBalances({
          hive: Number(data.bal.hive) / 1000,
          hbd: Number(data.bal.hbd) / 1000
        })
      }
    }

    fetchBalances()
  }, [user])

  // ✅ Calculate required balance based on PFM toggle
  const required = pfm
    ? parseFloat(game.bet) + parseFloat(game.firstMovePurchase)
    : parseFloat(game.bet)

  const asset = game.asset // HIVE or HBD
  const available = asset === 'HIVE' ? balances.hive : balances.hbd

  // ✅ Recheck insufficient funds whenever toggle changes or balance loads
  useEffect(() => {
    setInsufficient(required > available)
  }, [required, available])

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
      <td><strong>Bet:</strong></td>
      <td style={{ paddingLeft: 24 }}>
        {(game?.bet ?? 0).toFixed(3)} {game?.asset}
      </td>
    </tr>

    {pfm && (
      <tr>
        <td><strong>+ First Move Purchase:</strong></td>
        <td style={{ paddingLeft: 24 }}>
          {(game?.firstMovePurchase ?? 0).toFixed(3)} {game?.asset}
        </td>
      </tr>
    )}

    {/* single stroke ABOVE total */}
    <tr>
      <td colSpan={2} style={{ borderTop: '1px solid var(--color-primary-lighter)', height: 6 }} />
    </tr>

    {/* total row */}
    <tr>
      <td style={{ verticalAlign: 'top' }}><strong>Total to Join:</strong></td>
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
        {((game?.bet ?? 0) * 2).toFixed(3)} {game?.asset}
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
