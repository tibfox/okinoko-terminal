import { useMemo, useState } from 'preact/hooks'
import { gql, useQuery } from '@urql/preact'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUserAstronaut } from '@fortawesome/free-solid-svg-icons'
import NeonButton from '../buttons/NeonButton.jsx'
import { formatUTC } from '../../lib/friendlyDates.js'

const PROPOSAL_DETAIL_QUERY = gql`
  query ProposalDetail($proposalId: numeric!) {
    proposal: okinoko_dao_proposal_overview(where: { proposal_id: { _eq: $proposalId } }) {
      proposal_id
      project_id
      name
      description
      metadata
      options
      payouts
      outcome_meta
      duration_hours
      is_poll
      created_by
      state
      state_block
      ready_at
      ready_block
      result
      result_block
      member
      member_active
      last_action
    }
    created: okinoko_dao_proposal_created_events(
      where: { proposal_id: { _eq: $proposalId } }
      order_by: { indexer_ts: desc }
      limit: 1
    ) {
      indexer_ts
      indexer_block_height
    }
  }
`

const ProposalAvatar = ({ creator }) => {
  const [avatarError, setAvatarError] = useState(false)
  const hiveUser = (creator || '').startsWith('hive:') ? (creator || '').replace(/^hive:/, '') : null
  const avatarUrl = hiveUser ? `https://images.hive.blog/u/${hiveUser}/avatar` : null
  const size = 140
  if (avatarUrl && !avatarError) {
    return (
      <img
        src={avatarUrl}
        alt="Creator avatar"
        onError={() => setAvatarError(true)}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          objectFit: 'cover',
          border: '2px solid var(--color-primary)',
          boxShadow: '0 0 10px rgba(0,0,0,0.6)',
        }}
      />
    )
  }
  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        border: '2px solid var(--color-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-primary)',
        boxShadow: '0 0 10px rgba(0,0,0,0.6)',
      }}
    >
      <FontAwesomeIcon icon={faUserAstronaut} size="3x" />
    </div>
  )
}

export default function ProposalDetailPopup({ proposal, isMember, onVote, onTally, onExecute }) {
  const proposalId = proposal?.proposal_id
  const [{ data, fetching, error }] = useQuery({
    query: PROPOSAL_DETAIL_QUERY,
    variables: { proposalId },
    pause: !proposalId,
    requestPolicy: 'network-only',
  })

  const detail = data?.proposal?.[0] || proposal || {}
  const createdEvent = data?.created?.[0]
  const createdAt = createdEvent?.indexer_ts ? new Date(createdEvent.indexer_ts) : null
  const durationHours = Number(detail?.duration_hours)
  const deadline = useMemo(() => {
    if (!createdAt || !Number.isFinite(durationHours)) return null
    return new Date(createdAt.getTime() + durationHours * 60 * 60 * 1000)
  }, [createdAt, durationHours])
  const tallyLocked = deadline ? Date.now() < deadline.getTime() : false
  const hasResult = detail?.result !== null && detail?.result !== undefined && detail?.result !== ''
  const stateLower = (detail?.state || '').toLowerCase()
  const executionReady =
    hasResult ||
    stateLower === 'ready' ||
    stateLower === 'passed' ||
    stateLower === 'approved' ||
    stateLower === 'completed'
  const alreadyExecuted = stateLower === 'executed'
  const canExecute = detail?.is_poll === false && !alreadyExecuted

  const options = (detail?.options || '')
    .split(';')
    .map((o) => o.trim())
    .filter(Boolean)
  const payouts = (detail?.payouts || '')
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean)
  const metaEntries = (detail?.outcome_meta || '')
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean)

  if (fetching) {
    return <div>Loading proposal…</div>
  }

  if (error || !detail?.proposal_id) {
    return <div style={{ color: 'var(--color-primary-lighter)' }}>Could not load proposal details.</div>
  }

  const formatDateUtc = (value) => {
    if (value == null) return null
    const date =
      value instanceof Date
        ? value
        : Number.isFinite(value)
          ? new Date(value)
          : new Date(value)
    if (Number.isNaN(date.getTime())) return null
    return formatUTC(date.toISOString())
  }

  const formatReadyAt = (value) => {
    const num = Number(value)
    if (!Number.isFinite(num)) return null
    return formatDateUtc(num * 1000) // ready_at is seconds
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '260px' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '12px',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontWeight: 800, fontSize: '1.15rem', marginBottom: '6px' }}>
            {detail.name || `Proposal #${detail.proposal_id}`}
          </div>
          {detail.description ? (
            <div style={{ fontSize: '0.9rem', lineHeight: 1.35, opacity: 0.9 }}>
              {detail.description}
            </div>
          ) : null}
        </div>
        <div
          style={{
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <ProposalAvatar creator={detail.created_by} />
          <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
            {detail.created_by || 'Unknown creator'}
          </div>
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          margin: '4px 0 6px',
          alignItems: 'center',
        }}
      >
        {isMember && <NeonButton onClick={onVote}>Vote</NeonButton>}
        {isMember && <NeonButton disabled={tallyLocked} onClick={onTally}>
          {tallyLocked ? 'Tally (after deadline)' : 'Tally'}
        </NeonButton>}
        {isMember && canExecute && (
          <NeonButton disabled={!executionReady} onClick={onExecute}>
            {executionReady ? 'Execute' : 'Execute (after tally)'}
          </NeonButton>
        )}
      </div>
      <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
        
        {createdAt && <div>Created: {formatDateUtc(createdAt)}</div>}
          
        <div>
          Duration: {Number.isFinite(durationHours) ? `${durationHours}h` : 'n/a'}
          {deadline ? ` (ends ${formatDateUtc(deadline)})` : ''}
        </div>
        State: {detail.result?.toUpperCase() || detail.state || 'pending'}
        {detail.metadata && <div>Metadata: {detail.metadata}</div>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px', fontSize: '0.9rem' }}>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.9rem' }}>
      {detail.is_poll ? (
        <div>
        <div style={{ fontWeight: 700 }}>Poll Options</div>
         {options.length === 0 ? (
          <div style={{ opacity: 0.8 }}>No options provided.</div>
        ) : (
          options.map((opt, idx) => (
            <div key={`opt-${idx}`} style={{ opacity: 0.9 }}>
              {idx + 1}. {opt}
            </div>
          ))
        )}
        </div>
      ) : (
        <div>
        <div style={{ fontWeight: 700 }}>Proposal Options</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.9rem' }}>
        <div style={{ fontWeight: 700 }}>Payouts</div>
        {payouts.length === 0 ? (
          <div style={{ opacity: 0.8 }}>No payouts listed.</div>
        ) : (
          payouts.map((pay, idx) => {
            const sep = pay.lastIndexOf(':')
            const left = sep === -1 ? pay : pay.slice(0, sep)
            const right = sep === -1 ? '' : pay.slice(sep + 1)
            return (
              <div key={`payout-${idx}`} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {idx === 0 && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '8px',
                      fontWeight: 700,
                      opacity: 0.8,
                    }}
                  >
                    <div>Target</div>
                    <div>Amount</div>
                  </div>
                )}
                <div
                  style={{
                    opacity: 0.9,
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                  }}
                >
                  <div>{left}</div>
                  <div>{right}</div>
                </div>
              </div>
            )
          })
        )}
      </div>
      {metaEntries.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.9rem' }}>
          <div style={{ fontWeight: 700 }}>Outcome Meta</div>
          {metaEntries.map((entry, idx) => {
            const eqIdx = entry.indexOf('=')
            const left = eqIdx === -1 ? entry : entry.slice(0, eqIdx)
            const right = eqIdx === -1 ? '' : entry.slice(eqIdx + 1)
            return (
              <div key={`meta-${idx}`} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {idx === 0 && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '8px',
                      fontWeight: 700,
                      opacity: 0.8,
                    }}
                  >
                    <div>Key</div>
                    <div>Value</div>
                  </div>
                )}
                <div
                  style={{
                    opacity: 0.9,
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                  }}
                >
                  <div>{left}</div>
                  <div>{right}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>

      )}
      </div>
    </div>
  )
}
