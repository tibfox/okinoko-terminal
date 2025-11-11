import { useEffect, useMemo, useState } from 'preact/hooks'
import { useQuery } from '@urql/preact'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {  faCheckCircle,   faHourglass } from '@fortawesome/free-solid-svg-icons'
import {   faCircleXmark } from '@fortawesome/free-regular-svg-icons'
import { TRANSACTION_API_HTTP } from '../../../lib/graphqlEndpoints.js'

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
    }
  }
`

const TABS = [
  { id: 'txs', label: 'Txs' },
  { id: 'blocks', label: 'Blocks' },
  { id: 'witnesses', label: 'Witnesses' },
]

const POLL_INTERVAL_MS = 5000
const MAX_ROWS = 40

const DUMMY_BLOCKS = [
  { height: 0, producer: 'pending', txCount: 0, note: 'Live feed coming soon' },
  { height: 0, producer: 'pending', txCount: 0, note: 'Live feed coming soon' },
]

const DUMMY_WITNESSES = [
  { name: 'Rotation pending', status: '—', lastBlock: '—', note: 'Live metrics soon' },
  { name: 'Rotation pending', status: '—', lastBlock: '—', note: 'Live metrics soon' },
]

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

export default function MonitorPanel() {
  const [activeTab, setActiveTab] = useState('txs')
  const [transactions, setTransactions] = useState([])
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
    }, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [reexecuteQuery, txQueryContext])

  useEffect(() => {
    const incoming = data?.findTransaction ?? []
    if (incoming.length === 0) {
      return
    }

    setTransactions((prev) => mergeTransactions(prev, incoming))
  }, [data])

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
              <th style={{ ...cellStyle, fontWeight: 600, width: '2rem' }} aria-label="status" />
              <th style={{ ...cellStyle, fontWeight: 600 }}>Account</th>
              <th style={{ ...cellStyle, fontWeight: 600 }}>Operation</th>
              <th style={{ ...cellStyle, fontWeight: 600 }}>Height</th>
              <th style={{ ...cellStyle, fontWeight: 600 }}>Anchored</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((tx) => (
              <tr key={tx.id}>
                <td style={{ ...cellStyle, width: '2rem', textAlign: 'center' }}>{renderStatusIcon(tx.status)}</td>
                <td style={cellStyle}>{tx.required_auths?.[0] ?? '—'}</td>
                <td style={cellStyle}>{tx.op_types?.[0] ?? tx.type ?? '—'}</td>
                <td style={cellStyle}>{tx.anchr_height ?? '—'}</td>
                <td style={cellStyle}>{formatLocalTime(tx.anchr_ts)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const renderDummyTable = (rows, columns) => (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} style={{ ...cellStyle, fontWeight: 600 }}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.name ?? row.note}-${index}`}>
              {columns.map((column) => (
                <td key={column.key} style={cellStyle}>
                  {row[column.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const activeContent = useMemo(() => {
    switch (activeTab) {
      case 'blocks':
        return renderDummyTable(DUMMY_BLOCKS, [
          { key: 'height', label: 'Height' },
          { key: 'producer', label: 'Producer' },
          { key: 'txCount', label: 'Txs' },
          { key: 'note', label: 'Status' },
        ])
      case 'witnesses':
        return renderDummyTable(DUMMY_WITNESSES, [
          { key: 'name', label: 'Witness' },
          { key: 'status', label: 'Status' },
          { key: 'lastBlock', label: 'Last Block' },
          { key: 'note', label: 'Notes' },
        ])
      case 'txs':
      default:
        return renderTxTable()
    }
  }, [activeTab, transactions, fetching, error])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: '0 0 auto',
              padding: '0.35rem 0.85rem',
              borderRadius: '6px',
              border: '1px solid var(--color-primary-dark)',
              background: activeTab === tab.id ? 'var(--color-primary-darkest)' : 'transparent',
              color: 'var(--color-primary)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>{activeContent}</div>
    </div>
  )
}
