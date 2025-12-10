import { createContext } from 'preact'
import { useContext, useState, useCallback, useEffect } from 'preact/hooks'
import { useSubscription } from '@urql/preact'
import { IAR_EVENTS_SUBSCRIPTION } from '../../../data/inarow_gql.js'

const LobbySubscriptionContext = createContext(null)

export function LobbySubscriptionProvider({ children, gameTypeId }) {
  const [updateCounter, setUpdateCounter] = useState(0)
  const [lastEvent, setLastEvent] = useState(null)

  // Log when subscriptions are initialized or game type changes
  useEffect(() => {
    if (gameTypeId) {
      console.log('[LobbySubscription] Subscribing to game type:', gameTypeId)
    } else {
      console.log('[LobbySubscription] No game type ID, subscriptions paused')
    }
  }, [gameTypeId])

  // Trigger update for all subscribers
  const triggerUpdate = useCallback((eventData) => {
    setUpdateCounter((prev) => prev + 1)
    setLastEvent({ data: eventData, timestamp: Date.now() })
  }, [])

  // Subscribe to all IAR events (for lobby and active games list)
  const [iarResult] = useSubscription(
    {
      query: IAR_EVENTS_SUBSCRIPTION,
      pause: !gameTypeId,
    }
  )

  useEffect(() => {
    if (iarResult.data) {
      triggerUpdate(iarResult.data)
    }
    if (iarResult.error) {
      console.error('[LobbySubscription] IAR subscription error:', iarResult.error)
    }
  }, [iarResult.data, iarResult.error, triggerUpdate])

  const value = {
    updateCounter,
    lastEvent,
    triggerUpdate,
  }

  return (
    <LobbySubscriptionContext.Provider value={value}>
      {children}
    </LobbySubscriptionContext.Provider>
  )
}

export function useLobbySubscription() {
  const context = useContext(LobbySubscriptionContext)
  if (!context) {
    throw new Error('useLobbySubscription must be used within LobbySubscriptionProvider')
  }
  return context
}
