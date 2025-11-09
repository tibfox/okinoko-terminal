
// GameSelect.jsx
import { useState, useEffect, useMemo } from 'preact/hooks'
import { useQuery, useSubscription } from '@urql/preact'
import NeonButton from '../buttons/NeonButton.jsx'
import NeonSwitch from '../common/NeonSwitch.jsx'
import ListButton from '../buttons/ListButton.jsx'

import FloatingLabelInput from '../common/FloatingLabelInput.jsx'
import { useVscQuery } from '../../lib/useVscQuery.js'
import { LOBBY_QUERY, ACTIVE_GAMES_FOR_PLAYER_QUERY, IAR_EVENTS_SUBSCRIPTION } from '../../data/inarow_gql.js'

const GAME_TYPE_IDS = {
  TicTacToe: 1,
  Connect4: 2,
  Gomoku: 3,
  TicTacToe5: 4,
  Squava: 5,
  GomokuFreestyle: 6,
}

const GAME_TYPE_NAMES = Object.entries(GAME_TYPE_IDS).reduce((acc, [name, id]) => {
  acc[id] = name
  return acc
}, {})

const typeNameFromId = (id) => GAME_TYPE_NAMES[id] || 'Unknown'
const ensureHiveAddress = (value) =>
  !value ? null : value.startsWith('hive:') ? value : `hive:${value}`
const toNumericVar = (value) =>
  value === null || value === undefined ? null : value.toString()
const normalizeAmount = (value) => {
  if (value === null || value === undefined) return null
  const num = Number(value)
  return Number.isNaN(num) ? null : num / 1000
}

const deriveGameTypeId = (fnName) => {
  if (!fnName) return null
  const trimmed = fnName.trim()
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed)
  }
  const colonIdx = trimmed.lastIndexOf(':')
  if (colonIdx !== -1) {
    const maybe = trimmed.slice(colonIdx + 1)
    if (/^\d+$/.test(maybe)) {
      return Number(maybe)
    }
  }
  return GAME_TYPE_IDS[trimmed] ?? null
}



export default function GameSelect({ user, contract, fn, onGameSelected, params, setParams,isMobile }) {
  
  const [newGames, setNewGames] = useState([])
  const [continueGames, setContinueGames] = useState([])
  const [fmpActive, setPfmActive] = useState(false)
  const normalizedUser = useMemo(() => ensureHiveAddress(user), [user])
  const gameTypeId = useMemo(() => deriveGameTypeId(fn?.name), [fn])
  const normalizedGameType = gameTypeId != null ? Number(gameTypeId) : null

  const [lobbyResult, reexecuteLobby] = useQuery({
    query: LOBBY_QUERY,
    pause: !gameTypeId,
    variables:
      gameTypeId !== null && gameTypeId !== undefined
        ? { gameType: toNumericVar(gameTypeId) }
        : undefined,
  })
  const [activeResult, reexecuteActive] = useQuery({
    query: ACTIVE_GAMES_FOR_PLAYER_QUERY,
    pause: !gameTypeId || !normalizedUser,
    variables:
      gameTypeId !== null &&
      gameTypeId !== undefined &&
      normalizedUser
        ? { user: normalizedUser, gameType: toNumericVar(gameTypeId) }
        : undefined,
  })
  const {
    data: lobbyData,
    fetching: lobbyFetching,
    error: lobbyError,
  } = lobbyResult
  const {
    data: activeData,
    fetching: activeFetching,
    error: activeError,
  } = activeResult

  useSubscription(
    {
      query: IAR_EVENTS_SUBSCRIPTION,
      pause: !gameTypeId,
    },
    (_, event) => {
      if (event) {
        if (reexecuteLobby) {
          reexecuteLobby({ requestPolicy: 'network-only' })
        }
        if (reexecuteActive) {
          reexecuteActive({ requestPolicy: 'network-only' })
        }
      }
      return event
    },
  )

  // UI mode: create | continue | join
  const [view, setView] = useState('continue')

  const [balances, setBalances] = useState({ hive: 0, hbd: 0 })
  const { runQuery } = useVscQuery()

  useEffect(() => {
    if (!gameTypeId) {
      setNewGames([])
      return
    }
    const rows = (lobbyData?.okinoko_iarv2_waiting_for_join ?? []).filter((row) => {
      if (normalizedGameType != null && Number(row.type) !== normalizedGameType) {
        return false
      }
      if (normalizedUser && row.creator === normalizedUser) {
        return false
      }
      return true
    })
    const nextGames = rows.map((row) => ({
      id: row.id,
      name: row.name,
      creator: row.creator,
      bet: normalizeAmount(row.betamount),
      asset: row.betasset,
      firstMovePurchase: normalizeAmount(row.fmcosts),
      type: typeNameFromId(row.type),
      playerX: row.creator,
      playerY: null,
      opponent: null,
      nextTurnPlayer: row.creator,
      turn: '1',
      state: 'waiting',
      board: null,
      lastMoveMinutesAgo: 0,
      lastMoveOn: row.created_block ?? null,
    }))
    setNewGames(nextGames)
  }, [lobbyData, gameTypeId])

  useEffect(() => {
    if (!gameTypeId || !normalizedUser) {
      setContinueGames([])
      return
    }
    const rows = (activeData?.okinoko_iarv2_active_with_turn ?? []).filter((row) =>
      normalizedGameType == null ? true : Number(row.type) === normalizedGameType,
    )
    const nextGames = rows
      .filter((row) =>
        normalizedUser ? row.creator === normalizedUser || row.joiner === normalizedUser : true,
      )
      .map((row) => {
      const playerX = row.x_player
      const playerY = row.o_player
      let opponent = null
      if (normalizedUser) {
        if (normalizedUser === row.creator) {
          opponent = row.joiner || null
        } else if (normalizedUser === row.joiner) {
          opponent = row.creator || null
        } else {
          opponent = row.creator || row.joiner
        }
      } else {
        opponent = row.creator || row.joiner
      }
      const nextTurnPlayer = row.next_turn_player
      return {
        id: row.id,
        name: row.name,
        creator: row.creator,
        opponent,
        playerX,
        playerY,
        bet: normalizeAmount(row.betamount),
        asset: row.betasset,
        firstMovePurchase: normalizeAmount(row.fmc),
        type: typeNameFromId(row.type),
        turn: nextTurnPlayer === playerX ? '1' : '2',
        nextTurnPlayer,
        state: 'play',
        board: null,
        lastMoveBy: row.last_move_by,
        lastMoveMinutesAgo: 0,
      }
    })
    setContinueGames(nextGames)
  }, [activeData, gameTypeId, normalizedUser])

  const lobbyLoading = Boolean(gameTypeId && lobbyFetching)
  const activeLoading = Boolean(gameTypeId && normalizedUser && activeFetching)

  useEffect(() => {
    if (gameTypeId == null) {
      return
    }
    setParams((prev = {}) => {
      const nextType = String(gameTypeId)
      if (prev.__gameCreateType === nextType) {
        return prev
      }
      return {
        ...prev,
        __gameCreateType: nextType,
      }
    })
  }, [gameTypeId, setParams])

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

  const formatAmount = (val) => {
    if (val === null || val === undefined) return '-'
    const num = typeof val === 'number' ? val : Number(val)
    return Number.isNaN(num) ? '-' : num.toFixed(3)
  }
  const formatAsset = (asset) => (asset ? String(asset).toUpperCase() : '-')

  // Reusable Game Table Component
  const GameTable = ({ type, games, onClick, loading, error }) => {
    if (loading) {
      return <p>Loading {type === 'join' ? 'lobby' : 'active'} games…</p>
    }
    if (error) {
      return (
        <p style={{ color: 'var(--color-error, #ff5c8d)' }}>
          Failed to load {type === 'join' ? 'lobby' : 'active'} games.
        </p>
      )
    }
    if (!games?.length) {
      return (
        <p>
          {type === 'join'
            ? 'No games available to join right now.'
            : 'No ongoing games for you yet.'}
        </p>
      )
    }

    const opponentHeader = type === 'join' ? 'Creator' : 'Next Turn'

    return (
      <>
        <h4>{type == 'join'?'Join a New Game':'Continue a Game'}</h4>
        <div class="game-selection-table">
          <table style={{ width: '100%', tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th style={{ width: '10%' }}>ID</th>
                <th style={{ width: '35%' }}>{opponentHeader}</th>
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
      <td>
        {type === 'join'
          ? g.creator
          : g.opponent
            ? (normalizedUser && g.nextTurnPlayer === normalizedUser
                ? '▸ your turn'
                : (g.nextTurnPlayer || g.opponent))
            : '⋯ waiting'}
      </td>
      <td>{formatAmount(g.bet)}</td>
      <td>{formatAsset(g.asset)}</td>
      <td>{formatAmount(g.firstMovePurchase)}</td>
    </tr>
  ))}
</tbody>

            </table>
          </div>
        </div>
      </>
    )
  }


 
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
            if (reexecuteActive) {
              reexecuteActive({ requestPolicy: 'network-only' })
            }
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
            if (reexecuteLobby) {
              reexecuteLobby({ requestPolicy: 'network-only' })
            }
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
              __gameCreateType: gameTypeId != null ? String(gameTypeId) : (prev?.__gameCreateType ?? '')
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
          loading={activeLoading}
          error={activeError}
        />
      )}

      {/* Reused table for join */}
      {view === 'g_join' && (
        <GameTable
          type="join"
          games={newGames}
          onClick={handleJoin}
          loading={lobbyLoading}
          error={lobbyError}
        />
      )}
    </div>
  )
}
