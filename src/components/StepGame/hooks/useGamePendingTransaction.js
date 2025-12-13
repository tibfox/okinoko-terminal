import { useContext, useMemo } from 'preact/hooks'
import { TransactionContext } from '../../../transactions/context.js'

/**
 * Hook to check if a specific game has a pending transaction
 * @param {string|number} gameId - The game ID to check for pending transactions
 * @returns {{ hasPendingTx: boolean, pendingAction: string|null }} - Whether the game has a pending tx and what action
 */
export function useGamePendingTransaction(gameId) {
  const { state } = useContext(TransactionContext)

  const pendingInfo = useMemo(() => {
    if (!gameId || !state?.queue) {
      return { hasPendingTx: false, pendingAction: null }
    }

    // Find any pending transaction for this game
    const pendingTx = state.queue.find((tx) => {
      // Only check pending transactions
      if (tx.status !== 'pending') return false

      // Check if the payload starts with the game ID
      // Game payloads are formatted as: "gameId" or "gameId|..."
      const payload = tx.payload || ''
      const gameIdStr = String(gameId)

      // Check if payload starts with the game ID followed by nothing, a pipe, or end of string
      return payload === gameIdStr || payload.startsWith(`${gameIdStr}|`)
    })

    return {
      hasPendingTx: !!pendingTx,
      pendingAction: pendingTx?.action || null,
    }
  }, [gameId, state?.queue])

  return pendingInfo
}
