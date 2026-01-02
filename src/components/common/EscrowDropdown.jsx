import { useMemo, useState, useEffect } from 'preact/hooks'
import { gql, useQuery, useClient, createClient, cacheExchange, fetchExchange } from '@urql/preact'
import NeonListDropdown from './NeonListDropdown.jsx'

const ESCROW_CONTRACT_ID = 'vsc1BgfucQVHwYBHuK2yMEv4AhYua9rtQ45Uoe'
const VSC_ENDPOINT = import.meta.env.VITE_GRAPHQL_ENDPOINT || 'https://vscapi.okinoko.io/api/v1/graphql'

// Create a separate client for VSC chain queries
const vscClient = createClient({
  url: VSC_ENDPOINT,
  exchanges: [cacheExchange, fetchExchange],
})

const buildEscrowQuery = (viewName, orderBy) => {
  const orderClause = orderBy ? `(order_by: { ${orderBy}: asc })` : ''
  return gql`
    query EscrowDropdown {
      ${viewName}${orderClause} {
        id
        payer
        payee
        arbitrator
        amount
        asset
        closed
        outcome
      }
    }
  `
}

const VSC_STATE_QUERY = gql`
  query GetEscrowState($contractId: String!, $keys: [String!]!) {
    getStateByKeys(contractId: $contractId, keys: $keys)
  }
`

// Template string replacement helper
const fillTemplate = (template, data) => {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = data[key]
    if (typeof value === 'number') {
      return value.toFixed(3).replace(/\.?0+$/, '')
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No'
    }
    return value !== undefined ? String(value) : match
  })
}

export default function EscrowDropdown({
  value,
  onChange,
  param,
  placeholder = 'Select an escrow…',
  user
}) {
  const viewName = param?.graphqlQuery || 'okinoko_escrow_open'
  const query = useMemo(
    () => buildEscrowQuery(viewName, param?.orderBy),
    [viewName, param?.orderBy]
  )
  const [{ data, fetching, error }] = useQuery({
    query,
    requestPolicy: 'cache-and-network',
  })

  const [escrowStates, setEscrowStates] = useState({})

  // Get filtered escrows
  const userEscrows = useMemo(() => {
    const rows = data?.[viewName]
    if (!rows) return []

    // Normalize user with hive: prefix for comparison
    const normalizedUser = user?.startsWith('hive:') ? user : `hive:${user}`

    // Filter escrows where user is payer, payee, or arbitrator
    return rows.filter(
      (escrow) =>
        escrow.payer === normalizedUser ||
        escrow.payee === normalizedUser ||
        escrow.arbitrator === normalizedUser
    )
  }, [data, viewName, user])

  // Query VSC state for escrow names using the VSC chain client
  const escrowIds = useMemo(() => userEscrows.map(e => String(e.id)), [userEscrows])
  const [{ data: stateData }] = useQuery({
    query: VSC_STATE_QUERY,
    variables: {
      contractId: ESCROW_CONTRACT_ID,
      keys: escrowIds,
    },
    pause: escrowIds.length === 0,
    requestPolicy: 'cache-and-network',
    context: useMemo(() => ({ url: VSC_ENDPOINT }), []),
  })

  // Parse state data when it arrives
  useEffect(() => {
    if (!stateData?.getStateByKeys) return

    const states = {}
    Object.entries(stateData.getStateByKeys).forEach(([id, value]) => {
      // The value is the escrow name as a simple string, not JSON
      states[id] = value
    })
    setEscrowStates(states)
  }, [stateData])

  const options = useMemo(() => {
    return userEscrows.map((escrow) => {
      const escrowId = String(escrow.id)
      const name = escrowStates[escrowId] || null

      // Create enriched escrow object with name
      const enrichedEscrow = { ...escrow, name }

      // Build title: #EscrowNumber: EscrowName (or just #EscrowNumber if no name)
      const title = name ? `#${escrow.id}: ${name}` : `Escrow #${escrow.id}`

      return {
        value: String(escrow[param?.valueField || 'id']),
        label: fillTemplate(
          param?.labelTemplate || title,
          enrichedEscrow
        ),
        subtitle: param?.subtitleTemplate
          ? fillTemplate(param?.subtitleTemplate, enrichedEscrow)
          : `${escrow.amount} ${escrow.asset} · ${escrow.payer?.replace('hive:', '')} → ${escrow.payee?.replace('hive:', '')} · Arb: ${escrow.arbitrator?.replace('hive:', '')}`,
        title,
      }
    })
  }, [userEscrows, escrowStates, param])

  if (!user) {
    return (
      <div style={{
        padding: '12px 14px',
        background: 'rgba(6, 6, 6, 0.9)',
        border: '1px solid var(--color-primary-darkest)',
        color: 'var(--color-primary-lighter)',
        opacity: 0.7
      }}>
        User not available
      </div>
    )
  }

  if (fetching && !data) {
    return (
      <div style={{
        padding: '12px 14px',
        background: 'rgba(6, 6, 6, 0.9)',
        border: '1px solid var(--color-primary-darkest)',
        color: 'var(--color-primary-lighter)',
        opacity: 0.7
      }}>
        Loading escrows…
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        padding: '12px 14px',
        background: 'rgba(6, 6, 6, 0.9)',
        border: '1px solid var(--color-primary-darkest)',
        color: 'var(--color-primary-lighter)',
        opacity: 0.7
      }}>
        Error loading escrows
      </div>
    )
  }

  if (!options.length) {
    return (
      <div style={{
        padding: '12px 14px',
        background: 'rgba(6, 6, 6, 0.9)',
        border: '1px solid var(--color-primary-darkest)',
        color: 'var(--color-primary-lighter)',
        opacity: 0.7
      }}>
        No escrows available for you
      </div>
    )
  }

  return (
    <NeonListDropdown
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      showCheck={false}
    />
  )
}
