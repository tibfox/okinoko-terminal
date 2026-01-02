import { useMemo, useEffect, useContext, useState } from 'preact/hooks'
import { createContext } from 'preact'
import { useQuery, gql, useSubscription } from '@urql/preact'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDice, faCirclePlay, faUser, faStore, faHourglassHalf } from '@fortawesome/free-solid-svg-icons'
import { useAioha } from '@aioha/react-ui'
import { deriveGameTypeId } from '../StepGame/gameTypes.js'
import { playBeep } from '../../lib/beep.js'
import { IAR_EVENTS_LIVE_SUBSCRIPTION, MAX_BLOCK_HEIGHT_QUERY } from '../../data/inarow_gql.js'
import { TransactionContext } from '../../transactions/context.js'

// Context for sharing IAR2 event subscription across all game buttons
const IarEventsContext = createContext(null)

// Provider component that manages a single subscription for all game buttons
function IarEventsProvider({ children }) {
  const [updateCounter, setUpdateCounter] = useState(0)
  const [startBlock, setStartBlock] = useState(null)
  const lastEventRef = { current: null }

  const [{ data: blockData }] = useQuery({
    query: MAX_BLOCK_HEIGHT_QUERY,
    requestPolicy: 'network-only',
  })

  useEffect(() => {
    if (blockData?.okinoko_iarv2_all_events?.[0]?.indexer_block_height) {
      const currentBlock = blockData.okinoko_iarv2_all_events[0].indexer_block_height
      setStartBlock(currentBlock)
    }
  }, [blockData])

  const [iarResult] = useSubscription({
    query: IAR_EVENTS_LIVE_SUBSCRIPTION,
    variables: startBlock ? { fromBlock: startBlock } : undefined,
    pause: !startBlock,
  })

  useEffect(() => {
    if (iarResult.data) {
      const events = iarResult.data?.okinoko_iarv2_all_events_stream
      if (events && events.length > 0) {
        const latestEvent = events[events.length - 1]
        const eventKey = `${latestEvent.event_type}-${latestEvent.id}-${latestEvent.indexer_block_height}`
        if (lastEventRef.current !== eventKey) {
          lastEventRef.current = eventKey
          setUpdateCounter((prev) => prev + 1)
        }
      }
    }
  }, [iarResult.data])

  return (
    <IarEventsContext.Provider value={updateCounter}>
      {children}
    </IarEventsContext.Provider>
  )
}

function useIarEvents() {
  return useContext(IarEventsContext)
}

const GAME_COUNTS_QUERY = gql`
  query GameCounts($gameType: numeric!, $user: String!) {
    lobby: okinoko_iarv2_waiting_for_join_aggregate(
      where: {
        type: { _eq: $gameType }
        creator: { _neq: $user }
      }
    ) {
      aggregate {
        count
      }
    }
    active: okinoko_iarv2_active_with_turn_aggregate(
      where: {
        type: { _eq: $gameType }
        _or: [{ creator: { _eq: $user } }, { joiner: { _eq: $user } }]
      }
    ) {
      aggregate {
        count
      }
    }
    myTurn: okinoko_iarv2_active_with_turn(
      where: {
        type: { _eq: $gameType }
        next_turn_player: { _eq: $user }
        joiner: { _is_null: false }
      }
    ) {
      id
    }
  }
`

function FunctionGridInner({ selectedContract, fnName, setFnName }) {
  const { user } = useAioha()
  const normalizedUser = useMemo(() => {
    const u = (user || '').replace(/^hive:/i, '').toLowerCase()
    return u ? `hive:${u}` : ''
  }, [user])

  const grouped = useMemo(() => {
    const fns = selectedContract?.functions || []
    const groups = []
    fns.forEach((fn) => {
      const key = (fn.groupHeader || '').trim()
      let group = groups.find((g) => g.key === key)
      if (!group) {
        group = { key, label: key || null, items: [] }
        groups.push(group)
      }
      group.items.push(fn)
    })
    return groups
  }, [selectedContract])

  const renderTiles = (fns) =>
    fns.map((fn) => {
      const isGame = fn.parse === 'game'
      const gameTypeId = isGame ? deriveGameTypeId(fn.name) : null

      return (
        <FunctionTile
          key={fn.name}
          fn={fn}
          fnName={fnName}
          setFnName={setFnName}
          gameTypeId={gameTypeId}
          user={normalizedUser}
        />
      )
    })

  const allUngrouped = grouped.every((g) => !g.label)

  if (allUngrouped) {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: '12px',
          padding: '12px 0',
        }}
      >
        {renderTiles(grouped.flatMap((g) => g.items))}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {grouped.map((group) => (
        <div key={group.key || 'default'}>
          {group.label && (
            <div
              style={{
                marginBottom: '8px',
                color: 'var(--color-primary-lighter)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                fontSize: '0.85rem',
              }}
            >
              {group.label}
            </div>
          )}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: '12px',
            }}
          >
            {renderTiles(group.items)}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function FunctionGrid(props) {
  return (
    <IarEventsProvider>
      <FunctionGridInner {...props} />
    </IarEventsProvider>
  )
}

function FunctionTile({ fn, fnName, setFnName, gameTypeId, user }) {
  const isGame = fn.parse === 'game'
  const isSelected = fnName === fn.name

  const iarEventCounter = useIarEvents()
  const { state: txState } = useContext(TransactionContext)

  const [{ data }, reexecuteQuery] = useQuery({
    query: GAME_COUNTS_QUERY,
    variables: gameTypeId && user ? { gameType: gameTypeId.toString(), user } : undefined,
    pause: !isGame || !gameTypeId || !user,
    requestPolicy: 'cache-and-network',
  })

  useEffect(() => {
    if (iarEventCounter > 0 && isGame && gameTypeId && user) {
      reexecuteQuery({ requestPolicy: 'network-only' })
    }
  }, [iarEventCounter, isGame, gameTypeId, user, reexecuteQuery])

  const lobbyCount = data?.lobby?.aggregate?.count ?? 0
  const activeCount = data?.active?.aggregate?.count ?? 0

  const myTurnCount = useMemo(() => {
    const myTurnGames = data?.myTurn || []
    if (myTurnGames.length === 0) return 0

    const pendingMoveGameIds = new Set()
    if (txState?.queue) {
      txState.queue.forEach(tx => {
        if (tx.status === 'pending' && tx.action && tx.action.toLowerCase().includes('move')) {
          const payload = tx.payload || ''
          const gameId = payload.split('|')[0]
          if (gameId) {
            pendingMoveGameIds.add(Number(gameId))
          }
        }
      })
    }

    const gamesWithoutPendingMoves = myTurnGames.filter(game =>
      !pendingMoveGameIds.has(game.id)
    )

    return gamesWithoutPendingMoves.length
  }, [data?.myTurn, txState?.queue])

  const handleClick = () => {
    if (isGame) {
      playBeep(500, 25, 'square')
    }
    setFnName(fn.name)
  }

  return (
    <button
      onClick={handleClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '16px 12px',
        backgroundColor: isSelected
          ? 'var(--color-primary-darker)'
          : 'rgba(0, 0, 0, 0.3)',
        color: isSelected ? 'black' : 'var(--color-primary-lighter)',
        border: isSelected
          ? '2px solid var(--color-primary)'
          : '1px solid var(--color-primary-darkest)',
        cursor: 'pointer',
        textTransform: 'uppercase',
        fontSize: '0.75rem',
        letterSpacing: '0.05em',
        fontWeight: isSelected ? 700 : 400,
        transition: 'all 0.15s ease',
        minHeight: '120px',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'
          e.currentTarget.style.borderColor = 'var(--color-primary)'
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.3)'
          e.currentTarget.style.borderColor = 'var(--color-primary-darkest)'
        }
      }}
    >
      <FontAwesomeIcon
        icon={isGame ? faDice : faCirclePlay}
        style={{
          fontSize: '1.5rem',
          color: isSelected ? 'black' : 'var(--color-primary)',
        }}
      />
      <span style={{ textAlign: 'center', lineHeight: 1.2 }}>
        {fn.friendlyName}
      </span>
      {isGame && myTurnCount > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '0.75rem',
          color: isSelected ? 'inherit' : 'var(--color-primary)',
          fontWeight: '600',
        }}>
          <FontAwesomeIcon icon={faHourglassHalf} style={{ fontSize: '0.7rem' }} />
          your turn: {myTurnCount}
        </div>
      )}
      {isGame && (
        <div style={{
          display: 'flex',
          gap: '10px',
          fontSize: '0.7rem',
          opacity: 0.85,
          textTransform: 'lowercase',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <FontAwesomeIcon icon={faUser} style={{ fontSize: '0.65rem' }} />
            {activeCount}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <FontAwesomeIcon icon={faStore} style={{ fontSize: '0.65rem' }} />
            {lobbyCount}
          </span>
        </div>
      )}
    </button>
  )
}
