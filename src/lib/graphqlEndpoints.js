import { getNetworkConfigFromCookie } from '../components/terminal/providers/NetworkTypeProvider.jsx'

// Get endpoints based on current network selection (read from cookie at module load)
const networkConfig = getNetworkConfigFromCookie()

export const HASURA_HTTP = networkConfig.hasuraHttp
export const HASURA_WS = networkConfig.hasuraWs
export const TRANSACTION_API_HTTP = networkConfig.graphqlEndpoint
