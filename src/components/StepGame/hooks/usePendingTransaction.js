import { useEffect, useState } from 'preact/hooks'
import { loadPendingTx } from '../../../lib/txBridge.js'

/**
 * Delays the pending transaction lookup so the terminal UI has time to mount,
 * mirroring the previous timeout logic but keeping StepGame leaner.
 */
export function usePendingTransaction(delayMs = 800) {
  const [pendingTx, setPendingTx] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      const resumable = loadPendingTx()
      if (resumable) {
        setPendingTx(resumable)
      }
    }, delayMs)

    return () => clearTimeout(timer)
  }, [delayMs])

  return pendingTx
}
