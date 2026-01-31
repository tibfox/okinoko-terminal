import { useMemo, useState, useContext, useCallback, useEffect, useRef } from 'preact/hooks'
import { useQuery, useClient } from '@urql/preact'
import { useAioha } from '@aioha/react-ui'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faChevronDown,
  faChevronUp,
  faCircleInfo,
  faLink,
  faPlusCircle,
  faRocket,
  faUserPlus,
  faUserShield,
  faUserAstronaut,
  faPeopleGroup,
} from '@fortawesome/free-solid-svg-icons'
import NeonButton from '../buttons/NeonButton.jsx'
import LoginModal from '../common/LoginModal.jsx'
import Avatar from '../common/Avatar.jsx'
import contractsCfg from '../../data/contracts'
import useExecuteHandler from '../../lib/useExecuteHandler.js'
import { PopupContext } from '../../popup/context.js'
import ContractDeployPopup from '../terminal/SubTerminals/ContractDeployPopup.jsx'
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
import { DEEP_LINK_TYPES, updateUrlToDeepLink, resetUrlFromDeepLink } from '../../hooks/useDeepLink.js'

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
  deepLink,
  clearDeepLink,
}) {
  const [joiningDaoId, setJoiningDaoId] = useState(null)
  const [groupCollapse, setGroupCollapse] = useState(getDaoGroupCollapseFromCookie)
  const [selectedDaoId, setSelectedDaoId] = useState(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const deepLinkHandledRef = useRef(false)
  const proposalDeepLinkHandledRef = useRef(false)

  // Wrapper to select a DAO and update the URL
  const selectDao = useCallback((projectId, { updateUrl = true } = {}) => {
    setSelectedDaoId(projectId)
    if (updateUrl && projectId !== null) {
      updateUrlToDeepLink(DEEP_LINK_TYPES.DAO, projectId)
    }
  }, [])

  // Wrapper to deselect DAO and reset URL
  const deselectDao = useCallback(() => {
    setSelectedDaoId(null)
    resetUrlFromDeepLink(1)
  }, [])

  // Notify parent when we have an internal back action (viewing DAO detail)
  useEffect(() => {
    if (selectedDaoId !== null) {
      setBackOverride?.(() => deselectDao)
    } else {
      setBackOverride?.(null)
    }
  }, [selectedDaoId, setBackOverride, deselectDao])

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
  const { aioha } = useAioha()

  const handleDeployDaoClick = useCallback(() => {
    if (!user) {
      popup?.openPopup?.({
        title: 'Login required',
        body: 'Please connect your account to deploy a DAO contract.',
      })
      return
    }
    const capturedAioha = aioha
    const capturedUser = user
    // Mutable state object that the popup can update to track processing state
    const deployState = { isProcessing: false }
    popup?.openPopup?.({
      title: 'Deploy DAO Contract',
      body: () => (
        <ContractDeployPopup
          onClose={() => popup?.closePopup?.()}
          aioha={capturedAioha}
          user={capturedUser}
          description="Deploy your own DAO smart contract to the VSC network. You can use a template or upload your custom WASM file."
          filterTag="dao"
          onProcessingChange={(processing) => { deployState.isProcessing = processing }}
        />
      ),
      width: '40vw',
      confirmClose: () => deployState.isProcessing
        ? 'Deployment is in progress. Are you sure you want to close?'
        : false,
    })
  }, [user, aioha, popup])

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
    requestPolicy: 'cache-first',
  })

  // Handle deep link - auto-select DAO when deep link is detected
  useEffect(() => {
    if (!deepLink || deepLink.type !== DEEP_LINK_TYPES.DAO) return
    if (deepLinkHandledRef.current) return
    if (fetching) return

    const daoId = Number(deepLink.id)
    if (!Number.isFinite(daoId)) {
      clearDeepLink?.(1)
      return
    }

    // Select the DAO without updating URL (it's already showing the deep link)
    deepLinkHandledRef.current = true
    selectDao(daoId, { updateUrl: false })
    clearDeepLink?.(1)
  }, [deepLink, fetching, selectDao, clearDeepLink])

  const { handleSend, pending: joinPending, loginRequired, clearPendingTransaction } = useExecuteHandler({
    contract: daoContract,
    fn: joinFn,
    params: {},
    disablePreview: true,
  })

  // Sync loginRequired with showLoginModal
  useEffect(() => {
    if (loginRequired) {
      setShowLoginModal(true)
    }
  }, [loginRequired])

  // Handle modal close - cleanup pending transaction
  const handleLoginModalClose = useCallback((val) => {
    setShowLoginModal(typeof val === 'boolean' ? val : false)
    if (!val) {
      clearPendingTransaction()
    }
  }, [clearPendingTransaction])

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
          onClick={() => selectDao(dao.project_id)}
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
      // User login check is handled by useExecuteHandler - it will show login modal if needed
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
    [daoContract, joinFn, popup, handleSend]
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
      title: 'Join DAO',
      width: '900px',
      body: () => (
        <div style={{
          display: 'grid',
          gridTemplateColumns: joinableDaos.length > 1 ? 'repeat(2, 1fr)' : '1fr',
          gap: '16px',
        }}>
            {joinableDaos.length === 0 && (
              <div style={{ color: 'var(--color-primary-lighter)', padding: '20px', textAlign: 'center', gridColumn: '1 / -1' }}>
                No joinable DAOs available right now.
              </div>
            )}
            {joinableDaos.map((dao) => {
              const members = [...(membersByDao.get(dao.project_id) || [])]
              if (dao.created_by) {
                const exists = members.some(
                  (m) => String(m.name || '').toLowerCase() === String(dao.created_by || '').toLowerCase()
                )
                if (!exists) {
                  members.push({ name: dao.created_by, active: true })
                }
              }
              const asset = (dao.funds_asset || 'HIVE').toUpperCase()
              const isStakeBased = dao.voting_system === '1'
              const treasury = treasuryByProject.get(dao.project_id) || {}
              const treasuryDisplay = Object.keys(treasury).length === 0
                ? 'Empty'
                : Object.entries(treasury)
                    .map(([a, amt]) => `${formatNumber(amt) ?? '0'} ${a}`)
                    .join(' · ')

              return (
                <div
                  key={`joinable-${dao.project_id}`}
                  style={{
                    border: '1px solid var(--color-primary-darkest)',
                    background: 'linear-gradient(135deg, rgba(246, 173, 85, 0.05) 0%, rgba(79, 209, 197, 0.05) 100%)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Header with Avatar */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '16px',
                      padding: '16px',
                      borderBottom: '1px solid var(--color-primary-darkest)',
                      background: 'rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    <Avatar username={dao.created_by} size={80} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <div style={{ fontWeight: 700, fontSize: 'var(--font-size-base)' }}>
                          {dao.name || `DAO #${dao.project_id}`}
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <div
                            style={{
                              fontSize: 'var(--font-size-label)',
                              color: 'var(--color-primary)',
                              letterSpacing: '0.05em',
                              textTransform: 'uppercase',
                            }}
                          >
                            #{dao.project_id}
                          </div>
                          {dao.url && (
                            <FontAwesomeIcon
                              icon={faLink}
                              style={{
                                fontSize: '0.85rem',
                                color: 'var(--color-primary)',
                                cursor: 'pointer',
                                opacity: 0.8,
                              }}
                              title="Open project URL"
                              onClick={() => {
                                try {
                                  window.open(dao.url, '_blank')
                                } catch {}
                              }}
                            />
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: 'var(--font-size-base)', opacity: 0.7, marginTop: '4px' }}>
                        by {dao.created_by || 'Unknown'}
                      </div>
                      {dao.description && (
                        <div style={{ fontSize: 'var(--font-size-base)', opacity: 0.85, marginTop: '8px', lineHeight: 1.4 }}>
                          {dao.description}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Properties Grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '1px',
                      background: 'var(--color-primary-darkest)',
                      margin: '0',
                      borderBottom: '1px solid var(--color-primary-darkest)',
                    }}
                  >
                    {(() => {
                      const activeMembers = members.filter(m => m.active).length
                      const daoProposals = proposalsByDao.get(Number(dao.project_id)) || []
                      const proposalCount = daoProposals.length
                      return [
                        { label: 'Members', value: activeMembers },
                        { label: 'Proposals', value: proposalCount },
                        { label: 'Voting', value: isStakeBased ? 'Stake-weighted' : 'Democratic' },
                        { label: 'Min Stake', value: `${formatNumber(dao.stake_min_amount) ?? '?'} ${asset}` },
                        { label: 'Proposal Cost', value: `${formatNumber(dao.proposal_cost) ?? '?'} ${asset}` },
                        { label: 'Treasury', value: treasuryDisplay },
                        { label: 'Threshold', value: `${dao.threshold_percent ?? '?'}%` },
                        { label: 'Quorum', value: `${dao.quorum_percent ?? '?'}%` },
                      ]
                    })().map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '10px 12px',
                          background: 'black',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                        }}
                      >
                        <div style={{ fontSize: 'var(--font-size-label)', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {item.label}
                        </div>
                        <div style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-primary-lighter)' }}>
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Join Button */}
                  <div style={{ padding: '12px 16px', background: 'rgba(0, 0, 0, 0.3)', display: 'flex', justifyContent: 'center' }}>
                    <NeonButton
                      disabled={joinPending || joiningDaoId === dao.project_id}
                      onClick={() => handleJoinDao(dao)}
                    >
                      {joiningDaoId === dao.project_id
                        ? 'Joining…'
                        : (() => {
                            const stakeMin = Number(dao.stake_min_amount) || 0
                            if (stakeMin > 0) {
                              return `Join DAO (${isStakeBased ? '≥' : ''}${stakeMin} ${asset})`
                            }
                            return 'Join DAO'
                          })()}
                    </NeonButton>
                  </div>
                </div>
              )
            })}
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

  // Handle proposal deep link - open proposal popup when deep link is detected
  useEffect(() => {
    if (!deepLink || deepLink.type !== DEEP_LINK_TYPES.PROPOSAL) return
    if (proposalDeepLinkHandledRef.current) return

    const proposalId = Number(deepLink.id)
    if (!Number.isFinite(proposalId)) {
      clearDeepLink?.(1)
      return
    }

    // Open proposal popup - ProposalDetailPopup will fetch the full data
    proposalDeepLinkHandledRef.current = true
    openProposalDetail({ proposal_id: proposalId }, null)
    clearDeepLink?.(1)
  }, [deepLink, openProposalDetail, clearDeepLink])

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
        onCreateProposal={(pid, daoSettings) => {
          onCreateProposal?.(pid, daoSettings || daoRow)
        }}
        onProposalClick={(p) => openProposalDetail(p, daoRow)}
      />
    )
  }

  // Login modal for join DAO
  const loginModal = (
    <LoginModal
      showModal={showLoginModal}
      setShowModal={handleLoginModalClose}
    />
  )

  // Show detail view if a DAO is selected
  if (selectedDaoId !== null) {
    return (
      <>
        {loginModal}
        {renderDaoDetailView()}
      </>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      {loginModal}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          className="dao-header-cta"
          onClick={() => openJoinPopup()}
          style={baseButtonStyle(false)}
          title="Join DAO"
        >
          <FontAwesomeIcon icon={faUserPlus} style={{ fontSize: '0.9rem' }} />
          <span>Join DAO</span>
        </button>
        <button
          className="dao-header-cta"
          onClick={() => onCreateDao?.()}
          style={baseButtonStyle(false)}
          title="Create DAO"
        >
          <FontAwesomeIcon icon={faPlusCircle} style={{ fontSize: '0.9rem' }} />
          <span>Create DAO</span>
        </button>
        <button
          className="dao-header-cta"
          onClick={handleDeployDaoClick}
          style={baseButtonStyle(false)}
          title="Deploy your own DAO contract"
        >
          <FontAwesomeIcon icon={faRocket} style={{ fontSize: '0.9rem' }} />
          <span>Deploy Own DAO</span>
        </button>
      </div>
      {renderDaoList()}
    </div>
  )
}
