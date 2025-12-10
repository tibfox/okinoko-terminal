import { useMemo, useState, useContext, useCallback, useEffect, useRef } from 'preact/hooks'
import { gql, useQuery, useClient } from '@urql/preact'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faChevronDown,
  faChevronUp,
  faCircleInfo,
  faPlusCircle,
  faUserPlus,
  faPause,
  faUserShield,
  faUserAstronaut,
  faBars,
  faFilter,
  faChevronLeft,
} from '@fortawesome/free-solid-svg-icons'
import ListButton from '../buttons/ListButton.jsx'
import NeonButton from '../buttons/NeonButton.jsx'
import contractsCfg from '../../data/contracts.json'
import useExecuteHandler from '../../lib/useExecuteHandler.js'
import { PopupContext } from '../../popup/context.js'
import ProposalDetailPopup from './ProposalDetailPopup.jsx'
import ThresholdCircle from './ThresholdCircle.jsx'
import PollPie from './PollPie.jsx'
import { faLink } from '@fortawesome/free-solid-svg-icons'

const sameUser = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase()


const DAO_VSC_ID = 'vsc1Ba9AyyUcMnYVoDVsjoJztnPFHNxQwWBPsb'
const DAO_JOIN_FN = 'project_join'
const PIE_COLORS = ['#4fd1c5', '#ed64a6', '#63b3ed', '#f6ad55', '#9f7aea', '#68d391', '#f56565']
const ALLOWED_DAO_FILTERS = ['all', 'created', 'member', 'viewer']
const baseButtonStyle = (active = false) => ({
  backgroundColor: active ? 'var(--color-primary-darker)' : 'transparent',
  color: active ? 'black' : 'var(--color-primary-lighter)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  fontSize: '0.85rem',
  padding: '0.5em 1em',
  cursor: 'pointer',
  border: '1px solid var(--color-primary-darkest)',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  textAlign: 'left',
  whiteSpace: 'nowrap',
})

const DAO_USER_QUERY = gql`
  query DaoUserLists($user: String!) {
    projects: okinoko_dao_project_created_events(order_by: { project_id: asc }) {
      project_id
      name
      description
      created_by
      funds_asset
      url
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
    allMembers: okinoko_dao_membership_latest {
      project_id
      member
      active
    }
    daoProposals: okinoko_dao_proposal_overview(order_by: { proposal_id: desc }) {
      proposal_id
      project_id
      name
      description
      metadata
      options
      payouts
      outcome_meta
      duration_hours
      state
      result
      ready_at
      ready_block
      state_block
      created_by
      member
      member_active
      is_poll
      active_members
      members
    }
    daoVotes: okinoko_dao_votes_view {
      proposal_id
      voter
      weight
      choices
    }
    stakeBalances: okinoko_dao_stake_balances {
      project_id
      account
      stake_amount
      asset
    }
  }`

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

  const DaoDetail = ({ projectId, client, onCreateProposal: detailCreate, onProposalClick, isMember, onJoin, joinPending, isMobile }) => {
    const [{ data: detailData, fetching: detailFetching, error: detailError }] = useQuery({
      query: DAO_DETAIL_QUERY,
      variables: { projectId },
      requestPolicy: 'network-only',
    })
    const detailContentRef = useRef(null)
    const [detailHeight, setDetailHeight] = useState(null)

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
    const daoUrl = base.url

    const treasuryTotals = treasury.reduce((acc, t) => {
      const key = (t.asset || '').toUpperCase()
      if (!acc[key]) acc[key] = 0
      const amt = Number(t.amount) || 0
      acc[key] += t.direction === 'out' ? -amt : amt
      return acc
    }, {})
    const [detailTab, setDetailTab] = useState('details')

    useEffect(() => {
      if (!detailContentRef.current) return
      const measure = () => {
        const h = detailContentRef.current.offsetHeight
        if (h && h !== detailHeight) setDetailHeight(h)
      }
      measure()
      const id = requestAnimationFrame(measure)
      return () => cancelAnimationFrame(id)
    }, [detailData, detailTab, detailHeight])

    const headerLayoutStyle = isMobile
      ? { display: 'flex', flexDirection: 'column', gap: '12px' }
      : { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', alignItems: 'center' }
    const popupButtonStyle = {
      backgroundColor: 'transparent',
      color: 'var(--color-primary-lighter)',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      fontSize: '0.85rem',
      padding: '0.5em 1em',
      cursor: 'pointer',
      border: '1px solid var(--color-primary-darkest)',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      textAlign: 'left',
      whiteSpace: 'nowrap',
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '260px', position: 'relative' }}>
        <div style={headerLayoutStyle}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{base.name || `DAO #${projectId}`}</div>
            <div style={{ fontSize: '0.9rem', lineHeight: 1.4, opacity: 0.9, marginBottom: '6px' }}>by {base.created_by || 'n/a'}</div>
            <div style={{ fontSize: '0.9rem', lineHeight: 1.4, opacity: 0.9 }}>{base.description}</div>
            {daoUrl ? (
              <div style={{ marginTop: '8px' }}>
                <NeonButton
                  onClick={() => {
                    try {
                      window.open(daoUrl, '_blank')
                    } catch {}
                  }}
                  style={popupButtonStyle}
                >
                  <FontAwesomeIcon icon={faLink} />
                  <span>Open DAO URL</span>
                </NeonButton>
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
            <ProposalAvatar creator={base.created_by} />
            <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
              {base.created_by || 'Unknown owner'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => setDetailTab('details')} style={baseButtonStyle(detailTab === 'details')}>
            Details
          </button>
          <button onClick={() => setDetailTab('proposals')} style={baseButtonStyle(detailTab === 'proposals')}>
            Proposals
          </button>
        </div>

        <div style={{ position: 'relative', minHeight: detailHeight ? `${detailHeight}px` : undefined }}>
          <div
            ref={detailContentRef}
            style={{
              display: detailTab === 'details' ? 'block' : 'none',
              width: '100%',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <tbody>
                <tr>
                  <td style={{ paddingRight: '12px', paddingBottom: '6px', opacity: 0.85, whiteSpace: 'nowrap', width: '1%' }}>Voting</td>
                  <td style={{ paddingBottom: '6px', color: 'var(--color-primary-lighter)' }}>
                    {base.voting_system === '1' ? 'Stake-weighted' : 'Democratic'}
                  </td>
                </tr>
                <tr>
                  <td style={{ paddingRight: '12px', paddingBottom: '6px', opacity: 0.85, whiteSpace: 'nowrap', width: '1%' }}>Minimum Stake / Fee</td>
                  <td style={{ paddingBottom: '6px', color: 'var(--color-primary-lighter)' }}>
                    {base.stake_min_amount ?? '?'} {(base.funds_asset || 'HIVE').toUpperCase()}
                  </td>
                </tr>
                <tr>
                  <td style={{ paddingRight: '12px', paddingBottom: '6px', opacity: 0.85, whiteSpace: 'nowrap', width: '1%' }}>Proposal Cost</td>
                  <td style={{ paddingBottom: '6px', color: 'var(--color-primary-lighter)' }}>
                    {base.proposal_cost ?? '?'} {(base.funds_asset || 'HIVE').toUpperCase()}
                  </td>
                </tr>
                <tr>
                  <td style={{ paddingRight: '12px', paddingBottom: '6px', opacity: 0.85, whiteSpace: 'nowrap', width: '1%' }}>Threshold</td>
                  <td style={{ paddingBottom: '6px', color: 'var(--color-primary-lighter)' }}>
                    {base.threshold_percent ?? '?'}%
                  </td>
                </tr>
                <tr>
                  <td style={{ paddingRight: '12px', paddingBottom: '6px', opacity: 0.85, whiteSpace: 'nowrap', width: '1%' }}>Quorum</td>
                  <td style={{ paddingBottom: '6px', color: 'var(--color-primary-lighter)' }}>
                    {base.quorum_percent ?? '?'}%
                  </td>
                </tr>
                <tr>
                  <td style={{ paddingRight: '12px', paddingBottom: '6px', opacity: 0.85, whiteSpace: 'nowrap', width: '1%' }}>Treasury</td>
                  <td style={{ paddingBottom: '6px', color: 'var(--color-primary-lighter)' }}>
                    {Object.keys(treasuryTotals).length === 0
                      ? 'No movements yet.'
                      : Object.entries(treasuryTotals)
                          .map(([asset, amt]) => `${Number(amt).toFixed(3)} ${asset}`)
                          .join(' · ')}
                  </td>
                </tr>
              </tbody>
            </table>

            <div>
              <div style={{ fontWeight: 700, marginBottom: '4px' }}>
                Members ({members.length})
              </div>
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
                       
                        opacity: m.active ? 1 : 0.6,
                      }}
                    >
                      {m.name} {m.active ? '' : '(former)'}
                    </span>
                  ))}
                </div>
              )}
              {!isMember && onJoin ? (
                <div style={{ marginTop: '8px' }}>
                  <NeonButton disabled={joinPending} onClick={() => onJoin(base)} style={baseButtonStyle(false)}>
                    {joinPending ? 'Joining…' : 'Join DAO'}
                  </NeonButton>
                </div>
              ) : null}
              
            </div>

          </div>

          {detailTab === 'proposals' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontWeight: 700 }}>
                  Proposals ({base.proposals_members_only === false ? 'Public' : 'Members only'})
                </span>
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
                     
                      padding: '6px 8px',
                      cursor: onProposalClick ? 'pointer' : 'default',
                    }}
                    onClick={() => onProposalClick?.(p)}
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
      url
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
      url
    }
    treasury: okinoko_dao_treasury_movements(where: { project_id: { _eq: $projectId } }) {
      direction
      amount
      asset
    }
  }
`

export default function DaoUserLists({
  user,
  isMobile,
  onCreateDao,
  onCreateProposal,
  setParams,
  setFnName,
  setStep,
  setContractId,
}) {
  const [daosCollapsed, setDaosCollapsed] = useState(false)
  const [collapsedDaos, setCollapsedDaos] = useState(new Set())
  const [joiningDaoId, setJoiningDaoId] = useState(null)
  const [daoStateTabs, setDaoStateTabs] = useState({}) // per dao: 'active' | 'closed'
  const [daoTypeTabs, setDaoTypeTabs] = useState({}) // per dao: 'payout_meta' | 'polls'
  const getDaoFilterFromCookie = () => {
    if (typeof document === 'undefined') return 'all'
    const match = (document.cookie || '')
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith('daoRelationFilter='))
    if (!match) return 'all'
    const val = decodeURIComponent(match.split('=')[1] || '')
    return ALLOWED_DAO_FILTERS.includes(val) ? val : 'all'
  }

  const [daoRelationFilter, setDaoRelationFilter] = useState(getDaoFilterFromCookie) // 'all' | 'created' | 'member' | 'viewer'
  const [showFilters, setShowFilters] = useState(false)
  const [showProposalFilters, setShowProposalFilters] = useState({})
  const [ownerMenuOpen, setOwnerMenuOpen] = useState(null)

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.cookie = `daoRelationFilter=${encodeURIComponent(daoRelationFilter)}; path=/; max-age=${60 * 60 * 24 * 30}`
  }, [daoRelationFilter])
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
    disablePreview: true,
  })

  const projects = data?.projects ?? []
  const memberships = data?.memberships ?? []
  const allMembers = data?.allMembers ?? []
  const proposalsRaw = data?.daoProposals ?? []
  const daoVotes = data?.daoVotes ?? []
  const stakeBalances = data?.stakeBalances ?? []

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

  const membersByDao = useMemo(() => {
    const map = new Map()
    allMembers.forEach((m) => {
      const pid = Number(m.project_id)
      if (!Number.isFinite(pid)) return
      const arr = map.get(pid) || []
      arr.push({ name: m.member, active: m.active })
      map.set(pid, arr)
    })
    return map
  }, [allMembers])

  const daos = useMemo(() => {
    const seen = new Set()
    const result = []
    projects.forEach((p) => {
      const isMember = membershipMap.get(p.project_id)
      const isCreator = p.created_by === user
      const isPublic = p.proposals_members_only === false
      if (!(isMember || isCreator || isPublic)) return
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

  const votesByProposal = useMemo(() => {
    const map = new Map()
    daoVotes.forEach((v) => {
      if (!v) return
      const pid = Number(v.proposal_id)
      if (!Number.isFinite(pid)) return
      const arr = map.get(pid) || []
      arr.push(v)
      map.set(pid, arr)
    })
    return map
  }, [daoVotes])

  const totalVoteWeightByProposal = useMemo(() => {
    const map = new Map()
    votesByProposal.forEach((arr, pid) => {
      const total = arr.reduce((sum, v) => sum + (Number(v.weight) || 0), 0)
      map.set(pid, total)
    })
    return map
  }, [votesByProposal])

  const userVotedProposals = useMemo(() => {
    const set = new Set()
    const normalizedUser = (user || '').toLowerCase()
    daoVotes.forEach((v) => {
      if (!v?.voter) return
      if ((v.voter || '').toLowerCase() === normalizedUser) {
        const pid = Number(v.proposal_id)
        if (Number.isFinite(pid)) set.add(pid)
      }
    })
    return set
  }, [daoVotes, user])

  const totalStakeByProject = useMemo(() => {
    const map = new Map()
    stakeBalances.forEach((row) => {
      const pid = Number(row.project_id)
      if (!Number.isFinite(pid)) return
      const amt = Number(row.stake_amount) || 0
      map.set(pid, (map.get(pid) || 0) + amt)
    })
    return map
  }, [stakeBalances])

  const parseOptions = (str) =>
    (str || '')
      .split(';')
      .map((o) => o.trim())
      .filter(Boolean)

  const relationLabel = useMemo(() => (dao) => {
    if (membershipMap.get(dao.project_id)) return 'Member'
    if (dao.created_by === user) return 'Creator'
    return 'Viewer'
  }, [membershipMap, user])

  const matchesRelationFilter = useCallback(
    (dao) => {
      const isCreator = sameUser(dao.created_by, user)
      const isMember = membershipMap.get(dao.project_id)
      if (daoRelationFilter === 'created') return isCreator
      if (daoRelationFilter === 'member') return isMember || isCreator
      if (daoRelationFilter === 'viewer') return !isCreator && !isMember
      return true
    },
    [daoRelationFilter, membershipMap, user]
  )

  const isClosedProposal = (p) => {
    const state = (p.state || '').toLowerCase()
    return Boolean(p.result) || state === 'closed' || state === 'executed' || state === 'completed' || state === 'ready' || state === 'failed'
  }

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
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            paddingTop: '4px',
            paddingBottom: '4px',
            flex: '1 1 0',
            minWidth: 0,
          }}
        >
          {label}
          {/* {typeof count === 'number' ? ` (${count})` : ''} */}
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
    <div className="dao-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px', position: 'relative', zIndex: 2, flexWrap: 'wrap' }}>
        <button
          onClick={() => setShowFilters((prev) => !prev)}
          style={baseButtonStyle(showFilters)}
          title="Toggle filters"
        >
          <FontAwesomeIcon icon={showFilters ? faChevronLeft : faFilter} />
        </button>
        {showFilters && (
          <>
            {[
              { key: 'all', label: 'All' },
              { key: 'created', label: 'Created' },
              { key: 'member', label: 'Member' },
              { key: 'viewer', label: 'Public' },
            ].map((tab) => (
            <button
              key={`rel-${tab.key}`}
              onClick={() => setDaoRelationFilter(tab.key)}
              style={baseButtonStyle(daoRelationFilter === tab.key)}
            >
              {tab.label}
            </button>
          ))}
          </>
        )}
      </div>
      {daos.filter(matchesRelationFilter).map((dao) => {
        const collapsed = collapsedDaos.has(dao.project_id)
        const daoProposals = proposalsByDao.get(Number(dao.project_id)) || []
        const totalStake = totalStakeByProject.get(Number(dao.project_id)) || 0
        const stateTab = daoStateTabs[dao.project_id] || 'active'
        const typeTab = daoTypeTabs[dao.project_id] || 'all'
        const filteredProposals = daoProposals.filter((p) => {
          const closed = isClosedProposal(p)
          if (stateTab === 'active' && closed) return false
          if (stateTab === 'closed' && !closed) return false
          if (typeTab === 'polls' && !p.is_poll) return false
          if (typeTab === 'payout_meta' && p.is_poll) return false
          return true
        })
        return (
          <div
            key={`dao-block-${dao.project_id}`}
            style={{
              border: '1px solid var(--color-primary-darkest)',
              
              padding: '8px',
              background: 'rgba(0, 0, 0, 0.35)',
              position: 'relative',
              zIndex: 1,
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
                <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {dao.name || `DAO #${dao.project_id}`}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      openDaoDetail(dao.project_id)
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--color-primary)',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="DAO info"
                  >
                    <FontAwesomeIcon icon={faCircleInfo} />
                  </button>
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
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', position: 'relative' }}>
                {String(dao.created_by || '').toLowerCase() === String(user || '').toLowerCase() && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setOwnerMenuOpen((prev) => (prev === dao.project_id ? null : dao.project_id))
                    }}
                    style={baseButtonStyle(ownerMenuOpen === dao.project_id)}
                    title="Owner actions"
                  >
                    <FontAwesomeIcon icon={faBars} />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onCreateProposal?.(dao.project_id)
                  }}
                  style={baseButtonStyle(false)}
                  title="Create proposal"
                >
                  <FontAwesomeIcon icon={faPlusCircle} />
                  {!isMobile && <span>Proposal</span>}
                </button>
                {ownerMenuOpen === dao.project_id && (
                  <div
                    className="owner-menu"
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      right: 0,
                      background: 'rgba(0,0,0,0.85)',
                      border: '1px solid var(--color-primary-darkest)',
                      
                      padding: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      zIndex: 5,
                      minWidth: '160px',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="neon-btn"
                    onClick={() => {
                      handleOwnerAction(dao, 'project_pause')
                      setOwnerMenuOpen(null)
                    }}
                    style={{ ...baseButtonStyle(false), width: '100%', justifyContent: 'space-between' }}
                  >
                    <FontAwesomeIcon icon={faPause} />
                    <span>Pause / Unpause</span>
                  </button>
                  <button
                    onClick={() => {
                      handleOwnerAction(dao, 'project_transfer')
                      setOwnerMenuOpen(null)
                    }}
                    style={{ ...baseButtonStyle(false), width: '100%', justifyContent: 'space-between' }}
                  >
                    <FontAwesomeIcon icon={faUserShield} />
                    <span>Change owner</span>
                  </button>
                  </div>
                )}
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
                  <>
                    {(() => {
                      const showProposalFilterRow = showProposalFilters[dao.project_id] || false
                      return (
                        <>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '6px', alignItems: 'center', position: 'relative', zIndex: 2 }}>
                            <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowProposalFilters((prev) => ({
                              ...prev,
                              [dao.project_id]: !showProposalFilterRow,
                            }))
                          }}
                          style={baseButtonStyle(showProposalFilterRow)}
                          title="Toggle proposal filters"
                        >
                          <FontAwesomeIcon icon={showProposalFilterRow ? faChevronLeft : faFilter} />
                        </button>
                            {showProposalFilterRow && (
                              <>
                                {['active', 'closed'].map((tab) => (
                                <button
                                  key={`state-${dao.project_id}-${tab}`}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setDaoStateTabs((prev) => ({ ...prev, [dao.project_id]: tab }))
                                  }}
                                  style={baseButtonStyle(stateTab === tab)}
                                >
                                  {tab === 'active' ? 'Active' : 'Closed'}
                                </button>
                              ))}
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginLeft: 'auto' }}>
                                {['all', 'payout_meta', 'polls'].map((tab) => (
                                  <button
                                    key={`type-${dao.project_id}-${tab}`}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setDaoTypeTabs((prev) => ({ ...prev, [dao.project_id]: tab }))
                                    }}
                                    style={baseButtonStyle(typeTab === tab)}
                                  >
                                    {tab === 'payout_meta' ? 'Payout/Meta' : tab === 'polls' ? 'Polls' : 'All'}
                                  </button>
                                ))}
                                </div>
                              </>
                            )}
                          </div>
                        </>
                      )
                    })()}
                    {filteredProposals.length === 0 ? (
                      <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                        No proposals in this filter.
                      </div>
                    ) : (
                  filteredProposals.map((p, idx) => (
                      <ListButton
                        key={`proposal-${dao.project_id}-${p.proposal_id}-${idx}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          openProposalDetail(p, dao)
                        }}
                        style={{
                          backgroundColor: 'rgba(0,0,0,0.35)',
                          color: 'var(--color-primary-lighter)',
                          textAlign: 'left',
                          padding: '0.65em 1em',
                          cursor: 'pointer',
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
                          {userVotedProposals.has(Number(p.proposal_id)) ? (
                            <span style={{ marginLeft: '8px', fontSize: '0.8rem', color: 'var(--color-primary)' }}>
                              • Voted
                            </span>
                          ) : null}
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
                            const hasMetaUpdate = (p.metadata || '').trim()

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

                            // Only show payouts if they exist
                            const hasPayouts = summary !== 'No payouts'

                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {hasPayouts && (
                                  <span style={{ color: 'var(--color-primary-lighter)' }}>
                                    Payouts: {summary}
                                  </span>
                                )}
                                {hasMetaUpdate && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <span style={{ color: 'var(--color-primary)' }}>Meta Update:</span>
                                    {hasMetaUpdate.split(';').map((e) => e.trim()).filter(Boolean).map((entry, i) => (
                                      <span
                                        key={`metaupdate-${p.proposal_id}-${i}`}
                                        style={{ color: 'var(--color-primary-lighter)' }}
                                      >
                                        {entry}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                      })()}
                      </div>
                      {(() => {
                        const pid = Number(p.proposal_id)
                        const votes = votesByProposal.get(pid) || []
                        const voteTotal = dao.voting_system === '1'
                          ? totalVoteWeightByProposal.get(pid) || 0
                          : votes.length
                        // For voting pool: use active_members if available, otherwise fall back to all members
                        const memberSet = new Set(
                          (p.active_members || p.members || [])
                            .map((m) => (m || '').toLowerCase())
                            .filter(Boolean),
                        )
                        // Fallback: if we have no member list from the proposal, include actual voters
                        if (memberSet.size === 0) {
                          votes.forEach((v) => {
                            if (v?.voter) memberSet.add(String(v.voter).toLowerCase())
                          })
                        }
                        const memberCount = memberSet.size
                        const totalPool = dao.voting_system === '1' ? totalStake : memberCount
                        const opts = parseOptions(p.options).map((label, idx) => {
                          const optVotes = votes.reduce((sum, v) => {
                            const choices = String(v.choices || '')
                              .split(/[;,]/)
                              .map((c) => parseInt(c.trim(), 10))
                              .filter((n) => Number.isFinite(n))
                            if (choices.includes(idx)) {
                              return sum + (dao.voting_system === '1' ? (Number(v.weight) || 0) : 1)
                            }
                            return sum
                          }, 0)
                          const percent = totalPool > 0 ? (optVotes / totalPool) * 100 : 0
                          return { label, percent }
                        })
                        return p.is_poll ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '100%' }}>
                            <PollPie parts={opts} size={120} />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem', alignItems: 'flex-start' }}>
                              {opts.map((o, i) => (
                                <div key={`opt-${pid}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length] }} />
                                  <span style={{ color: 'var(--color-primary-lighter)' }}>
                                    {o.label}: {o.percent.toFixed(1)}%
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
                            <ThresholdCircle
                              label="Threshold"
                              value={voteTotal}
                              total={totalPool}
                              targetPercent={dao.threshold_percent}
                            />
                            <ThresholdCircle
                              label="Quorum"
                              value={voteTotal}
                              total={totalPool}
                              targetPercent={dao.quorum_percent}
                            />
                          </div>
                        )
                      })()}
                    </ListButton>
                  ))
                )}
                  </>
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
              <div style={{ marginTop: '6px' }}>
                <div style={{ fontWeight: 700, marginBottom: '4px' }}>Members</div>
                {(() => {
                  const members = [...(membersByDao.get(dao.project_id) || [])]
                  if (dao.created_by) {
                    const exists = members.some(
                      (m) => String(m.name || '').toLowerCase() === String(dao.created_by || '').toLowerCase()
                    )
                    if (!exists) {
                      members.push({ name: dao.created_by, active: true })
                    }
                  }
                  if (!members.length) {
                    return <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>No members listed yet.</div>
                  }
                  return (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '0.85rem' }}>
                      {members.map((m) => (
                        <span
                          key={`${dao.project_id}-${m.name}`}
                          style={{
                            padding: '4px 8px',
                            border: '1px solid var(--color-primary-darkest)',
                           
                            opacity: m.active ? 1 : 0.6,
                          }}
                        >
                          {m.name} {m.active ? '' : '(former)'}
                        </span>
                      ))}
                    </div>
                  )
                })()}
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

  const selectProposalAction = useCallback(
    (fnName, proposal) => {
      const proposalId = typeof proposal === 'object' ? proposal?.proposal_id : proposal
      const proposalOptions = typeof proposal === 'object' ? parseOptions(proposal?.options) : []
      console.log('[Proposal] navigate start', {
        fnName,
        proposalId,
        hasFnName: Boolean(setFnName),
        hasStep: Boolean(setStep),
        hasParams: Boolean(setParams),
        hasContractId: Boolean(setContractId),
      })
      popup?.closePopup?.()
      setContractId?.(DAO_VSC_ID)
      setFnName?.(fnName)
      if (setParams) {
        setParams((prev) => ({
          ...prev,
          'Proposal Id': proposalId,
          proposalId,
          proposalIsPoll: typeof proposal === 'object' ? proposal?.is_poll ?? null : null,
          proposalOptions,
        }))
      } else {
        console.warn('[Proposal] setParams missing; skipping param prefill')
      }
      setStep?.(2)
      console.log('[Proposal] navigate done', { fnName, proposalId })
    },
    [setContractId, setFnName, setParams, setStep, popup]
  )

  const openProposalDetail = useCallback(
    (proposal, dao) => {
      if (!proposal) return
      const projectId = dao?.project_id ?? proposal.project_id
      const isMember =
        !!membershipMap.get(projectId) ||
        sameUser(dao?.created_by, user)
      popup?.openPopup?.({
        title: `Proposal #${proposal.proposal_id}`,
        body: () => (
          <ProposalDetailPopup
            proposal={proposal}
            isMember={isMember}
            onVote={() => {
              console.log('[Proposal] vote clicked', proposal.proposal_id)
              selectProposalAction('proposals_vote', proposal)
            }}
            onTally={() => {
              console.log('[Proposal] tally clicked', proposal.proposal_id)
              selectProposalAction('proposal_tally', proposal)
            }}
            onExecute={() => {
              console.log('[Proposal] execute clicked', proposal.proposal_id)
              selectProposalAction('proposal_execute', proposal)
            }}
          />
        ),
      })
    },
    [membershipMap, popup, selectProposalAction, user]
  )

  const openDaoDetail = useCallback(
    (projectId) => {
      const daoRow = projects.find((p) => Number(p.project_id) === Number(projectId))
      const isMember =
        !!membershipMap.get(projectId) ||
        sameUser(daoRow?.created_by, user)
      const canJoin = !isMember && daoRow
      popup?.openPopup?.({
        title: `DAO #${projectId}`,
        body: () => (
          <DaoDetail
            projectId={projectId}
            client={client}
            isMember={isMember}
            joinPending={joiningDaoId === projectId}
            isMobile={isMobile}
            onJoin={
              canJoin
                ? (base) => {
                    handleJoinDao(base || daoRow)
                  }
                : null
            }
            onCreateProposal={(pid) => {
              onCreateProposal?.(pid)
              popup?.closePopup?.()
            }}
            onProposalClick={(p) => openProposalDetail(p, { project_id: projectId })}
          />
        ),
      })
    },
    [client, popup, onCreateProposal, openProposalDetail, projects, membershipMap, user, handleJoinDao, joiningDaoId]
  )

  const handleOwnerAction = (dao, fnName) => {
    if (!setFnName || !setStep || !setParams || !setContractId) return
    setContractId(DAO_VSC_ID)
    setFnName(fnName)
    setParams((prev) => ({
      ...prev,
      'Project Id': dao.project_id,
      projectId: dao.project_id,
    }))
    setStep(2)
  }


  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {!isMobile && renderHeader('DAOs & Proposals', daosCollapsed, setDaosCollapsed, daos.length)}
      <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
        <button
          className="dao-header-cta"
          onClick={() => openJoinPopup()}
          style={baseButtonStyle(false)}
          title="Join DAO"
        >
          <FontAwesomeIcon icon={faUserPlus} />
          <span>Join DAO</span>
        </button>
        <button
          className="dao-header-cta"
          onClick={() => onCreateDao?.()}
          style={baseButtonStyle(false)}
          title="Create DAO"
        >
          <FontAwesomeIcon icon={faPlusCircle} />
          <span>New DAO</span>
        </button>
        </div>
      </div>
      {(!isMobile && !daosCollapsed) || isMobile ? renderDaoList() : null}
    </div>
  )
}
