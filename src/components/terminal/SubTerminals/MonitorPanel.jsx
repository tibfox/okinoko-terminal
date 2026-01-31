import { useEffect, useMemo, useState, useCallback } from 'preact/hooks'
import { useQuery } from '@urql/preact'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheckCircle, faHourglass } from '@fortawesome/free-solid-svg-icons'
import { faCircleXmark } from '@fortawesome/free-regular-svg-icons'
import { TRANSACTION_API_HTTP } from '../../../lib/graphqlEndpoints.js'
import { getNetworkConfigFromCookie, getAssetSymbolsFromCookie } from '../providers/NetworkTypeProvider.jsx'
import { Tabs } from '../../common/Tabs.jsx'
import { formatUTC } from '../../../lib/friendlyDates.js'




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
const TX_PAGE_SIZE = 20
const WITNESS_PAGE_SIZE = 20
const BLOCK_PAGE_SIZE = 20
const BLOCK_FETCH_COUNT = 200
const BLOCKS_API_BASE_URL = getNetworkConfigFromCookie().blocksBackend


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
  fontSize: 'var(--font-size-base)',
  fontFamily: 'var(--font-family-base)',
  textAlign: 'left',
}

const headerCellStyle = {
  ...cellStyle,
  fontWeight: 600,
  position: 'sticky',
  top: 0,
  background: 'var(--color-primary-darkest)',

  zIndex: 1,
}

const renderStatusIcon = (status) => {
  const normalized = status?.toUpperCase?.() ?? ''
  switch (normalized) {
    case 'CONFIRMED':
      return <FontAwesomeIcon icon={faCheckCircle} style={{ fontSize: '0.9rem' }} />
    case 'FAILED':
      return <FontAwesomeIcon icon={faCircleXmark} style={{ fontSize: '0.9rem' }} />
    case 'INCLUDED':
    default:
      return <FontAwesomeIcon icon={faHourglass} style={{ fontSize: '0.9rem' }} />
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

const mapOperationName = (name) => {
  if (name === 'consensus_unstake') {
    return 'cons_unstake'
  }
  return name
}

const getOperationLabel = (tx) => {
  const primaryType = tx?.op_types?.[0]
  if (typeof primaryType === 'string' && primaryType.toLowerCase() === 'call_contract') {
    const parsedData = getFirstOpData(tx)
    if (parsedData?.action) {
      return mapOperationName(parsedData.action)
    }
  }

  const result = primaryType ?? tx?.type ?? '—'
  return typeof result === 'string' ? mapOperationName(result) : result
}

const getNormalizedOperation = (tx) => {
  const label = getOperationLabel(tx)
  return typeof label === 'string' ? label.toLowerCase() : ''
}

const getAccountLabel = (tx) => {
  const data = getFirstOpData(tx)
  const op = getNormalizedOperation(tx)
  if (op === 'deposit') {
    if (data?.account) {
      return data.account
    }
    if (data?.from) {
      return data.from
    }
  }
  return tx?.required_auths?.[0] ?? null
}

const formatAssetName = (asset) => {
  if (!asset) return ''
  const assetSymbols = getAssetSymbolsFromCookie()
  const normalized = String(asset).toLowerCase()
  if (normalized === 'hbd_savings' || normalized === 'tbd_savings') {
    return assetSymbols.sHBD
  }
  if (normalized === 'hbd' || normalized === 'tbd') {
    return assetSymbols.HBD
  }
  if (normalized === 'hive') {
    return assetSymbols.HIVE
  }
  return String(asset).toUpperCase()
}

const formatAmount = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return value
  // If it's a whole number, don't show decimals
  if (num === Math.floor(num)) {
    return String(Math.floor(num))
  }
  // Otherwise show 3 decimal places
  return num.toFixed(3)
}

const getAmountLabel = (tx) => {
  const data = getFirstOpData(tx)
  if (!data) {
    return ''
  }

  const op = getNormalizedOperation(tx)
  if (op === 'deposit' && data.amount != null) {
    const numericAmount = Number(data.amount)
    if (Number.isFinite(numericAmount)) {
      const assetSuffix = data.asset ? ` ${formatAssetName(data.asset)}` : ''
      return `${formatAmount(numericAmount / 1000)}${assetSuffix}`
    }
  } else if (data.amount != null) {
    const assetSuffix = data.asset ? ` ${formatAssetName(data.asset)}` : ''
    return `${formatAmount(data.amount)}${assetSuffix}`
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
        const tokenSuffix = token ? ` ${formatAssetName(token)}` : ''
        return `${formatAmount(limit)}${tokenSuffix}`
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
  const [txPage, setTxPage] = useState(1)
  const [witnessPage, setWitnessPage] = useState(1)
  const [blockPage, setBlockPage] = useState(1)
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
  const txVariables = useMemo(
    () => ({
      filterOptions: {
        limit: TX_PAGE_SIZE,
        offset: Math.max(0, (txPage - 1) * TX_PAGE_SIZE),
      },
    }),
    [txPage],
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
    variables: txVariables,
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
    setTransactions(data?.findTransaction ?? [])
  }, [data])

  useEffect(() => {
    if (!fetching && txPage > 1 && transactions.length === 0) {
      setTxPage((prev) => Math.max(1, prev - 1))
    }
  }, [transactions, fetching, txPage])

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
    setWitnessPage((prev) => {
      const total = Math.max(1, Math.ceil(witnesses.length / WITNESS_PAGE_SIZE))
      return Math.min(prev, total)
    })
  }, [witnesses])

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
          count: String(BLOCK_FETCH_COUNT),
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

  useEffect(() => {
    setBlockPage((prev) => {
      const total = Math.max(1, Math.ceil(blocks.length / BLOCK_PAGE_SIZE))
      return Math.min(prev, total)
    })
  }, [blocks])

  const renderTxTable = () => {
    if (error) {
      return (
        <div style={{ color: '#ff6464', fontSize: 'var(--font-size-base)' }}>
          Failed to load transactions. Retrying...
        </div>
      )
    }

    const rows = transactions

    if (!rows.length && fetching) {
      return <div style={{ fontSize: 'var(--font-size-base)' }}>Loading latest transactions...</div>
    }

    if (!rows.length) {
      return <div style={{ fontSize: 'var(--font-size-base)' }}>No transactions yet. Monitoring...</div>
    }

    const pageRows = rows
    const disablePrev = txPage <= 1 || fetching
    const disableNext = fetching || rows.length < TX_PAGE_SIZE

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={headerCellStyle}>Tx</th>
              <th style={{ ...headerCellStyle, width: '2rem' }} aria-label="status" />
              <th style={headerCellStyle}>Account</th>
              <th style={headerCellStyle}>Operation</th>
              <th style={{ ...headerCellStyle, minWidth: '9rem' }}>Amount</th>
              <th style={headerCellStyle}>Anchored</th>
              <th style={headerCellStyle}>Height</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((tx) => (
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
                  {(() => {
                    const accountLabel = getAccountLabel(tx)
                    if (!accountLabel) {
                      return '—'
                    }
                    // Remove hive: prefix for display
                    const displayName = accountLabel.startsWith('hive:')
                      ? accountLabel.slice(5)
                      : accountLabel
                    const displayLabel =
                      displayName.length > 23 ? `${displayName.slice(0, 23)}...` : displayName
                    return (
                      <a
                        href={`https://vsc.techcoderx.com/address/${accountLabel}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {displayLabel}
                      </a>
                    )
                  })()}
                </td>
                <td style={cellStyle}>{getOperationLabel(tx)}</td>
                <td style={{ ...cellStyle, minWidth: '9rem' }}>{getAmountLabel(tx)}</td>
                <td style={cellStyle}>{formatUTC(tx.anchr_ts)}</td>
                <td style={cellStyle}>{tx.anchr_height ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {renderPaginationControls({
          disablePrev,
          disableNext,
          onPrev: () => setTxPage((prev) => Math.max(1, prev - 1)),
          onNext: () =>
            setTxPage((prev) => (disableNext ? prev : prev + 1)),
        })}
      </div>
    )
  }

  const paginateRows = (rows, page, pageSize) => {
    if (!Array.isArray(rows) || rows.length === 0) {
      return []
    }
    const start = (page - 1) * pageSize
    return rows.slice(start, start + pageSize)
  }

const renderPaginationControls = ({ disablePrev, disableNext, onPrev, onNext }) => {
  return (
    <div
      style={{
        display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 0',
          fontSize: 'var(--font-size-base)',
        }}
      >
        <button
          type="button"
          onClick={onPrev}
          disabled={disablePrev}
          style={{
            minWidth: '70px',
            padding: '4px 10px',
            fontFamily: 'var(--font-family-base)',
            fontSize: 'var(--font-size-base)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            background: 'transparent',
            color: 'inherit',
            cursor: disablePrev ? 'not-allowed' : 'pointer',
            opacity: disablePrev ? 0.4 : 1,
          }}
        >
          Prev
        </button>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)', margin: '0 12px' }} />
        <div className="next-button-glitter-wrapper">
          <button
            type="button"
            onClick={onNext}
            disabled={disableNext}
            style={{
              minWidth: '70px',
              padding: '4px 10px',
              fontFamily: 'var(--font-family-base)',
              fontSize: 'var(--font-size-base)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'transparent',
              color: 'inherit',
              cursor: disableNext ? 'not-allowed' : 'pointer',
              opacity: disableNext ? 0.4 : 1,
            }}
          >
            Next
          </button>
        </div>
      </div>
    )
  }

  const renderWitnessTable = () => {
    if (witnessError) {
      return (
        <div style={{ color: '#ff6464', fontSize: 'var(--font-size-base)' }}>
          Failed to load witness data. Retrying...
        </div>
      )
    }

    if (!witnesses.length && witnessLoading) {
      return <div style={{ fontSize: 'var(--font-size-base)' }}>Loading witness data...</div>
    }

    if (!witnesses.length) {
      return <div style={{ fontSize: 'var(--font-size-base)' }}>No witness data yet.</div>
    }

    const totalPages = Math.max(1, Math.ceil(witnesses.length / WITNESS_PAGE_SIZE))
    const pageRows = paginateRows(witnesses, witnessPage, WITNESS_PAGE_SIZE)
    const disablePrev = witnessPage <= 1
    const disableNext = witnessPage >= totalPages

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={headerCellStyle}>Witness</th>
              <th style={headerCellStyle}>Weight</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((witness) => (
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
        {renderPaginationControls({
          disablePrev,
          disableNext,
          onPrev: () => setWitnessPage((prev) => Math.max(1, prev - 1)),
          onNext: () =>
            setWitnessPage((prev) => (disableNext ? prev : Math.min(totalPages, prev + 1))),
        })}
      </div>
    )
  }

  const renderBlocksTable = () => {
    if (blocksError) {
      return (
        <div style={{ color: '#ff6464', fontSize: 'var(--font-size-base)' }}>
          Failed to load blocks. Retrying...
        </div>
      )
    }

    if (!blocks.length && blocksLoading) {
      return <div style={{ fontSize: 'var(--font-size-base)' }}>Loading latest blocks...</div>
    }

    if (!blocks.length) {
      return <div style={{ fontSize: 'var(--font-size-base)' }}>No block data yet.</div>
    }

    const totalPages = Math.max(1, Math.ceil(blocks.length / BLOCK_PAGE_SIZE))
    const pageRows = paginateRows(blocks, blockPage, BLOCK_PAGE_SIZE)
    const disablePrev = blockPage <= 1
    const disableNext = blockPage >= totalPages

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={headerCellStyle}>Block</th>
              <th style={headerCellStyle}>Proposer</th>
              <th style={headerCellStyle}>Timestamp</th>
              <th style={headerCellStyle}>CID</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((block) => {
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
                  <td style={cellStyle}>{formatUTC(ts)}</td>
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
        {renderPaginationControls({
          disablePrev,
          disableNext,
          onPrev: () => setBlockPage((prev) => Math.max(1, prev - 1)),
          onNext: () =>
            setBlockPage((prev) => (disableNext ? prev : Math.min(totalPages, prev + 1))),
        })}
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

      <div className="neon-scroll" style={{ flex: 1, minHeight: 0 }}>{renderActiveContent()}</div>
    </div>
  )
}
