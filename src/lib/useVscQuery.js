const ENDPOINT = import.meta.env.VITE_GRAPHQL_ENDPOINT

/**
 * useVscQuery()
 *  - Minimal GraphQL helper for one-time queries or mutations.
 *  - Returns either { data } or { error }.
 */
export function useVscQuery() {
  /**
   * runQuery()
   * @param {string} query - GraphQL query string
   * @param {object} [variables={}] - Query variables
   * @param {number} [timeoutMs=10000] - Optional timeout in ms
   * @returns {Promise<object>} - The parsed GraphQL result (data or error)
   */
  async function runQuery(query, variables = {}, timeoutMs = 10000) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (!res.ok) throw new Error(`GraphQL HTTP ${res.status}`)

      const json = await res.json()

      if (json.errors?.length) return { error: json.errors }
      return { data: json.data }
    } catch (err) {
      clearTimeout(timeout)
      return { error: err }
    }
  }

  return { runQuery }
}
