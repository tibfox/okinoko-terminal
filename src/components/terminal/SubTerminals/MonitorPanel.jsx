import { useEffect, useMemo, useState, useCallback } from 'preact/hooks'
import { useQuery } from '@urql/preact'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {  faCheckCircle,   faHourglass } from '@fortawesome/free-solid-svg-icons'
import {   faCircleXmark } from '@fortawesome/free-regular-svg-icons'
import { TRANSACTION_API_HTTP } from '../../../lib/graphqlEndpoints.js'

import { Tabs } from '../../common/Tabs.jsx'


const FIND_TRANSACTION_QUERY = /* GraphQL */ `
  query FindTransaction($filterOptions: TransactionFilter) {
    findTransaction(filterOptions: $filterOptions) {
      id
      anchr_height
      anchr_index
      anchr_id
      anchr_ts
      type
      first_seen
      nonce
      rc_limit
      required_auths
      required_posting_auths
      status
      op_types
      ops {
        required_auths
        type
        index
        data
      }
    }
  }
`

const TABS = [
  { id: 'txs', label: 'Txs' },
  { id: 'blocks', label: 'Blocks' },
  { id: 'witnesses', label: 'Witnesses' },
]

const LOCAL_NODE_INFO_QUERY = /* GraphQL */ `
  query LocalNodeInfo {
    localNodeInfo {
      last_processed_block
    }
  }
`

const FIND_WITNESS_NODES_QUERY = /* GraphQL */ `
  query FindWitnessNodes($height: Uint64!) {
    witnessNodes(height: $height) {
      account
      enabled
    }
  }
`

const ACCOUNT_CONSENSUS_QUERY = /* GraphQL */ `
  query AccountConsensus($acc: String!) {
    getAccountBalance(account: $acc) {
      hive_consensus
    }
  }
`

const WI_POLL_INTERVAL_MS = 60000
const BE_POLL_INTERVAL_MS = 15000
const TX_POLL_INTERVAL_MS = 5000
const MAX_ROWS = 40
const BLOCKS_API_BASE_URL = 'https://vscapi.okinoko.io/backend/be-api/v1'

const FINAL_STATUSES = new Set(['CONFIRMED', 'FAILED'])

const mergeTransactions = (previous, incoming) => {
  if (!Array.isArray(incoming) || incoming.length === 0) {
    return previous
  }

  const byId = new Map(previous.map((item) => [item.id, item]))
  incoming.forEach((item) => {
    if (item?.id) {
      const existing = byId.get(item.id)
      if (!existing) {
        byId.set(item.id, item)
        return
      }

      const existingStatus = existing.status?.toUpperCase?.() ?? ''
      const nextStatus = item.status?.toUpperCase?.() ?? ''
      if (FINAL_STATUSES.has(existingStatus) && nextStatus === 'INCLUDED') {
        return
      }

      byId.set(item.id, {
        ...existing,
        ...item,
      })
    }
  })

  return Array.from(byId.values())
    .sort((a, b) => Number(b?.anchr_height ?? 0) - Number(a?.anchr_height ?? 0))
    .slice(0, MAX_ROWS)
}

const formatLocalTime = (value) => {
  if (!value) {
    return '—'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

const formatWeight = (value) => {
  if (!Number.isFinite(value)) {
    return '—'
  }
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })
}

const cellStyle = {
  padding: '0.35rem 0.5rem',
  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  fontSize: '0.85rem',
  textAlign: 'left',
}

const renderStatusIcon = (status) => {
  const normalized = status?.toUpperCase?.() ?? ''
  switch (normalized) {
    case 'CONFIRMED':
      return <FontAwesomeIcon icon={faCheckCircle} />
    case 'FAILED':
      return <FontAwesomeIcon icon={faCircleXmark}  />
    case 'INCLUDED':
    default:
      return <FontAwesomeIcon icon={faHourglass}  />
  }
}

const getFirstOpData = (tx) => {
  const opData = tx?.ops?.[0]?.data
  if (!opData) {
    return null
  }
  if (typeof opData === 'string') {
    try {
      return JSON.parse(opData)
    } catch {
      return null
    }
  }
  return opData
}

const getOperationLabel = (tx) => {
  const primaryType = tx?.op_types?.[0]
  if (typeof primaryType === 'string' && primaryType.toLowerCase() === 'call_contract') {
    const parsedData = getFirstOpData(tx)
    if (parsedData?.action) {
      return parsedData.action
    }
  }

  return primaryType ?? tx?.type ?? '—'
}

const getAmountLabel = (tx) => {
  const data = getFirstOpData(tx)
  if (!data) {
    return ''
  }

  if (data.amount != null) {
    const assetSuffix = data.asset ? ` ${String(data.asset).toUpperCase()}` : ''
    return `${data.amount}${assetSuffix}`
  }

  const intentsSource = data.intents
  const intents = Array.isArray(intentsSource)
    ? intentsSource
    : typeof intentsSource === 'object' && intentsSource !== null
      ? Object.values(intentsSource)
      : []
  if (intents.length) {
    const transferAllowIntent = intents.find((intent) => intent?.type === 'transfer.allow')
    if (transferAllowIntent) {
      const { limit, token } = transferAllowIntent.args ?? transferAllowIntent
      if (limit != null) {
        const tokenSuffix = token ? ` ${String(token).toUpperCase()}` : ''
        return `${limit}${tokenSuffix}`
      }
    }
  }

  return ''
}

const parseNumeric = (value) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

const extractLastBlockHeight = (propsData) => {
  if (!propsData || typeof propsData !== 'object') {
    return null
  }
  const candidates = [
    propsData.l2_block_height,
    propsData.l2BlockHeight,
    propsData.last_irreversible_block_num,
    propsData.last_block_id,
  ]
  for (const candidate of candidates) {
    const parsed = parseNumeric(candidate)
    if (parsed != null) {
      return parsed
    }
  }
  return null
}

const formatRelativeTime = (value) => {
  if (!value) {
    return '—'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }
  const diffMs = Date.now() - date.getTime()
  if (diffMs < 0) {
    return 'just now'
  }
  const seconds = Math.floor(diffMs / 1000)
  if (seconds < 60) {
    return `${seconds}s ago`
  }
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return `${minutes}m ago`
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours}h ago`
  }
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const formatBlockCid = (value, visibleChars = 13) => {
  if (!value) {
    return '—'
  }
  if (value.length <= visibleChars) {
    return value
  }
  return `${value.slice(0, visibleChars)}..`
}

const formatTxId = (value, visibleChars = 6) => {
  if (!value) {
    return '—'
  }
  if (value.length <= visibleChars) {
    return value
  }
  return `${value.slice(0, visibleChars)}...`
}

export default function MonitorPanel() {
  const [activeTab, setActiveTab] = useState('txs')
  const [transactions, setTransactions] = useState([])
  const [witnesses, setWitnesses] = useState([])
  const [witnessLoading, setWitnessLoading] = useState(false)
  const [witnessError, setWitnessError] = useState(null)
  const [blocks, setBlocks] = useState([])
  const [blocksLoading, setBlocksLoading] = useState(false)
  const [blocksError, setBlocksError] = useState(null)
  const txQueryContext = useMemo(
    () => ({
      url: TRANSACTION_API_HTTP,
      fetchOptions: {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    }),
    [TRANSACTION_API_HTTP],
  )

  const runTxQuery = useCallback(
    async (query, variables = {}) => {
      if (!txQueryContext?.url) {
        return null
      }
      const response = await fetch(txQueryContext.url, {
        method: 'POST',
        headers: txQueryContext.fetchOptions.headers,
        body: JSON.stringify({
          query,
          variables,
        }),
      })
      if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`)
      }
      const payload = await response.json()
      if (payload.errors?.length) {
        throw new Error(payload.errors[0]?.message ?? 'GraphQL error')
      }
      return payload
    },
    [txQueryContext],
  )

  const [{ data, fetching, error }, reexecuteQuery] = useQuery({
    query: FIND_TRANSACTION_QUERY,
    variables: { filterOptions: null },
    context: txQueryContext,
    pause: false,
    requestPolicy: 'network-only',
  })

  useEffect(() => {
    const id = setInterval(() => {
      reexecuteQuery({ requestPolicy: 'network-only', context: txQueryContext })
    }, TX_POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [reexecuteQuery, txQueryContext])

  useEffect(() => {
    const incoming = data?.findTransaction ?? []
    if (incoming.length === 0) {
      return
    }

    setTransactions((prev) => mergeTransactions(prev, incoming))
  }, [data])

  const fetchWitnesses = useCallback(async () => {
    setWitnessLoading(true)
    setWitnessError(null)
    try {
      const nodeInfoResult = await runTxQuery(LOCAL_NODE_INFO_QUERY)
      const height = nodeInfoResult?.data?.localNodeInfo?.last_processed_block
      if (!height) {
        setWitnesses([])
        setWitnessLoading(false)
        return
      }

      const witnessResult = await runTxQuery(FIND_WITNESS_NODES_QUERY, { height })
      const nodes = witnessResult?.data?.witnessNodes ?? []
      const enabledNodes = nodes.filter((node) => node?.enabled)

      const weights = await Promise.all(
        enabledNodes.map(async (node) => {
          const acc = node?.account
          if (!acc) {
            return null
          }
          try {
            const balanceResult = await runTxQuery(ACCOUNT_CONSENSUS_QUERY, { acc: `hive:${acc}` })
            const hiveConsensus = Number(balanceResult?.data?.getAccountBalance?.hive_consensus ?? 0)
            return {
              account: acc,
              weight: hiveConsensus / 1000,
              hiveConsensus,
            }
          } catch {
            return {
              account: acc,
              weight: 0,
              hiveConsensus: 0,
            }
          }
        }),
      )

      const cleaned = weights.filter(Boolean).sort((a, b) => b.hiveConsensus - a.hiveConsensus)
      setWitnesses(cleaned)
    } catch (err) {
      setWitnessError(err)
      setWitnesses([])
    } finally {
      setWitnessLoading(false)
    }
  }, [runTxQuery])

  useEffect(() => {
    let cancelled = false
    const wrapFetch = async () => {
      if (cancelled) {
        return
      }
      await fetchWitnesses()
    }
    wrapFetch()
    const id = setInterval(fetchWitnesses, WI_POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [fetchWitnesses])

  useEffect(() => {
    let cancelled = false
    const fetchBlocks = async () => {
      if (cancelled) {
        return
      }
      setBlocksLoading(true)
      setBlocksError(null)
      try {
        const propsResponse = await fetch(`${BLOCKS_API_BASE_URL}/props`)
        if (!propsResponse.ok) {
          throw new Error(`Props request failed with ${propsResponse.status}`)
        }
        const propsData = await propsResponse.json()
        const height = extractLastBlockHeight(propsData)
        if (!Number.isFinite(height)) {
          throw new Error('Unable to determine latest L2 block height')
        }

        const params = new URLSearchParams({
          last_block_id: String(height),
          count: '50',
        })
        const blocksResponse = await fetch(`${BLOCKS_API_BASE_URL}/blocks?${params.toString()}`)
        if (!blocksResponse.ok) {
          throw new Error(`Blocks request failed with ${blocksResponse.status}`)
        }
        const payload = await blocksResponse.json()
        const rows = Array.isArray(payload) ? payload : []
        rows.sort((a, b) => {
          const blockA = parseNumeric(a?.be_info?.block_id) ?? 0
          const blockB = parseNumeric(b?.be_info?.block_id) ?? 0
          return blockB - blockA
        })
        if (!cancelled) {
          setBlocks(rows)
          setBlocksError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setBlocks([])
          setBlocksError(err)
        }
      } finally {
        if (!cancelled) {
          setBlocksLoading(false)
        }
      }
    }

    fetchBlocks()
    const id = setInterval(fetchBlocks, BE_POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  const renderTxTable = () => {
    if (error) {
      return (
        <div style={{ color: '#ff6464', fontSize: '0.9rem' }}>
          Failed to load transactions. Retrying...
        </div>
      )
    }

    const rows = transactions

    if (!rows.length && fetching) {
      return <div style={{ fontSize: '0.9rem' }}>Loading latest transactions...</div>
    }

    if (!rows.length) {
      return <div style={{ fontSize: '0.9rem' }}>No transactions yet. Monitoring...</div>
    }

    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...cellStyle, fontWeight: 600 }}>Tx</th>
              <th style={{ ...cellStyle, fontWeight: 600, width: '2rem' }} aria-label="status" />
              <th style={{ ...cellStyle, fontWeight: 600 }}>Account</th>
              <th style={{ ...cellStyle, fontWeight: 600 }}>Operation</th>
              <th style={{ ...cellStyle, fontWeight: 600 }}>Amount</th>
              <th style={{ ...cellStyle, fontWeight: 600 }}>Height</th>
              <th style={{ ...cellStyle, fontWeight: 600 }}>Anchored</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((tx) => (
              <tr key={tx.id}>
                <td style={cellStyle}>
                  {tx?.id ? (
                    <a href={`https://vsc.techcoderx.com/tx/${tx.id}`} target="_blank" rel="noreferrer">
                      {formatTxId(tx.id)}
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
                <td style={{ ...cellStyle, width: '2rem', textAlign: 'center' }}>{renderStatusIcon(tx.status)}</td>
                <td style={cellStyle}>
                  {tx.required_auths?.[0] ? (
                    <a
                      href={`https://vsc.techcoderx.com/address/hive:${tx.required_auths[0]}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {tx.required_auths[0]}
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
                <td style={cellStyle}>{getOperationLabel(tx)}</td>
                <td style={cellStyle}>{getAmountLabel(tx)}</td>
                <td style={cellStyle}>{tx.anchr_height ?? '—'}</td>
                <td style={cellStyle} title={formatLocalTime(tx.anchr_ts)}>
                  {formatRelativeTime(tx.anchr_ts)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const renderWitnessTable = () => {
    if (witnessError) {
      return (
        <div style={{ color: '#ff6464', fontSize: '0.9rem' }}>
          Failed to load witness data. Retrying...
        </div>
      )
    }

    if (!witnesses.length && witnessLoading) {
      return <div style={{ fontSize: '0.9rem' }}>Loading witness data...</div>
    }

    if (!witnesses.length) {
      return <div style={{ fontSize: '0.9rem' }}>No witness data yet.</div>
    }

    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...cellStyle, fontWeight: 600 }}>Witness</th>
              <th style={{ ...cellStyle, fontWeight: 600 }}>Weight</th>
            </tr>
          </thead>
          <tbody>
            {witnesses.map((witness) => (
              <tr key={witness.account}>
                <td style={cellStyle}>
                  {witness?.account ? (
                    <a
                      href={`https://vsc.techcoderx.com/address/hive:${witness.account}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {witness.account}
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
                <td style={cellStyle}>{formatWeight(witness.weight)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const renderBlocksTable = () => {
    if (blocksError) {
      return (
        <div style={{ color: '#ff6464', fontSize: '0.9rem' }}>
          Failed to load blocks. Retrying...
        </div>
      )
    }

    if (!blocks.length && blocksLoading) {
      return <div style={{ fontSize: '0.9rem' }}>Loading latest blocks...</div>
    }

    if (!blocks.length) {
      return <div style={{ fontSize: '0.9rem' }}>No block data yet.</div>
    }

    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...cellStyle, fontWeight: 600 }}>Block</th>
              <th style={{ ...cellStyle, fontWeight: 600 }}>Proposer</th>
              <th style={{ ...cellStyle, fontWeight: 600 }}>Timestamp</th>
              <th style={{ ...cellStyle, fontWeight: 600 }}>CID</th>
            </tr>
          </thead>
          <tbody>
            {blocks.map((block) => {
              const blockId = parseNumeric(block?.be_info?.block_id) ?? '—'
              const proposer = block?.proposer ?? '—'
              const ts = block?.be_info?.ts ?? block?.ts
              const cid = block?.block
              const rowKey = `${blockId}-${cid ?? Math.random()}`
              const blockUrl = Number.isFinite(blockId) ? `https://vsc.techcoderx.com/block/${blockId}` : null
              const proposerUrl = proposer && proposer !== '—'
                ? `https://vsc.techcoderx.com/address/hive:${proposer}`
                : null
              return (
                <tr key={rowKey}>
                  <td style={cellStyle}>
                    {blockUrl ? (
                      <a href={blockUrl} target="_blank" rel="noreferrer">
                        {blockId}
                      </a>
                    ) : (
                      blockId
                    )}
                  </td>
                  <td style={cellStyle}>
                    {proposerUrl ? (
                      <a href={proposerUrl} target="_blank" rel="noreferrer">
                        {proposer}
                      </a>
                    ) : (
                      proposer
                    )}
                  </td>
                  <td style={cellStyle}>{formatRelativeTime(ts)}</td>
                  <td style={cellStyle}>
                    {blockUrl ? (
                      <a href={blockUrl} target="_blank" rel="noreferrer">
                        {formatBlockCid(cid)}
                      </a>
                    ) : (
                      formatBlockCid(cid)
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  const renderActiveContent = () => {
    switch (activeTab) {
      case 'blocks':
        return renderBlocksTable()
      case 'witnesses':
        return renderWitnessTable()
      case 'txs':
      default:
        return renderTxTable()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, minHeight: 0 }}>
      <Tabs
  tabs={TABS}
  activeTab={activeTab}
  onChange={setActiveTab}
/>

      <div style={{ flex: 1, minHeight: 0 }}>{renderActiveContent()}</div>
    </div>
  )
}
