import { useEffect, useRef, useMemo, useState, useCallback } from 'preact/hooks'
import { useQuery, gql, useSubscription, useClient } from '@urql/preact'
import { useAioha } from '@aioha/react-ui'
import { playBeep } from '../../lib/beep.js'
import { IAR_EVENTS_LIVE_SUBSCRIPTION, MAX_BLOCK_HEIGHT_QUERY } from '../../data/inarow_gql.js'

// Query to check if a game belongs to the user and who made the last move
const GAME_INFO_QUERY = gql`
  query GameInfo($gameId: numeric!, $user: String!) {
    okinoko_iarv2_active_with_turn(
      where: {
        id: { _eq: $gameId }
        _or: [{ creator: { _eq: $user } }, { joiner: { _eq: $user } }]
      }
      limit: 1
    ) {
      id
      last_move_by
      creator
    }
  }
`

// Helper to play two sawtooth beeps in sequence
const playDoubleBeep = () => {
  playBeep(800, 100, 'sawtooth')
  setTimeout(() => {
    playBeep(1000, 50, 'sawtooth')
  }, 110)
}

/**
 * Global provider that listens to all IAR2 game events and plays a beep
 * when an opponent makes a move, resigns, or joins one of the user's games
 */
export function GameMoveBeepProvider({ children }) {
  const [startBlock, setStartBlock] = useState(null)
  const lastEventRef = useRef(null)
  const { user } = useAioha()
  const client = useClient()
  const normalizedUser = useMemo(() => {
    const u = (user || '').replace(/^hive:/i, '').toLowerCase()
    return u ? `hive:${u}` : ''
  }, [user])

  // Query the current max block height
  const [{ data: blockData }] = useQuery({
    query: MAX_BLOCK_HEIGHT_QUERY,
    requestPolicy: 'network-only',
  })

  // Set the starting block height once we have it
  useEffect(() => {
    if (blockData?.okinoko_iarv2_all_events?.[0]?.indexer_block_height) {
      const currentBlock = blockData.okinoko_iarv2_all_events[0].indexer_block_height
      console.log('[GameMoveBeepProvider] Starting subscription from block:', currentBlock)
      setStartBlock(currentBlock)
    }
  }, [blockData])

  // Subscribe to events starting from the current block
  const [iarResult] = useSubscription({
    query: IAR_EVENTS_LIVE_SUBSCRIPTION,
    variables: startBlock ? { fromBlock: startBlock } : undefined,
    pause: !startBlock,
  })

  // Function to check if we should beep for this event
  const checkAndBeep = useCallback(async (event) => {
    // Must have a logged-in user
    if (!normalizedUser) return

    // Handle different event types
    if (event.event_type === 'move') {
      // For move events, check if it's the user's game and opponent made the move
      try {
        const result = await client.query(GAME_INFO_QUERY, {
          gameId: event.id,
          user: normalizedUser
        }).toPromise()

        const gameInfo = result.data?.okinoko_iarv2_active_with_turn?.[0]

        // If this is one of the user's games and the move was NOT made by them
        if (gameInfo && gameInfo.last_move_by && gameInfo.last_move_by !== normalizedUser) {
          console.log('[GameMoveBeepProvider] Opponent move detected, playing beep')
          playDoubleBeep()
        }
      } catch (error) {
        console.error('[GameMoveBeepProvider] Error checking game for beep:', error)
      }
    } else if (event.event_type === 'resign') {
      // For resign events, check if someone else resigned in the user's game
      try {
        const result = await client.query(GAME_INFO_QUERY, {
          gameId: event.id,
          user: normalizedUser
        }).toPromise()

        const gameInfo = result.data?.okinoko_iarv2_active_with_turn?.[0]

        // If this is one of the user's games and the resigner is NOT the user
        if (gameInfo && event.resigner && event.resigner !== normalizedUser) {
          console.log('[GameMoveBeepProvider] Opponent resigned, playing beep')
          playDoubleBeep()
        }
      } catch (error) {
        console.error('[GameMoveBeepProvider] Error checking resign for beep:', error)
      }
    } else if (event.event_type === 'joined') {
      // For joined events, check if someone joined the user's game
      try {
        const result = await client.query(GAME_INFO_QUERY, {
          gameId: event.id,
          user: normalizedUser
        }).toPromise()

        const gameInfo = result.data?.okinoko_iarv2_active_with_turn?.[0]

        // If this is the user's game (they are creator) and someone else joined
        if (gameInfo && gameInfo.creator === normalizedUser && event.by && event.by !== normalizedUser) {
          console.log('[GameMoveBeepProvider] Someone joined your game, playing beep')
          playDoubleBeep()
        }
      } catch (error) {
        console.error('[GameMoveBeepProvider] Error checking join for beep:', error)
      }
    }
  }, [normalizedUser, client])

  useEffect(() => {
    if (iarResult.data) {
      const events = iarResult.data?.okinoko_iarv2_all_events_stream
      if (events && events.length > 0) {
        const latestEvent = events[events.length - 1]
        const eventKey = `${latestEvent.event_type}-${latestEvent.id}-${latestEvent.indexer_block_height}`

        // Only trigger check if this is a new event we haven't processed yet
        if (lastEventRef.current !== eventKey) {
          lastEventRef.current = eventKey
          console.log('[GameMoveBeepProvider] New IAR2 event:', latestEvent)

          // Check if we should play a beep for this event
          checkAndBeep(latestEvent)
        }
      }
    }
  }, [iarResult.data, checkAndBeep])

  return children
}
