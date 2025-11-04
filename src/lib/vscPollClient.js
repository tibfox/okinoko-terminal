const ENDPOINT = 'https://vsc.okinoko.io/api/v1/graphql'

// returns { status: 'pending' | 'success' | 'error', result: string | null }
export async function checkTxStatus(txid) {
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

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    })

    const data = await res.json()
    const result = data?.data?.findContractOutput?.[0]?.results?.[0]

    if (!result) return { status: 'pending', result: null }

    const okVal =
      result.ok === true ||
      result.ok === 'true' ||
      result.ok === 1 ||
      result.ok === '1'

    return {
      status: okVal ? 'success' : 'error',
      result: result.ret ?? null,
      
    }
  } catch (e) {
    return { status: 'pending', result: null }
  }
}
