import { createContext } from 'preact'
import { useContext, useState, useEffect, useCallback } from 'preact/hooks'
import { useSubscription } from '@urql/preact'
import {
  GAME_MOVE_SUBSCRIPTION,
  GAME_SWAP_SUBSCRIPTION,
  GAME_EVENTS_SUBSCRIPTION,
} from '../../../data/inarow_gql.js'

const GameSubscriptionContext = createContext(null)

export function GameSubscriptionProvider({ children, gameId }) {
  const [updateCounter, setUpdateCounter] = useState(0)
  const [lastEvent, setLastEvent] = useState(null)

  const toNumericVar = (value) =>
    value === null || value === undefined ? null : value.toString()
  const numericGameId = gameId != null ? toNumericVar(gameId) : null

  // Log when subscriptions are initialized or game changes
  useEffect(() => {
    if (numericGameId !== null) {
      console.log('[GameSubscription] Subscribing to game:', numericGameId)
    } else {
      console.log('[GameSubscription] No game ID, subscriptions paused')
    }
  }, [numericGameId])

  // Trigger update for all subscribers
  const triggerUpdate = useCallback((eventType) => {
    setUpdateCounter((prev) => prev + 1)
    setLastEvent({ type: eventType, timestamp: Date.now() })
  }, [])

  // Subscribe to move events
  const [moveResult] = useSubscription(
    {
      query: GAME_MOVE_SUBSCRIPTION,
      variables: numericGameId !== null ? { gameId: numericGameId } : undefined,
      pause: numericGameId === null,
    }
  )

  useEffect(() => {
    if (moveResult.data) {
      triggerUpdate('move')
    }
    if (moveResult.error) {
      console.error('[GameSubscription] Move subscription error:', moveResult.error)
    }
  }, [moveResult.data, moveResult.error, triggerUpdate])

  // Subscribe to swap events
  const [swapResult] = useSubscription(
    {
      query: GAME_SWAP_SUBSCRIPTION,
      variables: numericGameId !== null ? { gameId: numericGameId } : undefined,
      pause: numericGameId === null,
    }
  )

  useEffect(() => {
    if (swapResult.data) {
      triggerUpdate('swap')
    }
    if (swapResult.error) {
      console.error('[GameSubscription] Swap subscription error:', swapResult.error)
    }
  }, [swapResult.data, swapResult.error, triggerUpdate])

  // Subscribe to game events (won, resign, timeout, etc.)
  const [gameEventResult] = useSubscription(
    {
      query: GAME_EVENTS_SUBSCRIPTION,
      variables: numericGameId !== null ? { gameId: numericGameId } : undefined,
      pause: numericGameId === null,
    }
  )

  useEffect(() => {
    if (gameEventResult.data) {
      triggerUpdate('game_event')
    }
    if (gameEventResult.error) {
      console.error('[GameSubscription] Game event subscription error:', gameEventResult.error)
    }
  }, [gameEventResult.data, gameEventResult.error, triggerUpdate])

  const value = {
    updateCounter,
    lastEvent,
    triggerUpdate,
  }

  return (
    <GameSubscriptionContext.Provider value={value}>
      {children}
    </GameSubscriptionContext.Provider>
  )
}

export function useGameSubscription() {
  const context = useContext(GameSubscriptionContext)
  if (!context) {
    throw new Error('useGameSubscription must be used within GameSubscriptionProvider')
  }
  return context
}
