import { useMemo } from 'preact/hooks'
import { gql, useQuery } from '@urql/preact'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faVoteYea, faCalculator, faPlay, faLink } from '@fortawesome/free-solid-svg-icons'
import NeonButton from '../buttons/NeonButton.jsx'
import { formatUTC } from '../../lib/friendlyDates.js'
import Avatar from '../common/Avatar.jsx'
import PollPie from './PollPie.jsx'

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
      active_members
      members
    }
    created: okinoko_dao_proposal_created_events(
      where: { proposal_id: { _eq: $proposalId } }
      order_by: { indexer_ts: desc }
      limit: 1
    ) {
      indexer_ts
      indexer_block_height
    }
    votes: okinoko_dao_votes_view(where: { proposal_id: { _eq: $proposalId } }) {
      voter
      weight
      choices
    }
  }
`

const DAO_SETTINGS_QUERY = gql`
  query DaoSettings($projectId: numeric!) {
    dao: okinoko_dao_project_created_events(where: { project_id: { _eq: $projectId } }) {
      threshold_percent
      quorum_percent
      voting_system
    }
  }
`

export default function ProposalDetailPopup({ proposal, isMember, onVote, onTally, onExecute }) {
  const proposalId = proposal?.proposal_id
  const projectId = proposal?.project_id
  const numericProposalId = Number(proposalId)
  const numericProjectId = Number(projectId)
  const hasProposalId = proposalId !== undefined && proposalId !== null && !Number.isNaN(numericProposalId)
  const hasProjectId = projectId !== undefined && projectId !== null && !Number.isNaN(numericProjectId)
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
  const votes = data?.votes || []
  const detailProjectId = Number(detail?.project_id)

  // Fetch DAO settings for threshold/quorum
  const [{ data: daoData }] = useQuery({
    query: DAO_SETTINGS_QUERY,
    variables: { projectId: hasProjectId ? numericProjectId : detailProjectId },
    pause: !hasProjectId && !Number.isFinite(detailProjectId),
    requestPolicy: 'cache-first',
  })
  const daoSettings = daoData?.dao?.[0] || {}

  const createdEvent = data?.created?.[0]
  const createdAt = createdEvent?.indexer_ts ? new Date(createdEvent.indexer_ts) : null
  const durationHours = Number(detail?.duration_hours)
  const deadline = useMemo(() => {
    if (!createdAt || !Number.isFinite(durationHours)) return null
    return new Date(createdAt.getTime() + durationHours * 60 * 60 * 1000)
  }, [createdAt, durationHours])
  const tallyLocked = deadline ? Date.now() < deadline.getTime() : false
  const votingEnded = deadline ? Date.now() >= deadline.getTime() : false
  const hasResult = detail?.result !== null && detail?.result !== undefined && detail?.result !== ''
  const stateLower = (detail?.state || '').toLowerCase()
  const alreadyTallied = hasResult ||
    stateLower === 'passed' ||
    stateLower === 'failed' ||
    stateLower === 'approved' ||
    stateLower === 'rejected' ||
    stateLower === 'executed'
  const executionReady =
    hasResult ||
    votingEnded ||
    stateLower === 'ready' ||
    stateLower === 'passed' ||
    stateLower === 'approved' ||
    stateLower === 'completed'
  const alreadyExecuted = stateLower === 'executed'
  const canExecute = detail?.is_poll === false && !alreadyExecuted

  // Voting statistics
  const votingStats = useMemo(() => {
    const activeMembers = Number(detail?.active_members) || 1 // Default to 1 to avoid division by zero
    const totalMembers = Number(detail?.members) || activeMembers
    const thresholdPercent = Number(daoSettings?.threshold_percent) || 0
    const quorumPercent = Number(daoSettings?.quorum_percent) || 0
    const isStakeWeighted = daoSettings?.voting_system === '1'

    // Count votes and calculate weights
    const voterCount = votes.length
    const totalWeight = votes.reduce((sum, v) => sum + (Number(v.weight) || 1), 0)

    // For democratic voting, quorum is based on voter count / active members
    // For stake-weighted, it would be based on weight ratios
    const quorumCurrent = activeMembers > 0
      ? (voterCount / activeMembers) * 100
      : (voterCount > 0 ? 100 : 0)

    // For DAO voting:
    // - All votes are approval votes (voting = supporting the proposal)
    // - The choice field indicates which payout option is selected (for multi-option proposals)
    // - Threshold = total vote weight as percentage that passes the threshold requirement
    // Since all votes are approval, threshold is always 100% if anyone voted
    const approveWeight = totalWeight
    const rejectWeight = 0

    // Threshold current shows participation reached vs required threshold
    // For DAOs, the threshold is typically about what % of votes need to pass
    // Since voting = approval, if anyone voted, threshold is met
    const thresholdCurrent = voterCount > 0 ? 100 : 0

    return {
      activeMembers: Number(detail?.active_members) || voterCount || 0,
      totalMembers,
      voterCount,
      totalWeight,
      thresholdPercent,
      quorumPercent,
      thresholdCurrent: Math.round(thresholdCurrent * 10) / 10,
      quorumCurrent: Math.round(quorumCurrent * 10) / 10,
      approveWeight,
      rejectWeight,
      isStakeWeighted,
    }
  }, [detail, daoSettings, votes])

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
              <NeonButton disabled={votingEnded || alreadyTallied} onClick={onVote} style={popupButtonStyle}>
                <FontAwesomeIcon icon={faVoteYea}  style={{ fontSize: '0.9rem' }}/>
                <span>{votingEnded || alreadyTallied ? 'Voting closed' : 'Vote'}</span>
              </NeonButton>
            )}
            {isMember && (
              <NeonButton disabled={tallyLocked || alreadyTallied} onClick={onTally} style={popupButtonStyle}>
                <FontAwesomeIcon icon={faCalculator}  style={{ fontSize: '0.9rem' }}/>
                <span>{alreadyTallied ? 'Tallied' : tallyLocked ? 'Tally (locked)' : 'Tally'}</span>
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

      {/* Voting Statistics with Pie Charts */}
      <div style={{
        display: 'flex',
        gap: '24px',
        justifyContent: 'center',
        flexWrap: 'wrap',
        padding: '16px',
        background: 'rgba(0, 0, 0, 0.2)',
      }}>
        {/* Quorum */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '16px',
          border: '1px solid var(--color-primary-darkest)',
          background: 'rgba(0, 0, 0, 0.3)',
        }}>
          <div style={{ fontSize: 'var(--font-size-base)', textAlign: 'right', opacity: 0.9 }}>
            <div style={{ fontWeight: 700 }}>Quorum</div>
            <div>{votingStats.quorumCurrent}% / {votingStats.quorumPercent}%</div>
            <div style={{ opacity: 0.7 }}>{votingStats.voterCount} / {votingStats.activeMembers} voted</div>
          </div>
          <PollPie
            size={125}
            parts={[
              { percent: Math.min(100, votingStats.quorumCurrent) },
            ]}
          />
        </div>

        {/* Threshold */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '16px',
          border: '1px solid var(--color-primary-darkest)',
          background: 'rgba(0, 0, 0, 0.3)',
        }}>
          <PollPie
            size={125}
            parts={[
              { percent: votingStats.thresholdCurrent },
            ]}
          />
          <div style={{ fontSize: 'var(--font-size-base)', textAlign: 'left', opacity: 0.9 }}>
            <div style={{ fontWeight: 700 }}>Threshold</div>
            <div>{votingStats.thresholdCurrent}% / {votingStats.thresholdPercent}%</div>
            <div style={{ opacity: 0.7 }}>
              {votingStats.isStakeWeighted
                ? `Weight: ${votingStats.approveWeight.toFixed(3)}`
                : `${votingStats.voterCount} vote${votingStats.voterCount !== 1 ? 's' : ''}`
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
