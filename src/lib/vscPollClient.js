import { getNetworkConfigFromCookie } from '../components/terminal/providers/NetworkTypeProvider.jsx'

// returns { status: 'pending' | 'success' | 'error', result: object | string | null }
export async function checkTxStatus(txid) {
  const ENDPOINT = getNetworkConfigFromCookie().graphqlEndpoint
  const query = `
    query FindContractOutput($filterOptions: ContractOutputFilter) {
      findContractOutput(filterOptions: $filterOptions) {
        id
        results {
          ok
          ret
        }
      }
    }`
  const variables = { filterOptions: { byInput: txid } }

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    })

    const data = await res.json()
    const output = data?.data?.findContractOutput?.[0]
    const result = output?.results?.[0]
    if (import.meta.env.DEV) {
      console.log('[vscPollClient] tx result', result)
    }

    if (!result) return { status: 'pending', result: null }

    const okVal =
      result.ok === true ||
      result.ok === 'true' ||
      result.ok === 1 ||
      result.ok === '1'

    let resolvedResult = okVal ? result?.ret : result?.ret
    if (!okVal) {
      const outputId = output?.id || result?.id || result?.cid || result?.output_id || result?.output_cid
      if (outputId) {
        const dagQuery = `
          query GetDagByCID($cidString: String!) {
            getDagByCID(cidString: $cidString)
          }`
        try {
          const dagRes = await fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: dagQuery, variables: { cidString: outputId } }),
          })
          const dagData = await dagRes.json()
          const rawDag = dagData?.data?.getDagByCID
          if (rawDag) {
            const parsedDag = typeof rawDag === 'string' ? JSON.parse(rawDag) : rawDag
            const errMsg = parsedDag?.results?.[0]?.errMsg
            if (errMsg) {
              resolvedResult = errMsg
            }
          }
        } catch (e) {
          // Fallback to original error payload if DAG lookup fails.
        }
      }
    }
    return {
      status: okVal ? 'success' : 'error',
      result: resolvedResult ?? null,
    }
  } catch (e) {
    return { status: 'pending', result: null }
  }
}
