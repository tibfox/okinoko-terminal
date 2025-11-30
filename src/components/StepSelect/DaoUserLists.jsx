import { useMemo, useState, useContext, useCallback } from 'preact/hooks'
import { gql, useQuery, useClient } from '@urql/preact'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faChevronDown,
  faChevronUp,
  faCircleInfo,
  faPlusCircle,
  faUserPlus,
} from '@fortawesome/free-solid-svg-icons'
import ListButton from '../buttons/ListButton.jsx'
import NeonButton from '../buttons/NeonButton.jsx'
import contractsCfg from '../../data/contracts.json'
import useExecuteHandler from '../../lib/useExecuteHandler.js'
import { PopupContext } from '../../popup/context.js'


const DAO_VSC_ID = 'vsc1BVa7SPMVKQqsJJZVp2uPQwmxkhX4qbugGt'
const DAO_JOIN_FN = 'project_join'

const DAO_USER_QUERY = gql`
  query DaoUserLists($user: String!) {
    projects: okinoko_dao_project_created_events(order_by: { project_id: asc }) {
      project_id
      name
      description
      created_by
      funds_asset
      voting_system
      threshold_percent
      quorum_percent
      proposal_duration_hours
      execution_delay_hours
      leave_cooldown_hours
      proposal_cost
      stake_min_amount
      proposals_members_only
    }
    memberships: okinoko_dao_membership_latest(where: { member: { _eq: $user } }) {
      project_id
      active
      last_action
    }
    daoProposals: okinoko_dao_proposal_overview(order_by: { proposal_id: desc }) {
      proposal_id
      project_id
      name
      state
      result
      created_by
      member
      member_active
      payouts
      is_poll
      outcome_meta
    }
  }`

  const DaoDetail = ({ projectId, client, onCreateProposal: detailCreate }) => {
    const [{ data: detailData, fetching: detailFetching, error: detailError }] = useQuery({
      query: DAO_DETAIL_QUERY,
      variables: { projectId },
      requestPolicy: 'network-only',
    })

    if (detailFetching) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* <Spinner size={16} /> */}
          <span>Loading DAO details…</span>
        </div>
      )
    }

    if (detailError || !detailData) {
      return <div style={{ color: 'var(--color-primary-lighter)' }}>Could not load DAO details.</div>
    }

    const projRows = detailData.project || []
    const base = projRows[0] || {}

    const memberMap = new Map()
    projRows.forEach((r) => {
      if (!r.member) return
      const name = r.member
      const active = r.active
      const existing = memberMap.get(name)
      if (!existing || active) {
        memberMap.set(name, { name, active })
      }
    })
    const creatorName = base.created_by
    if (creatorName && !memberMap.has(creatorName)) {
      memberMap.set(creatorName, { name: creatorName, active: true })
    }
    const members = Array.from(memberMap.values())

    const proposalsMap = new Map()
    ;(detailData.proposals || []).forEach((p) => {
      if (!proposalsMap.has(p.proposal_id)) {
        proposalsMap.set(p.proposal_id, p)
      }
    })
    const proposals = Array.from(proposalsMap.values())
    const treasury = detailData.treasury || []

    const treasuryTotals = treasury.reduce((acc, t) => {
      const key = (t.asset || '').toUpperCase()
      if (!acc[key]) acc[key] = 0
      const amt = Number(t.amount) || 0
      acc[key] += t.direction === 'out' ? -amt : amt
      return acc
    }, {})

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '260px' }}>
        <div>
          <div style={{ fontWeight: 700 }}>{base.name || `DAO #${projectId}`}</div>
          <div style={{ fontSize: '0.9rem', lineHeight: 1.4, opacity: 0.9, marginBottom: '6px' }}>by {base.created_by || 'n/a'}</div>
          <div style={{ fontSize: '0.9rem', lineHeight: 1.4, opacity: 0.9 }}>{base.description}</div>
          
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px', fontSize: '0.9rem' }}>
          <div>Voting: {base.voting_system === '1' ? 'Stake-weighted' : 'Democratic'}</div>
          <div>Minimum Stake / Fee: {base.stake_min_amount ?? '?'} {(base.funds_asset || 'HIVE').toUpperCase()}</div>
          <div>Proposal Cost: {base.proposal_cost ?? '?'} {(base.funds_asset || 'HIVE').toUpperCase()}</div>
          
          <div>Threshold: {base.threshold_percent ?? '?'}%</div>
          <div>Quorum: {base.quorum_percent ?? '?'}%</div>
          
        </div>

        <div>
          <div style={{ fontWeight: 700, marginBottom: '4px' }}>Members</div>
          {members.length === 0 ? (
            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>No members listed.</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '0.9rem' }}>
              {members.map((m) => (
                <span
                  key={m.name}
                  style={{
                    padding: '4px 8px',
                    border: '1px solid var(--color-primary-darkest)',
                    borderRadius: '6px',
                    opacity: m.active ? 1 : 0.6,
                  }}
                >
                  {m.name} {m.active ? '' : '(former)'}
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <div style={{ fontWeight: 700, marginBottom: '4px' }}>Treasury</div>
          {Object.keys(treasuryTotals).length === 0 ? (
            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>No movements yet.</div>
          ) : (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {Object.entries(treasuryTotals).map(([asset, amt]) => (
                <span
                  key={asset}
                  style={{
                    padding: '4px 8px',
                    border: '1px solid var(--color-primary-darkest)',
                    borderRadius: '6px',
                  }}
                >
                  {Number(amt).toFixed(3)} {asset}
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontWeight: 700 }}>
              Proposals ({base.proposals_members_only === false ? 'Public' : 'Members only'})
            </span>
            {detailCreate && (
              <button
                onClick={() => detailCreate(projectId)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'transparent',
                  color: 'var(--color-primary)',
                  // border: '1px solid var(--color-primary-darkest)',
                  padding: '6px 10px',
                  cursor: 'pointer',
                }}
              >
                <FontAwesomeIcon icon={faPlusCircle} />
                {/* <span>Create proposal</span> */}
              </button>
            )}
          </div>
          {proposals.length === 0 ? (
            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>No proposals yet.</div>
          ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {proposals.map((p) => (
              <div
                key={p.proposal_id}
                style={{
                  border: '1px solid var(--color-primary-darkest)',
                  borderRadius: '6px',
                  padding: '6px 8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span>{p.name || `Proposal #${p.proposal_id}`}</span>
                  <span style={{ color: 'var(--color-primary)' }}>
                    {p.result?.toUpperCase() || p.state || 'pending'}
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', opacity: 0.85 }}>
                  ID {p.proposal_id} · Ready at {p.ready_at ?? 'n/a'} · Creator {p.created_by || 'n/a'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


const DAO_DETAIL_QUERY = gql`
  query DaoDetail($projectId: numeric!) {
    project: okinoko_dao_project_overview(where: { project_id: { _eq: $projectId } }) {
      project_id
      name
      description
      created_by
      funds_asset
      proposal_cost
      stake_min_amount
      proposals_members_only
      voting_system
      threshold_percent
      quorum_percent
      proposal_duration_hours
      execution_delay_hours
      leave_cooldown_hours
      member
      active
    }
    proposals: okinoko_dao_proposal_overview(
      where: { project_id: { _eq: $projectId } }
      order_by: { proposal_id: desc }
    ) {
      proposal_id
      name
      state
      result
      ready_at
      created_by
      member
      member_active
    }
    treasury: okinoko_dao_treasury_movements(where: { project_id: { _eq: $projectId } }) {
      direction
      amount
      asset
    }
  }
`

export default function DaoUserLists({ user, isMobile, onCreateDao, onCreateProposal, setParams }) {
  const [daosCollapsed, setDaosCollapsed] = useState(false)
  const [collapsedDaos, setCollapsedDaos] = useState(new Set())
  const [joiningDaoId, setJoiningDaoId] = useState(null)
  const popup = useContext(PopupContext)
  const client = useClient()

  const daoContract = useMemo(
    () => contractsCfg.contracts.find((c) => c.vscId === DAO_VSC_ID),
    []
  )
  const joinFn = useMemo(
    () => daoContract?.functions?.find((f) => f.name === DAO_JOIN_FN),
    [daoContract]
  )

  const [{ data, fetching, error }] = useQuery({
    query: DAO_USER_QUERY,
    variables: { user: user || '' },
    requestPolicy: 'network-only',
  })

  const { handleSend, pending: joinPending } = useExecuteHandler({
    contract: daoContract,
    fn: joinFn,
    params: {},
  })

  const projects = data?.projects ?? []
  const memberships = data?.memberships ?? []
  const proposalsRaw = data?.daoProposals ?? []

  const proposalsByDao = useMemo(() => {
    const map = new Map()
    proposalsRaw.forEach((p) => {
      const pid = Number(p.project_id)
      const arr = map.get(pid) || []
      if (!arr.find((x) => x.proposal_id === p.proposal_id)) {
        arr.push(p)
      }
      map.set(pid, arr)
    })
    return map
  }, [proposalsRaw])

  const membershipMap = useMemo(() => {
    const map = new Map()
    memberships.forEach((m) => {
      if (m?.project_id == null) return
      map.set(m.project_id, m.active)
    })
    return map
  }, [memberships])

  const daos = useMemo(() => {
    const seen = new Set()
    const result = []
    projects.forEach((p) => {
      if (!(membershipMap.get(p.project_id) || p.created_by === user)) return
      if (seen.has(p.project_id)) return
      seen.add(p.project_id)
      result.push(p)
    })
    return result
  }, [projects, membershipMap, user])

  const joinableDaos = useMemo(() => {
    const seen = new Set()
    const result = []
    projects.forEach((p) => {
      if (membershipMap.get(p.project_id) || p.created_by === user) return
      if (seen.has(p.project_id)) return
      seen.add(p.project_id)
      result.push(p)
    })
    return result
  }, [projects, membershipMap, user])

  const proposals = useMemo(() => {
    const byId = new Map()
    proposalsRaw.forEach((p) => {
      const existing = byId.get(p.proposal_id) || p
      if (p.member === user) {
        if (!existing.member || p.member_active) {
          byId.set(p.proposal_id, p)
          return
        }
      }
      if (!byId.has(p.proposal_id)) byId.set(p.proposal_id, p)
    })
    return Array.from(byId.values())
  }, [proposalsRaw, user])

  const relationLabel = useMemo(() => (dao) => {
    if (membershipMap.get(dao.project_id)) return 'Member'
    if (dao.created_by === user) return 'Creator'
    return 'Viewer'
  }, [membershipMap, user])

  const renderHeader = (label, collapsed, setCollapsed, count, extra = null) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <h3
        className="cyber-tile"
        style={{
          maxWidth: '100%',
          minWidth: '100%',
          flex: '1 1 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          marginTop: '8px',
        }}
        onClick={() => setCollapsed((prev) => !prev)}
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setCollapsed((prev) => !prev)
          }
        }}
      >
        <span>
          {label}
          {typeof count === 'number' ? ` (${count})` : ''}
        </span>
        <span style={{ marginLeft: 'auto', paddingRight: '8px' }}>
          <FontAwesomeIcon
            icon={collapsed ? faChevronDown : faChevronUp}
            style={{ fontSize: '0.9rem' }}
          />
        </span>
      </h3>
      {extra}
    </div>
  )

  const renderEmptyState = (message) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: 'var(--color-primary-lighter)',
        fontSize: '0.9rem',
        padding: '8px 2px',
      }}
    >
      <FontAwesomeIcon icon={faCircleInfo} />
      <span>{message}</span>
    </div>
  )

const renderDaoList = () => {
  if (!user) return renderEmptyState('Log in to see your DAOs.')
  if (fetching) return renderEmptyState('Loading your DAOs…')
  if (error) return renderEmptyState('Could not load DAOs right now.')
  if (!daos.length) return renderEmptyState('No DAOs yet. Create one!')

  const toggleDao = (id) =>
    setCollapsedDaos((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const payoutSummary = (p, daoAsset) => {
    const payoutsStr = (p.payouts || '').trim()
    if (p.is_poll) return 'Poll'
    if (p.outcome_meta) return 'Meta'
    if (!payoutsStr) return 'No payouts'
    const asset = (daoAsset || 'HIVE').toUpperCase()
    const rows = []
    payoutsStr
      .split(';')
      .map((e) => e.trim())
      .filter(Boolean)
      .forEach((entry) => {
        const lastSep = entry.lastIndexOf(':')
        if (lastSep === -1) return
        const userPart = entry.slice(0, lastSep)
        const amtStr = entry.slice(lastSep + 1)
        const amt = parseFloat(amtStr)
        if (Number.isNaN(amt)) return
        rows.push(`${userPart}: ${amt.toFixed(3)} ${asset}`)
      })
    if (!rows.length) return 'No payouts'
    return rows.join(' • ')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {daos.map((dao) => {
        const collapsed = collapsedDaos.has(dao.project_id)
        const daoProposals = proposalsByDao.get(Number(dao.project_id)) || []
        return (
          <div
            key={`dao-block-${dao.project_id}`}
            style={{
              border: '1px solid var(--color-primary-darkest)',
              borderRadius: '8px',
              padding: '8px',
              background: 'rgba(0,0,0,0.3)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                gap: '10px',
              }}
              onClick={() => toggleDao(dao.project_id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FontAwesomeIcon
                  icon={collapsed ? faChevronDown : faChevronUp}
                  style={{ fontSize: '0.9rem' }}
                />
                <span style={{ fontWeight: 700 }}>
                  {dao.name || `DAO #${dao.project_id}`}
                </span>
                <span
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--color-primary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {relationLabel(dao)}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onCreateProposal?.(dao.project_id)
                  }}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--color-primary-darkest)',
                    color: 'var(--color-primary)',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  title="Create proposal"
                >
                  <FontAwesomeIcon icon={faPlusCircle} />
                </button>
                {/* <button
                  onClick={(e) => {
                    e.stopPropagation()
                    openJoinPopup()
                  }}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--color-primary-darkest)',
                    color: 'var(--color-primary)',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  title="Join DAO"
                >
                  <FontAwesomeIcon icon={faUserPlus} />
                </button> */}
              </div>
            </div>
            {!collapsed && (
              <div
                style={{
                  marginTop: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                {daoProposals.length === 0 ? (
                  <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                    No proposals yet.
                  </div>
                ) : (
                  daoProposals.map((p, idx) => (
                      <ListButton
                        key={`proposal-${dao.project_id}-${p.proposal_id}-${idx}`}
                        style={{
                          backgroundColor: 'rgba(0,0,0,0.35)',
                          color: 'var(--color-primary-lighter)',
                          textAlign: 'left',
                          padding: '0.65em 1em',
                          cursor: 'default',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          alignItems: 'flex-start',
                          minWidth: '220px',
                          width: 'auto',
                          minHeight: 'auto',
                          whiteSpace: 'normal',
                          height: 'auto',
                          overflow: 'visible',
                          textOverflow: 'unset',
                          alignItems: 'flex-start',
                        }}
                      >
                      <div
                        style={{
                          display: 'flex',
                          width: '100%',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span style={{ fontWeight: 700 }}>
                          {p.name || `Proposal #${p.proposal_id}`}
                        </span>
                        <span
                          style={{
                            fontSize: '0.8rem',
                            color: 'var(--color-primary)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}
                        >
                          {p.result?.toUpperCase() || p.state || 'pending'}
                        </span>
                      </div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.85, whiteSpace: 'normal' }}>
                          {(() => {
                            const summary = payoutSummary(p, dao.funds_asset)
                            if (summary === 'Poll') {
                              return <span style={{ color: 'var(--color-primary-lighter)' }}>Poll</span>
                            }
                            if (summary === 'Meta') {
                              const entries = (p.outcome_meta || '')
                                .split(';')
                                .map((e) => e.trim())
                                .filter(Boolean)
                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span style={{ color: 'var(--color-primary)' }}>Meta</span>
                                  {entries.length === 0 ? (
                                    <span style={{ color: 'var(--color-primary-lighter)' }}>No meta entries</span>
                                  ) : (
                                    entries.map((entry, i) => (
                                      <span
                                        key={`meta-${p.proposal_id}-${i}`}
                                        style={{ color: 'var(--color-primary-lighter)' }}
                                      >
                                        {entry}
                                      </span>
                                    ))
                                  )}
                                </div>
                              )
                            }
                            return (
                              <span style={{ color: 'var(--color-primary-lighter)' }}>
                                Payouts: {summary}
                              </span>
                            )
                          })()}
                        </div>
                      </ListButton>
                    ))
                  )}
                </div>
              )}
          </div>
        )
      })}
    </div>
  )
}

  const formatNumber = (val) => {
    const num = Number(val)
    if (!Number.isFinite(num)) return null
    return num.toFixed(3)
  }

  const handleJoinDao = useCallback(
    async (dao) => {
      if (!user) {
        popup?.openPopup?.({
          title: 'Login required',
          body: 'Please connect your account to join a DAO.',
        })
        return
      }
      if (!daoContract || !joinFn) {
        popup?.openPopup?.({
          title: 'DAO join unavailable',
          body: 'Missing DAO contract metadata.',
        })
        return
      }

      const amt = formatNumber(dao.stake_min_amount)
      if (!amt) {
        popup?.openPopup?.({
          title: 'Stake amount missing',
          body: 'This DAO does not expose a minimum stake. Please join manually.',
        })
        return
      }

      const asset = (dao.funds_asset || 'HIVE').toUpperCase()
      const overrideParams = {
        'Project Id': dao.project_id,
        'transfer.allow intent (membership stake)': {
          amount: amt,
          asset,
        },
      }

      setJoiningDaoId(dao.project_id)
      try {
        await handleSend(overrideParams)
      } finally {
        setJoiningDaoId(null)
      }
    },
    [user, daoContract, joinFn, popup, handleSend]
  )

  const openJoinPopup = () => {
    if (!user) {
      popup?.openPopup?.({
        title: 'Login required',
        body: 'Please connect your account to browse and join DAOs.',
      })
      return
    }
    popup?.openPopup?.({
      title: 'Join a DAO',
      body: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {joinableDaos.length === 0 && (
            <div style={{ color: 'var(--color-primary-lighter)' }}>
              No joinable DAOs available right now.
            </div>
          )}
          {joinableDaos.map((dao) => (
            <div
              key={`joinable-${dao.project_id}`}
              style={{
                border: '1px solid var(--color-primary-darkest)',
                padding: '10px',
                borderRadius: '8px',
                background: 'rgba(0,0,0,0.4)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontWeight: 700 }}>{dao.name || `DAO #${dao.project_id}`}</div>
                <div
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--color-primary)',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}
                >
                  #{dao.project_id}
                </div>
              </div>
              {dao.description && (
                <div style={{ fontSize: '0.85rem', opacity: 0.8, lineHeight: 1.3 }}>
                  {dao.description}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.85rem' }}>
                <div>Voting: {dao.voting_system === '1' ? 'Stake-weighted' : 'Democratic'}</div>
                <div>Stake min: {formatNumber(dao.stake_min_amount) ?? '?'} {dao.funds_asset || 'HIVE'}</div>
                <div>Proposal cost: {formatNumber(dao.proposal_cost) ?? '?'} {dao.funds_asset || 'HIVE'}</div>
                <div>Threshold: {dao.threshold_percent ?? '?'}%</div>
                <div>Quorum: {dao.quorum_percent ?? '?'}%</div>
                <div>Creator: {dao.created_by}</div>
              </div>
              <NeonButton
                disabled={joinPending || joiningDaoId === dao.project_id}
                onClick={() => handleJoinDao(dao)}
              >
                {joiningDaoId === dao.project_id ? 'Joining…' : 'Join DAO'}
              </NeonButton>
            </div>
          ))}
        </div>
      ),
    })
  }

  const openDaoDetail = useCallback(
    (projectId) => {
      popup?.openPopup?.({
        title: `DAO #${projectId}`,
        body: () => (
          <DaoDetail
            projectId={projectId}
            client={client}
            onCreateProposal={(pid) => {
              onCreateProposal?.(pid)
              popup?.closePopup?.()
            }}
          />
        ),
      })
    },
    [client, popup, onCreateProposal]
  )

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {renderHeader('Your DAOs', daosCollapsed, setDaosCollapsed, daos.length)}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => openJoinPopup()}
            style={{
              background: 'transparent',
              border: '1px solid var(--color-primary-darkest)',
              color: 'var(--color-primary)',
              padding: '4px 8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title="Join DAO"
          >
            <FontAwesomeIcon icon={faUserPlus} />
          </button>
          <button
            onClick={() => onCreateDao?.()}
            style={{
              background: 'transparent',
              border: '1px solid var(--color-primary-darkest)',
              color: 'var(--color-primary)',
              padding: '4px 8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title="Create DAO"
          >
            <FontAwesomeIcon icon={faPlusCircle} />
          </button>
        </div>
      </div>
      {!daosCollapsed && renderDaoList()}
    </div>
  )
}
