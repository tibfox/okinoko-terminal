
// GameSelect.jsx
import { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'preact/hooks'
import { useQuery } from '@urql/preact'
import NeonButton from '../buttons/NeonButton.jsx'
import NeonSwitch from '../common/NeonSwitch.jsx'
import ListButton from '../buttons/ListButton.jsx'

import FloatingLabelInput from '../common/FloatingLabelInput.jsx'
import { LOBBY_QUERY, ACTIVE_GAMES_FOR_PLAYER_QUERY } from '../../data/inarow_gql.js'
import { useAccountBalances } from '../terminal/providers/AccountBalanceProvider.jsx'
import GamblingInfoIcon from '../common/GamblingInfoIcon.jsx'
import { GAME_TYPE_IDS, typeNameFromId, deriveGameTypeId } from './gameTypes.js'
import { Tabs } from '../common/Tabs.jsx'
import { useLobbySubscription } from './providers/LobbySubscriptionProvider.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlay } from '@fortawesome/free-solid-svg-icons'
import { getCookie, setCookie } from '../../lib/cookies.js'

const ensureHiveAddress = (value) =>
  !value ? null : value.startsWith('hive:') ? value : `hive:${value}`
const toNumericVar = (value) =>
  value === null || value === undefined ? null : value.toString()
const normalizeAmount = (value) => {
  if (value === null || value === undefined) return null
  const num = Number(value)
  return Number.isNaN(num) ? null : num / 1000
}

export default function GameSelect({ user, contract, fn, onGameSelected, params, setParams,isMobile }) {

  const [newGames, setNewGames] = useState([])
  const [continueGames, setContinueGames] = useState([])
  const [fmpActive, setPfmActive] = useState(false)

  // Sort state for lobby and continue tables with cookie persistence
  const [lobbySortKey, setLobbySortKey] = useState(() => getCookie('lobbySortKey') || 'creator')
  const [lobbySortDir, setLobbySortDir] = useState(() => getCookie('lobbySortDir') || 'asc')
  const [continueSortKey, setContinueSortKey] = useState(() => getCookie('continueSortKey') || 'nextTurn')
  const [continueSortDir, setContinueSortDir] = useState(() => getCookie('continueSortDir') || 'asc')
  const normalizedUser = useMemo(() => ensureHiveAddress(user), [user])
  const gameTypeId = useMemo(() => deriveGameTypeId(fn?.name), [fn])
  const normalizedGameType = gameTypeId != null ? Number(gameTypeId) : null
  const lobbyReadyRef = useRef(false)
  const activeReadyRef = useRef(false)
  const { updateCounter } = useLobbySubscription()

  const [lobbyResult, reexecuteLobby] = useQuery({
    query: LOBBY_QUERY,
    pause: !gameTypeId,
    requestPolicy: 'network-only',
    variables:
      gameTypeId !== null && gameTypeId !== undefined
        ? { gameType: toNumericVar(gameTypeId) }
        : undefined,
  })
  const [activeResult, reexecuteActive] = useQuery({
    query: ACTIVE_GAMES_FOR_PLAYER_QUERY,
    pause: !gameTypeId || !normalizedUser,
    requestPolicy: 'network-only',
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

  // Re-execute queries when lobby subscription updates
  useEffect(() => {
    if (updateCounter > 0) {
      if (reexecuteLobby && lobbyReadyRef.current) {
        reexecuteLobby({ requestPolicy: 'network-only' })
      }
      if (reexecuteActive && activeReadyRef.current) {
        reexecuteActive({ requestPolicy: 'network-only' })
      }
    }
  }, [updateCounter, reexecuteLobby, reexecuteActive])

  // UI mode: create | continue | join
  const [view, setView] = useState('continue')

  const { balances: accountBalances } = useAccountBalances()
  const balances = useMemo(() => {
    if (!accountBalances) return { hive: 0, hbd: 0 }
    return {
      hive: Number(accountBalances.hive ?? 0) / 1000,
      hbd: Number(accountBalances.hbd ?? 0) / 1000,
    }
  }, [accountBalances])

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
      moveType: 'm',
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
      const moveType = row.movetype || 'm'

      // Calculate lastMoveMinutesAgo from indexer_ts
      let lastMoveMinutesAgo = 0
      if (row.indexer_ts) {
        const lastMoveDate = new Date(row.indexer_ts)
        const now = new Date()
        const diffMs = now - lastMoveDate
        lastMoveMinutesAgo = Math.floor(diffMs / (1000 * 60))
      }

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
        moveType,
        state: moveType || 'play',
        board: null,
        lastMoveBy: row.last_move_by,
        lastMoveMinutesAgo,
        lastMoveTimestamp: row.indexer_ts || null,
      }
    })
    setContinueGames(nextGames)
  }, [activeData, gameTypeId, normalizedUser])

  const [hasLobbyLoaded, setHasLobbyLoaded] = useState(false)
  const [hasActiveLoaded, setHasActiveLoaded] = useState(false)
  const [hasAutoSwitched, setHasAutoSwitched] = useState(false)
  useEffect(() => {
    setHasLobbyLoaded(false)
    setHasAutoSwitched(false)  // Reset auto-switch when game type changes
  }, [gameTypeId])
  useEffect(() => {
    setHasActiveLoaded(false)
  }, [gameTypeId, normalizedUser])
  useEffect(() => {
    if (!hasLobbyLoaded && lobbyData && !lobbyFetching) {
      setHasLobbyLoaded(true)
    }
    lobbyReadyRef.current = Boolean(lobbyData) && !lobbyFetching
  }, [hasLobbyLoaded, lobbyData, lobbyFetching])
  useEffect(() => {
    if (!hasActiveLoaded && activeData && !activeFetching) {
      setHasActiveLoaded(true)
    }
    activeReadyRef.current = Boolean(activeData) && !activeFetching
  }, [hasActiveLoaded, activeData, activeFetching])
  const lobbyLoading = !hasLobbyLoaded && Boolean(gameTypeId && lobbyFetching)
  const activeLoading = !hasActiveLoaded && Boolean(gameTypeId && normalizedUser && activeFetching)

  // Auto-switch tabs when user has no running games
  // Only runs once when both lobby and active data have loaded
  useEffect(() => {
    if (hasAutoSwitched || !hasActiveLoaded || !hasLobbyLoaded) return
    // Only auto-switch if we're on the default continue view
    if (view !== 'continue') return
    if (continueGames.length === 0) {
      if (newGames.length > 0) {
        setView('g_join')
      } else {
        setView('create')
        // Set params and trigger onGameSelected when auto-switching to create
        setParams((prev) => ({
          __gameAction: 'g_create',
          __gameId: null,
          __gameCreateType:
            gameTypeId != null
              ? String(gameTypeId)
              : prev?.__gameCreateType ?? '',
        }))
        onGameSelected?.(null, 'g_create')
      }
      setHasAutoSwitched(true)
    }
  }, [hasAutoSwitched, hasActiveLoaded, hasLobbyLoaded, continueGames.length, newGames.length, gameTypeId, setParams, onGameSelected, view])

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

  const formatAmount = (val) => {
    if (val === null || val === undefined) return '-'
    const num = typeof val === 'number' ? val : Number(val)
    if (Number.isNaN(num) || num === 0) return '-'
    return num.toFixed(3)
  }
  const formatAsset = (asset) => (asset ? String(asset).toUpperCase() : '-')

  const stripHivePrefix = (username) => {
    if (!username) return username
    return username.startsWith('hive:') ? username.slice(5) : username
  }

  // Sort handlers for lobby and continue tables
  const handleLobbySortChange = (nextKey) => {
    if (lobbySortKey === nextKey) {
      const newDir = lobbySortDir === 'desc' ? 'asc' : 'desc'
      setLobbySortDir(newDir)
      setCookie('lobbySortDir', newDir, 30)
    } else {
      setLobbySortKey(nextKey)
      setLobbySortDir('desc')
      setCookie('lobbySortKey', nextKey, 30)
      setCookie('lobbySortDir', 'desc', 30)
    }
  }

  const handleContinueSortChange = (nextKey) => {
    if (continueSortKey === nextKey) {
      const newDir = continueSortDir === 'desc' ? 'asc' : 'desc'
      setContinueSortDir(newDir)
      setCookie('continueSortDir', newDir, 30)
    } else {
      setContinueSortKey(nextKey)
      setContinueSortDir('desc')
      setCookie('continueSortKey', nextKey, 30)
      setCookie('continueSortDir', 'desc', 30)
    }
  }

  // Reusable Game Table Component
  const GameTable = ({ type, games, onClick, loading, error, sortKey, sortDir, onSortChange }) => {
    const scrollContainerRef = useRef(null)
    const scrollPositionRef = useRef(0)

    // Save scroll position on every scroll event
    useEffect(() => {
      const container = scrollContainerRef.current
      if (!container) return

      const handleScroll = () => {
        scrollPositionRef.current = container.scrollTop
      }

      container.addEventListener('scroll', handleScroll, { passive: true })
      return () => container.removeEventListener('scroll', handleScroll)
    }, [])

    // Restore scroll position after games update, using useLayoutEffect for synchronous execution
    useLayoutEffect(() => {
      const container = scrollContainerRef.current
      if (container && scrollPositionRef.current > 0) {
        container.scrollTop = scrollPositionRef.current
      }
    }, [games])

    // Client-side sorting
    const sortedGames = useMemo(() => {
      if (!games || games.length === 0) return games

      const sorted = [...games]
      sorted.sort((a, b) => {
        let aVal, bVal

        switch (sortKey) {
          case 'creator':
            aVal = stripHivePrefix(a.creator || '').toLowerCase()
            bVal = stripHivePrefix(b.creator || '').toLowerCase()
            break
          case 'nextTurn':
            // For continue games: prioritize "my turn" first
            const aIsMyTurn = type === 'continue' && normalizedUser && a.nextTurnPlayer === normalizedUser
            const bIsMyTurn = type === 'continue' && normalizedUser && b.nextTurnPlayer === normalizedUser
            if (aIsMyTurn && !bIsMyTurn) return sortDir === 'asc' ? -1 : 1
            if (!aIsMyTurn && bIsMyTurn) return sortDir === 'asc' ? 1 : -1
            // Otherwise sort alphabetically by next turn player
            aVal = stripHivePrefix(a.nextTurnPlayer || '').toLowerCase()
            bVal = stripHivePrefix(b.nextTurnPlayer || '').toLowerCase()
            break
          case 'opponent':
            aVal = stripHivePrefix(a.opponent || '').toLowerCase()
            bVal = stripHivePrefix(b.opponent || '').toLowerCase()
            break
          case 'bet':
            aVal = Number(a.bet) || 0
            bVal = Number(b.bet) || 0
            break
          default:
            return 0
        }

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
          if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
        } else {
          if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
          if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
        }
        return 0
      })
      return sorted
    }, [games, sortKey, sortDir, type, normalizedUser])

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

    const creatorHeader = type === 'join' ? 'Creator' : 'Next Turn'
    const opponentHeader = type === 'join' ? null : 'Opponent'

    const renderSortArrow = (columnKey) => {
      if (sortKey !== columnKey) return null
      return sortDir === 'asc' ? ' ▲' : ' ▼'
    }

    return (
      <>
        {/* {type == 'join'?'Join a New Game':'Continue a Game'}: */}
        <div class="game-selection-table">
          <div class="game-table-wrapper" ref={scrollContainerRef}>
            <table style={{ width: '100%', tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th></th>
                  <th
                    onClick={() => onSortChange(type === 'join' ? 'creator' : 'nextTurn')}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    {creatorHeader}{renderSortArrow(type === 'join' ? 'creator' : 'nextTurn')}
                  </th>
                  {type === 'continue' && (
                    <th
                      onClick={() => onSortChange('opponent')}
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                    >
                      {opponentHeader}{renderSortArrow('opponent')}
                    </th>
                  )}
                  <th
                    onClick={() => onSortChange('bet')}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      Bet
                      <GamblingInfoIcon size={14} style={{ marginLeft: 0 }} context="game" />
                    </span>
                    {renderSortArrow('bet')}
                  </th>
                </tr>
              </thead>
              <tbody>
  {sortedGames.map(g => {
    const isMyTurn = type === 'continue' && normalizedUser && g.nextTurnPlayer === normalizedUser && g.opponent
    const betDisplay = formatAmount(g.bet)
    const betWithAsset = betDisplay === '-' ? '-' : `${betDisplay} ${formatAsset(g.asset)}`

    return (
      <tr
        key={g.id}
        onClick={() => onClick(g)}
        style={{
          cursor: 'pointer',
          ...(params.__gameId == g.id && { background: 'var(--color-primary-darkest)' })
        }}
        class="game-row"
      >
        <td style={{ textAlign: 'center', fontSize: 'var(--font-size-base)' }}>
          {isMyTurn && <FontAwesomeIcon icon={faPlay} style={{ fontSize:'0.9rem',color: 'var(--color-primary-lighter)' }} />}
        </td>
        <td>
          {type === 'join'
            ? stripHivePrefix(g.creator)
            : (!g.opponent
                ? '-'
                : (isMyTurn
                    ? 'your turn'
                    : 'opponent'))}
        </td>
        {type === 'continue' && (
          <td>{g.opponent ? stripHivePrefix(g.opponent) : 'no one joined yet'}</td>
        )}
        <td>{betWithAsset}</td>
      </tr>
    )
  })}
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
  const betDefined = !Number.isNaN(parsed) && parsed > 0
  const fmpParsed = parseFloat(String(fmpAmount || '').replace(',', '.'))
  const fmpInvalid = fmpActive && (isNaN(fmpParsed) || fmpParsed <= 0)

  useEffect(() => {
    if (betDefined || !fmpActive) {
      return
    }
    setPfmActive(false)
    setParams(prev => ({
      ...prev,
      __gameFmpEnabled: false
    }))
  }, [betDefined, fmpActive, setParams])


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

     
        <div 
         style={{ marginBottom: '15px' }}
        >
        <Tabs
          tabs={[
            { id: 'continue', label: 'Continue' },
            { id: 'g_join', label: 'Lobby' },
            { id: 'create', label: 'Create' },
          ]}
          activeTab={view}
          onChange={(tabId) => {
            setView(tabId)

            if (tabId === 'continue') {
              setParams((prev) => ({ __gameAction: null, __gameId: null }))
              onGameSelected?.(null, null)
              reexecuteActive?.({ requestPolicy: 'network-only' })
            }

            if (tabId === 'g_join') {
              setParams((prev) => ({
                __gameAction: 'g_join',
                __gameId: null,
              }))
              onGameSelected?.(null, null)
              reexecuteLobby?.({ requestPolicy: 'network-only' })
            }

            if (tabId === 'create') {
              setParams((prev) => ({
                __gameAction: 'g_create',
                __gameId: null,
                __gameCreateType:
                  gameTypeId != null
                    ? String(gameTypeId)
                    : prev?.__gameCreateType ?? '',
              }))
              onGameSelected?.(null, 'g_create')
            }
          }}
        />
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '0 0 50%' }}>
              <FloatingLabelInput
                type="text"
                inputMode="decimal"
                placeholder="Amount"
                label="Bet (optional)"
                value={current.amount}
                onChange={onAmountChange}
                onBlur={onAmountBlur}
                style={{
                  flex: 1,
                  borderColor: exceeds ? 'red' : 'var(--color-primary-lighter)',
                  boxShadow: exceeds ? '0 0 8px red' : 'none',
                }}
              />
              <GamblingInfoIcon size={16} style={{ marginLeft: 0 }} context="game" />
            </div>

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
                fontSize: 'var(--font-size-base)',
                color: exceeds ? 'red' : 'var(--color-primary-lighter)',
              }}
            >
              {available.toFixed(3)} {current.asset}
            </span>
          </div>
          {betDefined && (
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
                        fontSize: 'var(--font-size-base)',
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
          )}

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
          sortKey={continueSortKey}
          sortDir={continueSortDir}
          onSortChange={handleContinueSortChange}
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
          sortKey={lobbySortKey}
          sortDir={lobbySortDir}
          onSortChange={handleLobbySortChange}
        />
      )}
    </div>
  )
}
