import { useState, useEffect, useMemo } from 'preact/hooks'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner, faArrowRight, faArrowLeft, faFire, faHammer, faRocket, faPause, faPlay, faUserShield, faHandshake } from '@fortawesome/free-solid-svg-icons'
import DataTable from '../common/DataTable.jsx'

function formatTokenAmount(amount, decimals) {
  if (!amount) return '0'
  if (!decimals) return String(Number(amount))
  const fixed = (amount / (10 ** decimals)).toFixed(decimals)
  return fixed.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
}

function classifyEvent(evt, userAccount) {
  switch (evt._type) {
    case 'init':
      return { type: 'Init', icon: faRocket, color: '#74c0fc' }
    case 'pause':
      return { type: 'Pause', icon: faPause, color: '#f0ad4e' }
    case 'unpause':
      return { type: 'Unpause', icon: faPlay, color: '#51cf66' }
    case 'owner_change':
      return { type: 'Owner Change', icon: faUserShield, color: '#da77f2' }
    case 'approval':
      return { type: 'Approval', icon: faHandshake, color: '#74c0fc' }
    case 'transfer': {
      if (evt.from === '') return { type: 'Mint', icon: faHammer, color: '#f0ad4e' }
      if (evt.to === '') return { type: 'Burn', icon: faFire, color: '#ff6b6b' }
      if (evt.to === userAccount) return { type: 'Received', icon: faArrowLeft, color: '#51cf66' }
      if (evt.from === userAccount) return { type: 'Sent', icon: faArrowRight, color: '#ff6b6b' }
      return { type: 'Transfer', icon: faArrowRight, color: 'var(--color-primary-darker)' }
    }
    default:
      return { type: evt._type, icon: faArrowRight, color: 'var(--color-primary-darker)' }
  }
}

function getEventDetail(evt, decimals) {
  switch (evt._type) {
    case 'init':
      return `${evt.name} (${evt.symbol}), ${evt.decimals} decimals`
    case 'pause':
      return `by ${evt.by}`
    case 'unpause':
      return `by ${evt.by}`
    case 'owner_change':
      return `${evt.previous_owner} → ${evt.new_owner}`
    case 'approval':
      return `${evt.owner} → ${evt.spender}: ${formatTokenAmount(evt.amount, decimals)}`
    case 'transfer': {
      const from = evt.from === '' ? 'Mint' : evt.from
      const to = evt.to === '' ? 'Burn' : evt.to
      return `${from} → ${to}`
    }
    default:
      return '-'
  }
}

function getEventAmount(evt, decimals) {
  if (evt._type === 'transfer') return formatTokenAmount(evt.amount, decimals)
  if (evt._type === 'approval') return formatTokenAmount(evt.amount, decimals)
  if (evt._type === 'init' && evt.max_supply) return `Max: ${formatTokenAmount(evt.max_supply, Number(evt.decimals) || 0)}`
  return ''
}

function formatTime(ts) {
  if (!ts) return '-'
  const d = new Date(ts)
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function isUserRelated(evt, userAccount) {
  if (!userAccount) return true
  switch (evt._type) {
    case 'transfer':
      return evt.from === userAccount || evt.to === userAccount
    case 'approval':
      return evt.owner === userAccount || evt.spender === userAccount
    case 'owner_change':
      return evt.previous_owner === userAccount || evt.new_owner === userAccount
    case 'pause':
    case 'unpause':
      return evt.by === userAccount
    case 'init':
      return evt.owner === userAccount
    default:
      return true
  }
}

async function fetchAllEvents(hasuraHttp, contractId) {
  const queries = [
    {
      key: 'transfers',
      type: 'transfer',
      query: `query($id: String!) {
        magi_token_transfer_events(
          where: { indexer_contract_id: { _eq: $id } }
          order_by: { indexer_block_height: desc }
          limit: 100
        ) { from to amount indexer_block_height indexer_ts }
      }`,
      extract: (d) => d?.data?.magi_token_transfer_events || [],
    },
    {
      key: 'inits',
      type: 'init',
      query: `query($id: String!) {
        magi_token_init_events(
          where: { indexer_contract_id: { _eq: $id } }
          order_by: { indexer_block_height: desc }
          limit: 10
        ) { owner name symbol decimals max_supply indexer_block_height indexer_ts }
      }`,
      extract: (d) => d?.data?.magi_token_init_events || [],
    },
    {
      key: 'paused',
      type: 'pause',
      query: `query($id: String!) {
        magi_token_paused_events(
          where: { indexer_contract_id: { _eq: $id } }
          order_by: { indexer_block_height: desc }
          limit: 20
        ) { by indexer_block_height indexer_ts }
      }`,
      extract: (d) => d?.data?.magi_token_paused_events || [],
    },
    {
      key: 'unpaused',
      type: 'unpause',
      query: `query($id: String!) {
        magi_token_unpaused_events(
          where: { indexer_contract_id: { _eq: $id } }
          order_by: { indexer_block_height: desc }
          limit: 20
        ) { by indexer_block_height indexer_ts }
      }`,
      extract: (d) => d?.data?.magi_token_unpaused_events || [],
    },
    {
      key: 'owner_changes',
      type: 'owner_change',
      query: `query($id: String!) {
        magi_token_owner_change_events(
          where: { indexer_contract_id: { _eq: $id } }
          order_by: { indexer_block_height: desc }
          limit: 20
        ) { previous_owner new_owner indexer_block_height indexer_ts }
      }`,
      extract: (d) => d?.data?.magi_token_owner_change_events || [],
    },
    {
      key: 'approvals',
      type: 'approval',
      query: `query($id: String!) {
        magi_token_approval_events(
          where: { indexer_contract_id: { _eq: $id } }
          order_by: { indexer_block_height: desc }
          limit: 50
        ) { owner spender amount indexer_block_height indexer_ts }
      }`,
      extract: (d) => d?.data?.magi_token_approval_events || [],
    },
  ]

  const results = await Promise.all(
    queries.map(async (q) => {
      try {
        const res = await fetch(hasuraHttp, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q.query, variables: { id: contractId } }),
        })
        const data = await res.json()
        return q.extract(data).map((row) => ({ ...row, _type: q.type }))
      } catch {
        return []
      }
    }),
  )

  return results.flat().sort((a, b) => b.indexer_block_height - a.indexer_block_height)
}

export default function TokenTransferHistoryPopup({ contractId, tokenInfo, hasuraHttp, userAccount }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [onlyMe, setOnlyMe] = useState(true)

  const decimals = tokenInfo?.decimals || 0

  const filtered = useMemo(() => {
    if (!onlyMe || !userAccount) return events
    return events.filter((evt) => isUserRelated(evt, userAccount))
  }, [events, onlyMe, userAccount])

  useEffect(() => {
    if (!hasuraHttp || !contractId) return

    setLoading(true)
    fetchAllEvents(hasuraHttp, contractId)
      .then((all) => setEvents(all))
      .catch((err) => setError(err.message || 'Failed to fetch history'))
      .finally(() => setLoading(false))
  }, [hasuraHttp, contractId])

  if (loading) {
    return (
      <p style={{ color: 'var(--color-primary-lighter)', padding: '8px 2px' }}>
        <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '6px' }} />
        Loading history...
      </p>
    )
  }

  if (error) {
    return <p style={{ color: '#ff4444', padding: '8px 2px' }}>{error}</p>
  }

  if (events.length === 0) {
    return <p style={{ color: 'var(--color-primary-lighter)', padding: '8px 2px' }}>No events found for this token.</p>
  }

  return (
    <div className="neon-scroll" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <div style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-primary-darker)' }}>
          {tokenInfo?.name || 'Token'} ({tokenInfo?.symbol || '???'}) — {filtered.length} event{filtered.length !== 1 ? 's' : ''}
        </div>
        {userAccount && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-base)', color: 'var(--color-primary)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={onlyMe}
              onChange={(e) => setOnlyMe(e.target.checked)}
              style={{ accentColor: 'var(--color-primary)', cursor: 'pointer' }}
            />
            Only me
          </label>
        )}
      </div>
      {filtered.length === 0 ? (
        <p style={{ color: 'var(--color-primary-lighter)', padding: '8px 2px' }}>No matching events.</p>
      ) : (
      <DataTable
        headers={[
          '',
          'Details',
          { label: 'Amount', style: { textAlign: 'right' } },
          'Time',
        ]}
        rows={filtered.map((evt, i) => {
          const cls = classifyEvent(evt, userAccount)
          const amount = getEventAmount(evt, decimals)
          return {
            key: `${evt._type}-${evt.indexer_block_height}-${i}`,
            cells: [
              {
                content: (
                  <span style={{ color: cls.color, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                    <FontAwesomeIcon icon={cls.icon} style={{ fontSize: '0.75rem', width: '14px' }} />
                    {cls.type}
                  </span>
                ),
              },
              {
                content: getEventDetail(evt, decimals),
                style: { wordBreak: 'break-all' },
              },
              {
                content: amount,
                style: { textAlign: 'right', color: cls.color, whiteSpace: 'nowrap' },
              },
              {
                content: formatTime(evt.indexer_ts),
                style: { fontSize: 'var(--font-size-base)', color: 'var(--color-primary-darker)', whiteSpace: 'nowrap' },
              },
            ],
          }
        })}
      />
      )}
    </div>
  )
}
