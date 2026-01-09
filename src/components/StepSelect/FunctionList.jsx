import { useMemo, useEffect, useRef, useContext, useState } from 'preact/hooks'
import { createContext } from 'preact'
import { useQuery, gql, useSubscription } from '@urql/preact'
import ListButton from '../buttons/ListButton.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDice, faCirclePlay, faUser, faStore, faHourglassHalf } from '@fortawesome/free-solid-svg-icons'
import { useAioha } from '@aioha/react-ui'
import { deriveGameTypeId } from '../StepGame/gameTypes.js'
import { playBeep } from '../../lib/beep.js'
import { useDeviceBreakpoint } from '../../hooks/useDeviceBreakpoint.js'
import { IAR_EVENTS_LIVE_SUBSCRIPTION, MAX_BLOCK_HEIGHT_QUERY } from '../../data/inarow_gql.js'
import { TransactionContext } from '../../transactions/context.js'

// Context for sharing IAR2 event subscription across all game buttons
const IarEventsContext = createContext(null)

// Provider component that manages a single subscription for all game buttons
// First queries current block height, then subscribes from there to avoid historical replay
function IarEventsProvider({ children }) {
  const [updateCounter, setUpdateCounter] = useState(0)
  const [startBlock, setStartBlock] = useState(null)
  const lastEventRef = useRef(null)

  // Query the current max block height
  const [{ data: blockData }] = useQuery({
    query: MAX_BLOCK_HEIGHT_QUERY,
    requestPolicy: 'network-only',
  })

  // Set the starting block height once we have it
  useEffect(() => {
    if (blockData?.okinoko_iarv2_all_events?.[0]?.indexer_block_height) {
      const currentBlock = blockData.okinoko_iarv2_all_events[0].indexer_block_height
      console.log('[IarEventsProvider] Starting subscription from block:', currentBlock)
      setStartBlock(currentBlock)
    }
  }, [blockData])

  // Subscribe to events starting from the current block
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

        // Only trigger update if this is a new event we haven't processed yet
        if (lastEventRef.current !== eventKey) {
          lastEventRef.current = eventKey
          console.log('[IarEventsProvider] New IAR2 event:', latestEvent)
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

// Game-specific button component with stats
const GameListButton = ({ children, onClick, isActive, beep = true, isMobile = false, style = {}, ...props }) => {
  const handleClick = (e) => {
    if (beep) {
      playBeep(500, 25, 'square')
    }
    if (onClick) onClick(e)
  }

  return (
    <button
      className="neon-list-btn"
      onClick={handleClick}
      style={{
        backgroundColor: isActive ? 'var(--color-primary-darker)' : 'transparent',
        color: isActive ? 'black' : 'var(--color-primary-lighter)',
        textAlign: 'left',
        padding: isMobile ? '0.25em 0.25em' : '0.5em',
        display: 'flex',
        flexDirection: 'column',
        flex: '0 0 auto',
        width: 'auto',
        height: 'auto',
        alignItems: 'flex-start',
        justifyContent: 'space-evenly',
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  )
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

function FunctionListInner({ selectedContract, fnName, setFnName }) {
  const { user } = useAioha()
  const isMobile = useDeviceBreakpoint()
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

  const renderButtons = (fns) =>
    fns.map((fn) => {
      const isGame = fn.parse === 'game'
      const gameTypeId = isGame ? deriveGameTypeId(fn.name) : null

      return (
        <GameButton
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
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '10px',
        }}
      >
        {renderButtons(grouped.flatMap((g) => g.items))}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {grouped.map((group) => (
        <div key={group.key || 'default'}>
          {group.label && (
            <div
              style={{
                marginBottom: '6px',
                color: 'var(--color-primary-lighter)',
                // fontWeight: '700',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {group.label}
            </div>
          )}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '10px',
            }}
          >
            {renderButtons(group.items)}
          </div>
        </div>
      ))}
    </div>
  )
}

// Wrap the component with the IAR2 events provider
export default function FunctionList(props) {
  return (
    <IarEventsProvider>
      <FunctionListInner {...props} />
    </IarEventsProvider>
  )
}

function GameButton({ fn, fnName, setFnName, gameTypeId, user }) {
  const isGame = fn.parse === 'game'
  const isActive = fnName === fn.name
  const isMobile = useDeviceBreakpoint()

  // Subscribe to live IAR2 events
  const iarEventCounter = useIarEvents()

  // Access transaction context to check for pending moves
  const { state: txState } = useContext(TransactionContext)

  const [{ data }, reexecuteQuery] = useQuery({
    query: GAME_COUNTS_QUERY,
    variables: gameTypeId && user ? { gameType: gameTypeId.toString(), user } : undefined,
    pause: !isGame || !gameTypeId || !user,
    requestPolicy: 'cache-and-network',
  })

  // Re-fetch counts when new events occur
  useEffect(() => {
    if (iarEventCounter > 0 && isGame && gameTypeId && user) {
      reexecuteQuery({ requestPolicy: 'network-only' })
    }
  }, [iarEventCounter, isGame, gameTypeId, user, reexecuteQuery])

  const lobbyCount = data?.lobby?.aggregate?.count ?? 0
  const activeCount = data?.active?.aggregate?.count ?? 0

  // Calculate myTurnCount excluding games with pending move transactions
  const myTurnCount = useMemo(() => {
    const myTurnGames = data?.myTurn || []
    if (myTurnGames.length === 0) return 0

    // Get all pending move transactions from the queue
    const pendingMoveGameIds = new Set()
    if (txState?.queue) {
      txState.queue.forEach(tx => {
        if (tx.status === 'pending' && tx.action && tx.action.toLowerCase().includes('move')) {
          // Extract game ID from payload (format: "gameId" or "gameId|...")
          const payload = tx.payload || ''
          const gameId = payload.split('|')[0]
          if (gameId) {
            pendingMoveGameIds.add(Number(gameId))
          }
        }
      })
    }

    // Filter out games that have pending move transactions
    const gamesWithoutPendingMoves = myTurnGames.filter(game =>
      !pendingMoveGameIds.has(game.id)
    )

    return gamesWithoutPendingMoves.length
  }, [data?.myTurn, txState?.queue])

  // Use the custom GameListButton for games, regular ListButton for others
  const ButtonComponent = isGame ? GameListButton : ListButton

  return (
    <ButtonComponent
      onClick={() => setFnName(fn.name)}
      isActive={isActive}
      isMobile={isMobile}
      style={!isGame ? {
        backgroundColor: isActive ? 'var(--color-primary-darker)' : 'transparent',
        color: isActive ? 'black' : 'var(--color-primary-lighter)',
        textAlign: 'left',
        whiteSpace: 'nowrap',
        padding: '0.5em 1em',
        cursor: 'pointer',
        display: 'inline-flex',
        flex: '0 0 auto',
        width: 'auto',
        alignItems: 'center',
        textTransform: 'uppercase',
        fontSize: 'var(--font-size-base)',
        letterSpacing: '0.05em',
      } : undefined}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: isGame && isMobile ? '4px' : '8px',
        fontSize: 'var(--font-size-base)',
      }}>
        <FontAwesomeIcon
          icon={isGame ? faDice : faCirclePlay}
          style={{
            marginRight: isGame && isMobile ? '0' : '2px',
            fontSize:'0.9rem',
          }}
        />
        {fn.friendlyName}
      </div>
      {isGame && myTurnCount > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: 'var(--font-size-base)',
          opacity: 0.85,
          textTransform: 'lowercase',
          letterSpacing: '0.02em',
          color: isActive ? 'inherit' : 'var(--color-primary)',
          fontWeight: '600',
        }}>
          <FontAwesomeIcon icon={faHourglassHalf} 
          style={{ fontSize:'0.9rem',}} />
          your turn: {myTurnCount}
        </div>
      )}
      {isGame && (
        <div style={{
          display: 'flex',
          gap: '12px',
          fontSize: 'var(--font-size-base)',
          opacity: 0.85,
          textTransform: 'lowercase',
          letterSpacing: '0.02em',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <FontAwesomeIcon icon={faUser} style={{ fontSize:'0.9rem', }} />
            {activeCount} active
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <FontAwesomeIcon icon={faStore} style={{ fontSize:'0.9rem', }} />
            {lobbyCount} lobby
          </span>
        </div>
      )}
    </ButtonComponent>
  )
}
