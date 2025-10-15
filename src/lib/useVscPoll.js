import { playBeep } from '../lib/beep.js'

const ENDPOINT = 'https://vsc.okinoko.io/api/v1/graphql'

/**
 * useVscPoll
 * ------------
 * Custom hook that polls the VSC GraphQL endpoint to track
 * smart contract execution results by transaction ID (txid).
 *
 * It repeatedly queries the backend for the contract output
 * and updates the UI in near real-time using a callback.
 *
 * Behavior:
 *  - Initiates a 30-attempt polling cycle (approx. 2.5 minutes total).
 *  - Displays an animated "waiting" indicator in logs.
 *  - When the transaction is found:
 *      • Plays a success or failure tone.
 *      • Prints contract logs and return values.
 *      • Stops polling automatically.
 *  - If the timeout limit is reached, logs a failure message.
 *
 * Exports:
 *  - pollTx(txid, pushLog)
 *      txid: transaction ID string
 *      pushLog: function to push messages to the terminal log
 */
export function useVscPoll() {
  /**
   * pollTx()
   *  - Polls the backend GraphQL endpoint for a specific contract output.
   *  - Designed to be called after a successful broadcast.
   */
  async function pollTx(txid, pushLog) {
    const maxTries = 30 // limit polling attempts (≈150 seconds total)
    let tries = 0

    // --- Animated "waiting for execution" indicator ---
    let dots = 0
    let dotTimer

    function startDots() {
      dotTimer = setInterval(() => {
        dots = (dots + 1) % 4
        const msg = '⧖ Waiting for VSC execution' + '.'.repeat(dots)
        pushLog(msg)
      }, 1000)
    }

    function stopDots() {
      if (dotTimer) clearInterval(dotTimer)
    }

    // Begin the animation
    startDots()

    // --- Main polling loop ---
    while (tries < maxTries) {
      try {
        // GraphQL query: request contract output logs
        const query = `
          query FindContractOutput($filterOptions: ContractOutputFilter) {
            findContractOutput(filterOptions: $filterOptions) {
              results {
                ok
                ret
              }
            }
          }`

        const variables = { filterOptions: { byInput: txid } }

        // Send GraphQL request
        const res = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, variables }),
        })

        const data = await res.json()

        // Safely extract nested result
        const result =
  data?.data?.findContractOutput?.[0]?.results?.[0]


        // --- Handle received result ---
        if (result) {
          stopDots()

          const okVal =
            result.ok === true ||
            result.ok === 'true' ||
            result.ok === 1 ||
            result.ok === '1'

          if (okVal) {
            // ✅ Contract execution successful
            playBeep(880, 80, 'square')
            pushLog('⬢ VSC contract executed successfully.')

            // // Display logs (string or array)
            // if (Array.isArray(result.logs) && result.logs.length) {
            //   pushLog('🗒 Logs: ' + result.logs.join(' | '))
            // } else if (result.logs) {
            //   pushLog('🗒 Logs: ' + result.logs)
            // }

            // Display return value
            if (result.ret) pushLog('⬒ Return: ' + result.ret)
            return
          } else {
            // ❌ Contract execution failed
            playBeep(250, 250, 'sawtooth')
            pushLog('✘ VSC contract failed.')

            // if (result.logs)
            //   pushLog('🗒 Logs: ' + JSON.stringify(result.logs))
            if (result.ret)
              pushLog('⬒ Return: ' + JSON.stringify(result.ret))

            return
          }
        }

        // --- No result yet, retry after delay ---
        tries++
        await new Promise((r) => setTimeout(r, 5000))
      } catch (e) {
        // --- On network or parsing error, retry ---
        tries++
        await new Promise((r) => setTimeout(r, 5000))
      }
    }

    // --- Timeout reached ---
    stopDots()
    pushLog('✖ VSC execution not found after timeout.')
  }

  return { pollTx }
}
