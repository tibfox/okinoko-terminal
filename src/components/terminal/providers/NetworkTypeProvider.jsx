import { createContext } from 'preact'
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { getNetworkTypeCookie, setNetworkTypeCookie } from '../../../lib/cookies.js'

export const NETWORK_TYPES = {
  MAIN_NET: 'mainnet',
  TEST_NET: 'testnet',
}

export const NETWORK_TYPE_LABELS = {
  [NETWORK_TYPES.MAIN_NET]: 'Magi Main Net',
  [NETWORK_TYPES.TEST_NET]: 'Magi Test Net',
}

// Asset symbols per network
export const ASSET_SYMBOLS = {
  [NETWORK_TYPES.MAIN_NET]: {
    HIVE: 'HIVE',
    HBD: 'HBD',
    VESTS: 'VESTS',
    // Staked/savings variants
    sHBD: 'sHBD',
    hbd_savings: 'hbd_savings',
    // Labels for display
    stakedHBD: 'staked HBD',
  },
  [NETWORK_TYPES.TEST_NET]: {
    HIVE: 'HIVE',
    HBD: 'TBD',
    VESTS: 'TESTS',
    // Staked/savings variants
    sHBD: 'sTBD',
    hbd_savings: 'tbd_savings',
    // Labels for display
    stakedHBD: 'staked TBD',
  },
}

// Network configurations
export const NETWORK_CONFIGS = {
  [NETWORK_TYPES.MAIN_NET]: {
    hiveApi: 'https://api.hive.blog',
    chainId: 'beeab0de00000000000000000000000000000000000000000000000000000000',
    vscNetworkId: 'vsc-mainnet',
    graphqlEndpoint: import.meta.env.VITE_GRAPHQL_ENDPOINT || 'https://vscapi.okinoko.io/api/v1/graphql',
    hasuraHttp: import.meta.env.VITE_HASURA_HTTP || 'https://vscapi.okinoko.io/hasura/v1/graphql',
    hasuraWs: import.meta.env.VITE_HASURA_WS || 'wss://vscapi.okinoko.io/hasura/v1/graphql',
    blocksBackend: import.meta.env.VITE_BLOCKS_BACKEND || 'https://vsc.techcoderx.com/be-api/v1',
    explorerUrl: 'https://vsc.techcoderx.com',
    contractDeployUrl: import.meta.env.VITE_CONTRACT_DEPLOY_URL || 'https://deploy-dev.okinoko.io',
    assetSymbols: ASSET_SYMBOLS[NETWORK_TYPES.MAIN_NET],
  },
  [NETWORK_TYPES.TEST_NET]: {
    hiveApi: 'https://testnet.techcoderx.com',
    chainId: '18dcf0a285365fc58b71f18b3d3fec954aa0c141c44e4e5cb4cf777b9eab274e',
    vscNetworkId: 'vsc-testnet',
    graphqlEndpoint: import.meta.env.VITE_TESTNET_GRAPHQL_ENDPOINT || 'https://magi-test.techcoderx.com/api/v1/graphql',
    hasuraHttp: import.meta.env.VITE_TESTNET_HASURA_HTTP || 'https://magi-test.techcoderx.com/api/v1/graphql',
    hasuraWs: import.meta.env.VITE_TESTNET_HASURA_WS || 'wss://magi-test.techcoderx.com/api/v1/graphql',
    blocksBackend: import.meta.env.VITE_TESTNET_BLOCKS_BACKEND || 'https://testnet.techcoderx.com/be-api/v1',
    explorerUrl: 'https://magi-test.techcoderx.com',
    contractDeployUrl: import.meta.env.VITE_TESTNET_CONTRACT_DEPLOY_URL || 'https://deploy-testnet.okinoko.io',
    assetSymbols: ASSET_SYMBOLS[NETWORK_TYPES.TEST_NET],
  },
}

// Helper to get network config from cookie (for module-level usage)
export const getNetworkConfigFromCookie = () => {
  const saved = getNetworkTypeCookie()
  const networkType = saved && Object.values(NETWORK_TYPES).includes(saved)
    ? saved
    : NETWORK_TYPES.MAIN_NET
  return NETWORK_CONFIGS[networkType]
}

// Helper to get asset symbols from cookie (for module-level usage)
export const getAssetSymbolsFromCookie = () => {
  return getNetworkConfigFromCookie().assetSymbols
}

const NetworkTypeContext = createContext({
  networkType: NETWORK_TYPES.MAIN_NET,
  setNetworkType: () => {},
  isTestNet: false,
  networkConfig: NETWORK_CONFIGS[NETWORK_TYPES.MAIN_NET],
  assetSymbols: ASSET_SYMBOLS[NETWORK_TYPES.MAIN_NET],
  registerAioha: () => {},
})

export function NetworkTypeProvider({ children }) {
  const [networkType, setNetworkTypeState] = useState(() => {
    const saved = getNetworkTypeCookie()
    if (saved && Object.values(NETWORK_TYPES).includes(saved)) {
      return saved
    }
    return NETWORK_TYPES.MAIN_NET
  })

  const aiohaRef = useRef(null)
  const isInitialMount = useRef(true)

  useEffect(() => {
    setNetworkTypeCookie(networkType)
  }, [networkType])

  // Handle logout when network changes (but not on initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    // Logout from aioha when network changes
    if (aiohaRef.current && typeof aiohaRef.current.logout === 'function') {
      aiohaRef.current.logout()
    }
  }, [networkType])

  const setNetworkType = useCallback((type) => {
    if (Object.values(NETWORK_TYPES).includes(type) && type !== networkType) {
      setNetworkTypeState(type)
    }
  }, [networkType])

  const registerAioha = useCallback((aiohaInstance) => {
    aiohaRef.current = aiohaInstance
  }, [])

  const isTestNet = networkType === NETWORK_TYPES.TEST_NET
  const networkConfig = NETWORK_CONFIGS[networkType]
  const assetSymbols = ASSET_SYMBOLS[networkType]

  const contextValue = useMemo(
    () => ({
      networkType,
      setNetworkType,
      isTestNet,
      networkConfig,
      assetSymbols,
      registerAioha,
    }),
    [networkType, setNetworkType, isTestNet, networkConfig, assetSymbols, registerAioha]
  )

  return (
    <NetworkTypeContext.Provider value={contextValue}>
      {children}
    </NetworkTypeContext.Provider>
  )
}

export const useNetworkType = () => useContext(NetworkTypeContext)

// Convenience hook for just asset symbols
export const useAssetSymbols = () => {
  const { assetSymbols } = useContext(NetworkTypeContext)
  return assetSymbols
}
