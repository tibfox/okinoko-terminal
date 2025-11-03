
// GameSelect.jsx
import { useState, useEffect } from 'preact/hooks'
import NeonButton from '../buttons/NeonButton.jsx'
import NeonSwitch from '../common/NeonSwitch.jsx'
import ListButton from '../buttons/ListButton.jsx'

import FloatingLabelInput from '../common/FloatingLabelInput.jsx'
import { useVscQuery } from '../../lib/useVscQuery.js'


export default function GameSelect({ user, contract, fn, onGameSelected, params, setParams,isMobile }) {
  
  const [newGames, setNewGames] = useState([])
  const [continueGames, setContinueGames] = useState([])
  const [fmpActive, setPfmActive] = useState(false)

  // UI mode: create | continue | join
  const [view, setView] = useState('continue')

  const [balances, setBalances] = useState({ hive: 0, hbd: 0 })
  const { runQuery } = useVscQuery()



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

  // Reusable Game Table Component
  const GameTable = ({ type, games, onClick }) => {
    if (!games?.length) return null

    return (
      <>
        <h4>{type == 'join'?'Join a New Game':'Continue a Game'}</h4>
        <div class="game-selection-table">
          <table style={{ width: '100%', tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th style={{ width: '10%' }}>ID</th>
                <th style={{ width: '35%' }}>{type == 'join'?'Creator':'Opponent'}</th>
                <th style={{ width: '15%' }}>Bet</th>
                <th style={{ width: '13%' }}>Asset</th>
                <th style={{ width: '15%' }}>FMP</th>
              </tr>
            </thead>
          </table>

          <div class="game-table-body">
            <table style={{ width: '100%', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '10%' }} />
                <col style={{ width: '35%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '15%' }} />
              </colgroup>
              <tbody>
  {games.map(g => (
    <tr
      key={g.id}
      onClick={() => onClick(g)}
      style={{ cursor: 'pointer', background: params.__gameId == g.id ? 'var(--color-primary-darkest)' : 'transparent' }}
      class="game-row"
    >
      <td>{g.id}</td>
      <td >{type == 'join' ? g.creator:(g.creator != (user.startsWith('hive:') ? user : `hive:${user}`) ? g.creator : g.opponent)}</td>
      <td>{g.bet}</td>
      <td>{g.asset}</td>
      <td>{g.firstMovePurchase>0?g.firstMovePurchase:'-' }</td>
    </tr>
  ))}
</tbody>

            </table>
          </div>
        </div>
      </>
    )
  }

  // Mock data
  useEffect(() => {
    const allNewGames = [
      { id: 3, name: 'Testgame', creator: 'hive:tibfox', lastMoveOn: '2025-10-30 14:00:00',lastMoveMinutesAgo:700,createdOn: '2025-10-30 14:00:00', playerX:'',playerY:'',opponent: '', turn: '1', bet: 1.001, firstMovePurchase: 0.001, asset: 'HIVE', type: 'TicTacToe5', state: 'waiting', board: '0000100200000000000000000' },
      { id: 4, name: 'Testgame', creator: 'hive:tibfox.vsc', lastMoveOn: '2025-10-30 14:00:00',lastMoveMinutesAgo:700,createdOn: '2025-10-30 14:00:00', playerX:'',playerY:'',opponent: '', turn: '1', bet: 4.001, firstMovePurchase: 0.000, asset: 'HIVE', type: 'Connect4', state: 'waiting', board: '000000000000000000000000000000000000000000' },
      { id: 5, name: 'Testgame', creator: 'hive:tibfox', lastMoveOn: '2025-10-30 14:00:00',lastMoveMinutesAgo:700,createdOn: '2025-10-30 14:00:00', playerX:'',playerY:'',opponent: '', turn: '1', bet: 5.000, firstMovePurchase: 0.000, asset: 'HIVE', type: 'Gomoku', state: 'waiting', board: '000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000' },
      { id: 8, name: 'Testgame', creator: 'hive:tibfox', lastMoveOn: '2025-10-30 14:00:00',lastMoveMinutesAgo:700,createdOn: '2025-10-30 14:00:00', playerX:'',playerY:'',opponent: '', turn: '1', bet: 0.002, firstMovePurchase: 0.001, asset: 'HBD', type: 'TicTacToe', state: 'waiting', board: '000000000' },
      { id: 11, name: 'Testgame', creator: 'hive:tibfox', lastMoveOn: '2025-10-30 14:00:00',lastMoveMinutesAgo:700,createdOn: '2025-10-30 14:00:00', playerX:'',playerY:'',opponent: '', turn: '1', bet: 4.001, firstMovePurchase: 2.000, asset: 'HBD', type: 'Squava', state: 'waiting', board: '0000100200000000000000000' },
      { id: 12, name: 'Testgame #2', creator: 'hive:tibfox', lastMoveOn: '2025-10-30 14:00:00',lastMoveMinutesAgo:700,createdOn: '2025-10-30 14:00:00', playerX:'',playerY:'',opponent: '', turn: '1', bet: 0.000, firstMovePurchase: 0.000, asset: 'HBD', type: 'TicTacToe', state: 'waiting', board: '000000000' },
      { id: 13, name: 'Testgame #3', creator: 'hive:tasdadasdadadibfox', lastMoveOn: '2025-10-30 14:00:00',lastMoveMinutesAgo:700,createdOn: '2025-10-30 14:00:00', playerX:'',playerY:'', opponent: '', turn: '1', bet: 100.001, firstMovePurchase: 10.000, asset: 'HBD', type: 'TicTacToe', state: 'waiting', board: '000000000' },
      { id: 14, name: 'Testgame #4', creator: 'hive:tibfox', lastMoveOn: '2025-10-30 14:00:00',lastMoveMinutesAgo:700,createdOn: '2025-10-30 14:00:00', playerX:'',playerY:'', opponent: '', turn: '1', bet: 100.001, firstMovePurchase: 10.000, asset: 'HBD', type: 'TicTacToe', state: 'waiting', board: '000000000' },
      { id: 15, name: 'Testgame #5', creator: 'hive:tibfox', lastMoveOn: '2025-10-30 14:00:00',lastMoveMinutesAgo:700,createdOn: '2025-10-30 14:00:00', playerX:'',playerY:'', opponent: '', turn: '1', bet: 100.001, firstMovePurchase: 10.000, asset: 'HBD', type: 'TicTacToe', state: 'waiting', board: '000000000' },
      { id: 16, name: 'Testgame #6', creator: 'hive:tibfox', lastMoveOn: '2025-10-30 14:00:00',lastMoveMinutesAgo:700,createdOn: '2025-10-30 14:00:00', playerX:'',playerY:'', opponent: '', turn: '1', bet: 100.001, firstMovePurchase: 10.000, asset: 'HBD', type: 'TicTacToe', state: 'waiting', board: '000000000' },
      { id: 17, name: 'Testgame #7', creator: 'hive:tibfox', lastMoveOn: '2025-10-30 14:00:00',lastMoveMinutesAgo:700,createdOn: '2025-10-30 14:00:00', playerX:'',playerY:'', opponent: '', turn: '1', bet: 100.001, firstMovePurchase: 10.000, asset: 'HBD', type: 'TicTacToe', state: 'waiting', board: '000000000' },
    ]

    const allContinueGames = [
      { id: 7, name: 'Testgame 123', creator: 'hive:diytube', lastMoveOn: '2025-10-30 14:00:00',lastMoveMinutesAgo:700,createdOn: '2025-10-30 14:00:00', playerX:'hive:tibfox',playerY:'hive:tibfox.vsc', opponent: 'hive:tibfox', turn: '2', bet: 1.001, firstMovePurchase: 0.001, asset: 'HBD', type: 'TicTacToe5', state: 'play', board: '0000100200000000000000000' },
      { id: 18, name: 'Testgame ABC', creator: 'hive:diytube', lastMoveOn: '2025-10-30 14:00:00',lastMoveMinutesAgo:70000,createdOn: '2025-10-30 14:00:00', playerX:'hive:tibfox',playerY:'hive:tibfox.vsc', opponent: 'hive:tibfox', turn: '1', bet: 0.000, firstMovePurchase: 0.001, asset: 'HBD', type: 'TicTacToe5', state: 'play', board: '0000100200000000000000000' },
      { id: 6, name: 'Testgame', creator: 'hive:tibfox.vsc', lastMoveOn: '2025-10-30 14:00:00',lastMoveMinutesAgo:700,createdOn: '2025-10-30 14:00:00', playerX:'hive:diytube',playerY:'hive:tibfox.vsc', opponent: 'hive:diytube', turn: '2', bet: 0.010, firstMovePurchase: 0.001, asset: 'HIVE', type: 'Gomoku', state: 'play', board: '000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000010000000000000012000000000000012000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000' },
      { id: 1, name: 'Testgame', creator: 'hive:tibfox.vsc', lastMoveOn: '2025-10-30 14:00:00',lastMoveMinutesAgo:700,createdOn: '2025-10-30 14:00:00', playerX:'hive:diytube',playerY:'hive:tibfox.vsc', opponent: 'hive:diytube', turn: '2', bet: 0.001, firstMovePurchase: 0.001, asset: 'HIVE', type: 'TicTacToe', state: 'play', board: '000000000' },
      { id: 2, name: 'Testgame', creator: 'hive:diytube', lastMoveOn: '2025-10-30 14:00:00',lastMoveMinutesAgo:700,createdOn: '2025-10-30 14:00:00', playerX:'hive:diytube',playerY:'hive:tibfox.vsc', opponent: 'hive:tibfox.vsc', turn: '1', bet: 1.001, firstMovePurchase: 0.001, asset: 'HBD', type: 'Connect4', state: 'play', board: '000000000000001000000100000010000002200000' },
      { id: 20, name: 'Testgame', creator: 'hive:diytube', lastMoveOn: '2025-10-30 14:00:00',lastMoveMinutesAgo:700,createdOn: '2025-10-30 14:00:00', playerX:'hive:diytube',playerY:'hive:tibfox.vsc', opponent: 'hive:tibfox.vsc', turn: '2', bet: 1.001, firstMovePurchase: 0.001, asset: 'HBD', type: 'Connect4', state: 'play', board: '000000000000001000000100000010000002200000' },
      { id: 9, name: 'Testgame', creator: 'hive:diytube', lastMoveOn: '2025-10-30 14:00:00',lastMoveMinutesAgo:700,createdOn: '2025-10-30 14:00:00', playerX:'hive:tibfox.vsc',playerY:'hive:diytube', opponent: 'hive:tibfox.vsc', turn: '2', bet: 0.050, firstMovePurchase: 0.001, asset: 'HIVE', type: 'Gomoku', state: 'swap', board: '000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000010000000000000012000000000000012000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000' },
      { id: 10, name: 'Testgame', creator: 'hive:diytube', lastMoveOn: '2025-10-30 14:00:00',lastMoveMinutesAgo:700,createdOn: '2025-10-30 14:00:00', playerX:'hive:diytube',playerY:'hive:tibfox.vsc', opponent: 'hive:tibfox.vsc', turn: '1', bet: 1.001, firstMovePurchase: 0.001, asset: 'HBD', type: 'Squava', state: 'play', board: '0000100200000000000000000' },
       { id: 19, name: 'Testgame', creator: 'hive:diytube', lastMoveOn: '2025-10-30 14:00:00',lastMoveMinutesAgo:700,createdOn: '2025-10-30 14:00:00', playerX:'hive:diytube',playerY:'hive:tibfox.vsc', opponent: 'hive:tibfox.vsc', turn: '2', bet: 1.001, firstMovePurchase: 0.001, asset: 'HBD', type: 'Squava', state: 'play', board: '0000100200000000000000000' },
    ]

    const typeKey = fn?.name
    setNewGames(allNewGames.filter(g => !typeKey || g.type === typeKey))
    setContinueGames(allContinueGames.filter(g => !typeKey || g.type === typeKey))
    
  }, [fn])

 
  const handleJoin = game => onGameSelected?.(game, 'g_join')
  const handleLoad = game => onGameSelected?.(game, 'continue')

  const current = params["__gameCreateBet"] ?? { amount: '', asset: 'HIVE' }
  const fmpAmount = params["__gameCreateFmp"] ?? 0

  const available =
    current.asset === 'HIVE' ? balances.hive : balances.hbd

  const parsed = parseFloat(String(current.amount || '').replace(',', '.'))
  const exceeds = !isNaN(parsed) && parsed > available
  const fmpParsed = parseFloat(String(fmpAmount || '').replace(',', '.'))
  const fmpInvalid = fmpActive && (isNaN(fmpParsed) || fmpParsed <= 0)


  const onAmountChange = (e) => {
    let val = e.target.value.replace(',', '.')

    // allow 0–3 decimals, or empty
    if (/^\d*([.]\d{0,3})?$/.test(val) || val === '') {
      setParams(prev => ({
        ...prev,
        __gameCreateBet: { ...current, amount: val }
      }))
    }
  }

  const onFmpAmountChange = (e) => {
    let val = e.target.value.replace(',', '.')

    // allow 0–3 decimals, or empty
    if (/^\d*([.]\d{0,3})?$/.test(val) || val === '') {
      setParams(prev => ({
        ...prev,
        __gameCreateFmp: val
      }))
    }
  }

  const onAmountBlur = (e) => {
    const val = parseFloat(String(e.target.value).replace(',', '.'))
    if (!isNaN(val)) {
      setParams(prev => ({
        ...prev,
        __gameCreateBet: { ...current, amount: val.toFixed(3) }
      }))
    }
  }


  const onFmpAmountBlur = (e) => {
    const val = parseFloat(String(e.target.value).replace(',', '.'))
    if (!isNaN(val)) {
      setParams(prev => ({
        ...prev,
        __gameCreateFmp: val.toFixed(3)
      }))
    }
  }




  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', paddingRight: isMobile ? '0' : '10px' }}>

      {/* Header */}
      <table style={{ width: '100%', tableLayout: 'fixed' }}>
         <colgroup>
                <col style={{ width: '25%' }} />
                <col style={{ width: '70%' }} />
                
              </colgroup>
        <tbody>
          <tr><td><strong>User:</strong></td><td>{user}</td></tr>
          <tr><td><strong>Contract:</strong></td><td>{contract?.name}</td></tr>
          <tr><td><strong>Game Type:</strong></td><td>{fn?.friendlyName}</td></tr>
        </tbody>
      </table>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', margin: '15px 0' }}>
       <ListButton 
       
      //  style={{ opacity: view === 'continue' ? 1 : 0.5 }}
style={{
            backgroundColor:
              view === 'continue'
                ? 'var(--color-primary-darker)'
                : 'var(--color-primary-darkest)',
            color:
              view === 'continue'
                ? 'var(--color-primary-lightest)'
                : 'var(--color-primary-lighter)',
            textAlign: 'center',
            whiteSpace: 'nowrap',
            padding: '0.5em 1em',
            // border: 'none',
            // borderRadius: '2px',
            cursor: 'pointer',

            // 👇 prevent full-width stretch
            // display: 'inline-flex',
            // flex: '0 0 auto',
            // width: 'auto',
          }}

          onClick={() => {
            setView('continue')
            setParams(prev => ({
              __gameAction: null,
              __gameId: null,
            }))
            onGameSelected?.(null, null)
          }}>Continue</ListButton>
       
        <ListButton 
        
        style={{
            backgroundColor:
              view === 'g_join'
                ? 'var(--color-primary-darker)'
                : 'var(--color-primary-darkest)',
            color:
              view === 'g_join'
                ? 'var(--color-primary-lightest)'
                : 'var(--color-primary-lighter)',
            textAlign: 'center',
            whiteSpace: 'nowrap',
            padding: '0.5em 1em',
            // border: 'none',
            // borderRadius: '2px',
            cursor: 'pointer',

            // 👇 prevent full-width stretch
            // display: 'inline-flex',
            // flex: '0 0 auto',
            // width: 'auto',
          }}

          onClick={() => {
            setView('g_join')
            setParams(prev => ({
              __gameAction: 'g_join',
              __gameId: null,
            }))
            onGameSelected?.(null, null)
          }}>Lobby</ListButton>

        

        <ListButton 

         style={{
            backgroundColor:
              view === 'create'
                ? 'var(--color-primary-darker)'
                : 'var(--color-primary-darkest)',
            color:
              view === 'create'
                ? 'var(--color-primary-lightest)'
                : 'var(--color-primary-lighter)',
            textAlign: 'center',
            whiteSpace: 'nowrap',
            padding: '0.5em 1em',
            // border: 'none',
            // borderRadius: '2px',
            cursor: 'pointer',

            // 👇 prevent full-width stretch
            // display: 'inline-flex',
            // flex: '0 0 auto',
            // width: 'auto',
          }}
          onClick={() => {
            setView('create')
            setParams(prev => ({
              __gameAction: 'g_create',
              __gameId: null,
              __gameCreateType:"1"
            }))
            onGameSelected?.(null, 'g_create')
          }}>Create Game</ListButton>

      </div>

      {/* Create form */}
      {view === 'create' && (
        <div style={{ marginTop: '10px' }}>
          <FloatingLabelInput
            label='Name (optional)'
            type="text"
            placeholder="My game"
            value={params["__gameCreateName"]}
            onChange={(e) =>
              setParams((prev) => ({
                ...prev,
                ["__gameCreateName"]: e.target.value,
              }))
            }
            style={{ marginTop: '4px' }}
          />

          <div
            style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '20px'
            }}
          >
            <FloatingLabelInput
              type="text"
              inputMode="decimal"
              placeholder="Amount"
              label="Bet (optional)"
              value={current.amount}
              onChange={onAmountChange}
              onBlur={onAmountBlur}
              style={{
                flex: '0 0 50%',
                borderColor: exceeds ? 'red' : 'var(--color-primary-lighter)',
                boxShadow: exceeds ? '0 0 8px red' : 'none',
              }}
            />

            <select
              className="vsc-input"
              value={current.asset}
              onChange={(e) =>
                setParams((prev) => ({
                  ...prev,
                  ["__gameCreateBet"]: { ...current, asset: e.target.value },
                }))
              }
              style={{
                flex: '0 0 20%',
                appearance: 'none',
                backgroundColor: 'black',
                padding: '0 20px 0 8px',
                backgroundImage:
                  'linear-gradient(45deg, transparent 50%, var(--color-primary-lighter) 50%), linear-gradient(135deg, var(--color-primary-lighter) 50%, transparent 50%)',
                backgroundPosition:
                  'calc(100% - 12px) center, calc(100% - 7px) center',
                backgroundSize: '5px 5px, 5px 5px',
                backgroundRepeat: 'no-repeat',
                color: 'var(--color-primary-lighter)',
              }}
            >
              <option value="HIVE">HIVE</option>
              <option value="HBD">HBD</option>
            </select>

            <span
              style={{
                flex: '0 0 auto',
                fontSize: '0.8rem',
                color: exceeds ? 'red' : 'var(--color-primary-lighter)',
              }}
            >
              {available.toFixed(3)} {current.asset}
            </span>
          </div>
          <div
            style={{

              marginTop: '20px'
            }}
          >
            <NeonSwitch
              name="Enable to buy off the first move from you?"
              checked={fmpActive}
              onChange={(val) => {
                // Update UI switch
                setPfmActive(val)

                // Also store in params used by transaction logic
                setParams(prev => ({
                  ...prev,
                  __gameFmpEnabled: val
                }))
              }}
            />
            {fmpActive && (

              <div style={{
                marginTop: '20px'
              }}>
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >

                  <FloatingLabelInput
                    type="text"
                    inputMode="decimal"
                    placeholder="Amount"
                    label="First Move Payment (optional)"
                    value={fmpAmount}
                    onChange={onFmpAmountChange}
                    onBlur={onFmpAmountBlur}
                    style={{
                      flex: '0 0 70%',
                      borderColor: fmpInvalid ? 'red' : 'var(--color-primary-lighter)',
                      boxShadow: fmpInvalid ? '0 0 8px red' : 'none',
                    }}
                  />

                  <span
                    style={{
                      flex: '0 0 auto',
                      fontSize: '0.8rem',
                      color: fmpInvalid ? 'red' : 'var(--color-primary-lighter)',
                    }}
                  >
                    {fmpAmount} {current.asset}
                  </span>
                </div>
                <div style={{
                  marginTop: '20px'
                }}>
                  This amount will be sent to your wallet in return of the first move in the game.
                </div>
              </div>
            )}
          </div>

        </div>

      )}

      {/* Reused table for continue */}
      {view === 'continue' && (
        <GameTable
          type="continue"
          games={continueGames}
          onClick={handleLoad}
        />
      )}

      {/* Reused table for join */}
      {view === 'g_join' && (
        <GameTable
          type="join"
          games={newGames}
          onClick={handleJoin}
        />
      )}
    </div>
  )
}

