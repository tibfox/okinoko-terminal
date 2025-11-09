import { createContext } from 'preact'
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { useAioha } from '@aioha/react-ui'
import { useVscQuery } from '../../lib/useVscQuery.js'

const AccountBalanceContext = createContext({
  loading: false,
  balances: null,
  rc: null,
  refresh: () => Promise.resolve(),
})

const QUERY_ACC_BAL = `
  query AccBal($acc: String!) {
    bal: getAccountBalance(account: $acc) {
      hbd
      hbd_savings
      hive
      hive_consensus
      consensus_unstaking
      pending_hbd_unstaking
    }
    rc: getAccountRC(account: $acc) {
      amount
      max_rcs
    }
  }
`

export function AccountBalanceProvider({ children, pollInterval = 60_000 }) {
  const { user } = useAioha()
  const normalizedUser = useMemo(() => {
    if (!user) return null
    return user.startsWith('hive:') ? user : `hive:${user}`
  }, [user])

  const { runQuery } = useVscQuery()
  const runQueryRef = useRef(runQuery)
  const isMountedRef = useRef(true)
  const lastFetchRef = useRef(0)
  const [state, setState] = useState({
    loading: Boolean(normalizedUser),
    balances: null,
    rc: null,
  })

  useEffect(() => {
    runQueryRef.current = runQuery
  }, [runQuery])

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const fetchBalances = useCallback(
    async ({ withLoading = false, force = false } = {}) => {
      if (!normalizedUser) return
      const now = Date.now()
      if (!force && now - lastFetchRef.current < pollInterval) {
        return
      }
      lastFetchRef.current = now
      if (withLoading) {
        setState((prev) => ({ ...prev, loading: true }))
      }
      const { data, error } = await runQueryRef.current(QUERY_ACC_BAL, { acc: normalizedUser })
      if (!isMountedRef.current) return
      if (!error && data?.bal && data?.rc) {
        setState({ loading: false, balances: data.bal, rc: data.rc })
      } else if (withLoading) {
        setState((prev) => ({ ...prev, loading: false }))
      }
    },
    [normalizedUser, pollInterval],
  )

  useEffect(() => {
    if (!normalizedUser) {
      setState({ loading: false, balances: null, rc: null })
      return
    }
    fetchBalances({ withLoading: true, force: true })
  }, [normalizedUser, fetchBalances])

  useEffect(() => {
    if (!normalizedUser) return
    const intervalId = setInterval(() => {
      fetchBalances()
    }, pollInterval)
    return () => clearInterval(intervalId)
  }, [normalizedUser, pollInterval, fetchBalances])

  const contextValue = useMemo(
    () => ({
      loading: state.loading,
      balances: state.balances,
      rc: state.rc,
      refresh: (options) => fetchBalances(options),
    }),
    [state, fetchBalances],
  )

  return (
    <AccountBalanceContext.Provider value={contextValue}>
      {children}
    </AccountBalanceContext.Provider>
  )
}

export function useAccountBalances() {
  return useContext(AccountBalanceContext)
}
