import { useMemo, useState, useContext, useCallback, useEffect } from 'preact/hooks'
import { useQuery, useClient } from '@urql/preact'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faChevronDown,
  faChevronUp,
  faCircleInfo,
  faPlusCircle,
  faUserPlus,
  faUserShield,
  faUserAstronaut,
  faPeopleGroup,
} from '@fortawesome/free-solid-svg-icons'
import NeonButton from '../buttons/NeonButton.jsx'
import contractsCfg from '../../data/contracts.json'
import useExecuteHandler from '../../lib/useExecuteHandler.js'
import { PopupContext } from '../../popup/context.js'
import ProposalDetailPopup from './ProposalDetailPopup.jsx'
import InfoIcon from '../common/InfoIcon.jsx'
import DaoDetail from './DaoDetail.jsx'
import DaoTile from './DaoTile.jsx'
import { DAO_VSC_ID, DAO_JOIN_FN, DAO_USER_QUERY } from './daoQueries.js'
import {
  sameUser,
  getDaoGroupCollapseFromCookie,
  getDaoFilterFromCookie,
  baseButtonStyle,
  parseOptions,
  isClosedProposal,
  formatNumber,
} from './daoHelpers.js'

export default function DaoUserLists({
  user,
  isMobile,
  onCreateDao,
  onCreateProposal,
  setParams,
  setFnName,
  setStep,
  setContractId,
  setBackOverride,
}) {
  const [joiningDaoId, setJoiningDaoId] = useState(null)
  const [groupCollapse, setGroupCollapse] = useState(getDaoGroupCollapseFromCookie)
  const [selectedDaoId, setSelectedDaoId] = useState(null)

  // Notify parent when we have an internal back action (viewing DAO detail)
  useEffect(() => {
    if (selectedDaoId !== null) {
      const clearSelection = () => setSelectedDaoId(null)
      setBackOverride?.(() => clearSelection)
    } else {
      setBackOverride?.(null)
    }
  }, [selectedDaoId, setBackOverride])

  // Save group collapse state to cookie
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.cookie = `daoGroupCollapse=${encodeURIComponent(JSON.stringify(groupCollapse))}; path=/; max-age=${60 * 60 * 24 * 30}`
  }, [groupCollapse])

  const toggleGroupCollapse = useCallback((groupKey) => {
    setGroupCollapse((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }))
  }, [])

  const [daoRelationFilter, setDaoRelationFilter] = useState(getDaoFilterFromCookie)

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
  const treasuryMovements = data?.treasury ?? []

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

  const treasuryByProject = useMemo(() => {
    const map = new Map()
    treasuryMovements.forEach((t) => {
      const pid = Number(t.project_id)
      if (!Number.isFinite(pid)) return
      const existing = map.get(pid) || {}
      const asset = (t.asset || '').toUpperCase()
      if (!existing[asset]) existing[asset] = 0
      const amt = Number(t.amount) || 0
      existing[asset] += t.direction === 'out' ? -amt : amt
      map.set(pid, existing)
    })
    return map
  }, [treasuryMovements])

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

  const renderEmptyState = (message) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: 'var(--color-primary-lighter)',
        fontSize: 'var(--font-size-base)',
        padding: '8px 2px',
      }}
    >
      <FontAwesomeIcon icon={faCircleInfo} style={{ fontSize: '0.9rem' }} />
      <span>{message}</span>
    </div>
  )

  const renderDaoList = () => {
    if (!user) return renderEmptyState('Log in to see your DAOs.')
    if (fetching) return renderEmptyState('Loading your DAOs…')
    if (error) return renderEmptyState('Could not load DAOs right now.')
    if (!daos.length) return renderEmptyState('No DAOs yet. Create one!')

    const filteredDaos = daos.filter(matchesRelationFilter)

    // Group DAOs by membership type
    const groupedDaos = {
      creator: filteredDaos.filter(dao => sameUser(dao.created_by, user)),
      member: filteredDaos.filter(dao => !sameUser(dao.created_by, user) && membershipMap.get(dao.project_id)),
      public: filteredDaos.filter(dao => !sameUser(dao.created_by, user) && !membershipMap.get(dao.project_id)),
    }

    const renderDaoTile = (dao) => {
      const daoProposals = proposalsByDao.get(Number(dao.project_id)) || []
      const memberCount = (membersByDao.get(dao.project_id) || []).filter(m => m.active).length
      const activeProposalCount = daoProposals.filter(p => !isClosedProposal(p)).length
      const treasury = treasuryByProject.get(Number(dao.project_id)) || {}
      const treasuryStr = Object.entries(treasury)
        .filter(([, amt]) => amt > 0)
        .map(([asset, amt]) => `${Number(amt).toFixed(3)} ${asset}`)
        .join(' · ') || null

      return (
        <DaoTile
          key={`dao-block-${dao.project_id}`}
          dao={dao}
          memberCount={memberCount}
          activeProposalCount={activeProposalCount}
          treasuryStr={treasuryStr}
          isMobile={isMobile}
          onClick={() => setSelectedDaoId(dao.project_id)}
        />
      )
    }

    const renderGroupSection = (title, daoList, icon, groupKey, hint = null) => {
      if (daoList.length === 0) return null
      const isCollapsed = groupCollapse[groupKey]

      return (
        <div key={title} style={{ marginBottom: '16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '10px',
              marginRight: '20px',
              paddingBottom: '6px',
              borderBottom: '1px solid var(--color-primary-darkest)',
              cursor: 'pointer',
            }}
            onClick={() => toggleGroupCollapse(groupKey)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                toggleGroupCollapse(groupKey)
              }
            }}
          >
            <FontAwesomeIcon icon={icon} style={{ color: 'var(--color-primary)', fontSize: '0.9rem' }} />
            <span style={{
              fontWeight: 700,
              fontSize: 'var(--font-size-base)',
              color: 'var(--color-primary-lighter)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              flex: 1,
            }}>
              {title} ({daoList.length})
            </span>
            {hint && (
              <span onClick={(e) => e.stopPropagation()}>
                <InfoIcon tooltip={hint} />
              </span>
            )}
            <FontAwesomeIcon
              icon={isCollapsed ? faChevronDown : faChevronUp}
              style={{ fontSize: '0.9rem', opacity: 0.7 }}
            />
          </div>
          {!isCollapsed && (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px',
              justifyContent: 'center',
              paddingRight: '12px',
            }}>
              {daoList.map(renderDaoTile)}
            </div>
          )}
        </div>
      )
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {renderGroupSection('Created by You', groupedDaos.creator, faUserShield, 'creator')}
        {renderGroupSection('Member', groupedDaos.member, faUserAstronaut, 'member')}
        {renderGroupSection('Public DAOs', groupedDaos.public, faPeopleGroup, 'public', 'You can create proposals in public DAOs but only members can vote on them.')}
        {filteredDaos.length === 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--color-primary-lighter)',
            fontSize: 'var(--font-size-base)',
            padding: '8px 2px',
          }}>
            <FontAwesomeIcon icon={faCircleInfo} style={{ fontSize: '0.9rem' }} />
            <span>No DAOs match the current filter.</span>
          </div>
        )}
      </div>
    )
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
                    fontSize: 'var(--font-size-base)',
                    color: 'var(--color-primary)',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}
                >
                  #{dao.project_id}
                </div>
              </div>
              {dao.description && (
                <div style={{ fontSize: 'var(--font-size-base)', opacity: 0.8, lineHeight: 1.3 }}>
                  {dao.description}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: 'var(--font-size-base)' }}>
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
                    return <div style={{ fontSize: 'var(--font-size-base)', opacity: 0.8 }}>No members listed yet.</div>
                  }
                  return (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: 'var(--font-size-base)' }}>
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
      }
      setStep?.(2)
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
            onVote={() => selectProposalAction('proposals_vote', proposal)}
            onTally={() => selectProposalAction('proposal_tally', proposal)}
            onExecute={() => selectProposalAction('proposal_execute', proposal)}
          />
        ),
      })
    },
    [membershipMap, popup, selectProposalAction, user]
  )

  // Render inline DAO detail view
  const renderDaoDetailView = () => {
    if (selectedDaoId === null) return null
    const daoRow = projects.find((p) => Number(p.project_id) === Number(selectedDaoId))
    const isMember =
      !!membershipMap.get(selectedDaoId) ||
      sameUser(daoRow?.created_by, user)
    const canJoin = !isMember && daoRow

    return (
      <DaoDetail
        projectId={selectedDaoId}
        client={client}
        isMember={isMember}
        joinPending={joiningDaoId === selectedDaoId}
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
        }}
        onProposalClick={(p) => openProposalDetail(p, { project_id: selectedDaoId })}
      />
    )
  }

  // Show detail view if a DAO is selected
  if (selectedDaoId !== null) {
    return renderDaoDetailView()
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          className="dao-header-cta"
          onClick={() => openJoinPopup()}
          style={baseButtonStyle(false)}
          title="Join a DAO"
        >
          <FontAwesomeIcon icon={faUserPlus} style={{ fontSize: '0.9rem' }} />
          <span>Join a DAO</span>
        </button>
        <button
          className="dao-header-cta"
          onClick={() => onCreateDao?.()}
          style={baseButtonStyle(false)}
          title="Create a new DAO"
        >
          <FontAwesomeIcon icon={faPlusCircle} style={{ fontSize: '0.9rem' }} />
          <span>Create a new DAO</span>
        </button>
      </div>
      {renderDaoList()}
    </div>
  )
}
