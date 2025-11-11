const DEFAULT_HASURA_HTTP = 'https://vscapi.okinoko.io/hasura/v1/graphql'
const DEFAULT_HASURA_WS = 'wss://vscapi.okinoko.io/hasura/v1/graphql'
const DEFAULT_API_HTTP = 'https://vscapi.okinoko.io/api/v1/graphql'

export const HASURA_HTTP = import.meta.env.VITE_HASURA_HTTP || DEFAULT_HASURA_HTTP
export const HASURA_WS = import.meta.env.VITE_HASURA_WS || DEFAULT_HASURA_WS
export const TRANSACTION_API_HTTP = import.meta.env.VITE_GRAPHQL_ENDPOINT || DEFAULT_API_HTTP
