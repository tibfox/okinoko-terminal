import { useMemo } from 'preact/hooks'
import { gql, useQuery } from '@urql/preact'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faVoteYea, faCalculator, faPlay, faLink } from '@fortawesome/free-solid-svg-icons'
import NeonButton from '../buttons/NeonButton.jsx'
import { formatUTC } from '../../lib/friendlyDates.js'
import Avatar from '../common/Avatar.jsx'

const PROPOSAL_DETAIL_QUERY = gql`
  query ProposalDetail($proposalId: numeric!) {
    proposal: okinoko_dao_proposal_overview(where: { proposal_id: { _eq: $proposalId } }) {
      proposal_id
      project_id
      name
      description
      metadata
      url
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

export default function ProposalDetailPopup({ proposal, isMember, onVote, onTally, onExecute }) {
  const proposalId = proposal?.proposal_id
  const numericProposalId = Number(proposalId)
  const hasProposalId = proposalId !== undefined && proposalId !== null && !Number.isNaN(numericProposalId)
  if (!hasProposalId) {
    console.warn('[ProposalDetailPopup] Missing proposal_id in payload', proposal)
  }
  const [{ data, fetching, error }] = useQuery({
    query: PROPOSAL_DETAIL_QUERY,
    variables: { proposalId: numericProposalId },
    pause: !hasProposalId,
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
    console.log('[ProposalDetailPopup] fetching proposal', proposalId)
    return <div>Loading proposal…</div>
  }

  const hasDetailId =
    detail?.proposal_id !== undefined &&
    detail?.proposal_id !== null &&
    !Number.isNaN(Number(detail?.proposal_id))

  if (error || !hasDetailId) {
    console.error('[ProposalDetailPopup] Failed to load proposal', { proposalId, error, data })
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

  const proposalUrl = detail.url

  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 900 : false
  const headerLayoutStyle = isMobile
    ? { display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }
    : { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', alignItems: 'center' }
  const tableCellLabel = {
    paddingRight: '12px',
    paddingBottom: '6px',
    whiteSpace: 'nowrap',
    width: '1%',
    opacity: 0.8,
  }
  const tableCellValue = { paddingBottom: '6px' }
  const popupButtonStyle = {
    backgroundColor: 'transparent',
    color: 'var(--color-primary-lighter)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontSize: 'var(--font-size-base)',
    padding: '0.35em 0.8em',
    cursor: 'pointer',
    border: '1px solid var(--color-primary-darkest)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    textAlign: 'left',
    whiteSpace: 'nowrap',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '260px' }}>
      <div style={{
        ...headerLayoutStyle,
        padding: '16px',
        background: 'linear-gradient(135deg, rgba(246, 173, 85, 0.1) 0%, rgba(79, 209, 197, 0.1) 100%)',
        border: '1px solid var(--color-primary-darkest)',
      }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 'var(--font-size-base)', marginBottom: '6px', textAlign: isMobile ? 'center' : 'left' }}>
            {detail.name || `Proposal #${detail.proposal_id}`}
          </div>
          {detail.description ? (
            <div style={{ fontSize: 'var(--font-size-base)', lineHeight: 1.35, opacity: 0.9, textAlign: isMobile ? 'center' : 'left' }}>
              {detail.description}
            </div>
          ) : null}
          <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: isMobile ? 'center' : 'flex-start' }}>
            {proposalUrl && (
              <NeonButton
                onClick={() => {
                  try {
                    window.open(proposalUrl, '_blank')
                  } catch {}
                }}
                style={popupButtonStyle}
              >
                <FontAwesomeIcon icon={faLink}  style={{ fontSize: '0.9rem' }} />
                <span>Open Proposal URL</span>
              </NeonButton>
            )}
            {isMember && (
              <NeonButton onClick={onVote} style={popupButtonStyle}>
                <FontAwesomeIcon icon={faVoteYea}  style={{ fontSize: '0.9rem' }}/>
                <span>Vote</span>
              </NeonButton>
            )}
            {isMember && (
              <NeonButton disabled={tallyLocked} onClick={onTally} style={popupButtonStyle}>
                <FontAwesomeIcon icon={faCalculator}  style={{ fontSize: '0.9rem' }}/>
                <span>{tallyLocked ? 'Tally (locked)' : 'Tally'}</span>
              </NeonButton>
            )}
            {isMember && canExecute && (
              <NeonButton disabled={!executionReady} onClick={onExecute} style={popupButtonStyle}>
                <FontAwesomeIcon icon={faPlay}  style={{ fontSize: '0.9rem' }}/>
                <span>{executionReady ? 'Execute' : 'Execute (wait)'}</span>
              </NeonButton>
            )}
          </div>
        </div>
        <div
          style={{
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            order: isMobile ? -1 : 0,
          }}
        >
          <Avatar username={detail.created_by} size={140} />
          <div style={{ fontSize: 'var(--font-size-base)', opacity: 0.9 }}>
            {detail.created_by || 'Unknown creator'}
          </div>
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .proposal-two-column {
            display: flex !important;
            flex-direction: row !important;
            gap: 24px !important;
          }
          .proposal-left-col {
            flex: 1 !important;
            min-width: 0 !important;
          }
          .proposal-right-col {
            flex: 1 !important;
            min-width: 0 !important;
          }
        }
      `}</style>

      <div className="proposal-two-column" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px 0', background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.15) 100%)' }}>
        <div
          className="proposal-left-col"
          style={{
            padding: '12px',
            background: 'rgba(0, 0, 0, 0.2)',
            border: '1px solid var(--color-primary-darkest)',
          }}
        >
          <div style={{ fontSize: 'var(--font-size-base)', opacity: 0.9 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={tableCellLabel}>Created</td>
                  <td style={tableCellValue}>{createdAt ? formatDateUtc(createdAt) : 'n/a'}</td>
                </tr>
                <tr>
                  <td style={tableCellLabel}>Duration</td>
                  <td style={tableCellValue}>
                    {Number.isFinite(durationHours) ? `${durationHours}h` : 'n/a'}
                    {deadline ? ` (ends ${formatDateUtc(deadline)})` : ''}
                  </td>
                </tr>
                <tr>
                  <td style={tableCellLabel}>State</td>
                  <td style={tableCellValue}>{detail.result?.toUpperCase() || detail.state || 'pending'}</td>
                </tr>
                <tr>
                  <td style={tableCellLabel}>Metadata</td>
                  <td style={tableCellValue}>{detail.metadata || '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div
          className="proposal-right-col"
          style={{
            padding: '12px',
            background: 'rgba(0, 0, 0, 0.2)',
            border: '1px solid var(--color-primary-darkest)',
          }}
        >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: 'var(--font-size-base)' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: 'var(--font-size-base)' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: 'var(--font-size-base)' }}>
          <div style={{ fontWeight: 700 }}>Outcome Meta</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {metaEntries.map((entry, idx) => {
                const eqIdx = entry.indexOf('=')
                const left = eqIdx === -1 ? entry : entry.slice(0, eqIdx)
                const right = eqIdx === -1 ? '' : entry.slice(eqIdx + 1)
                return (
                  <tr key={`meta-${idx}`}>
                    <td style={tableCellLabel}>{left}</td>
                    <td style={tableCellValue}>{right || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>

      )}
      </div>
        </div>
      </div>
    </div>
  )
}
