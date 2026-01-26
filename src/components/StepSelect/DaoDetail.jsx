import { useState, useEffect, useRef, useContext, useMemo, useCallback } from 'preact/hooks'
import { useQuery } from '@urql/preact'
import { gql } from '@urql/preact'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLink, faChevronDown, faChevronUp, faPlus } from '@fortawesome/free-solid-svg-icons'
import NeonButton from '../buttons/NeonButton.jsx'
import Avatar from '../common/Avatar.jsx'
import NeonSwitch from '../common/NeonSwitch.jsx'
import AssetAmountInput from '../common/AssetAmountInput.jsx'
import CopyUrlButton from '../common/CopyUrlButton.jsx'
import { isClosedProposal } from './daoHelpers.js'
import { PopupContext } from '../../popup/context.js'
import contractsCfg from '../../data/contracts'
import useExecuteHandler from '../../lib/useExecuteHandler.js'
import { DAO_VSC_ID } from './daoQueries.js'
import { DEEP_LINK_TYPES } from '../../hooks/useDeepLink.js'

// Cookie helpers for collapse state persistence
const COOKIE_NAME = 'daoDetailCollapse'
const DEFAULT_COLLAPSE_STATE = {
  header: false,
  treasury: false,
  properties: true,
  members: true,
}

function getCollapseStateFromCookie() {
  if (typeof document === 'undefined') return DEFAULT_COLLAPSE_STATE
  const match = (document.cookie || '')
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAME}=`))
  if (!match) return DEFAULT_COLLAPSE_STATE
  try {
    return { ...DEFAULT_COLLAPSE_STATE, ...JSON.parse(decodeURIComponent(match.split('=')[1] || '{}')) }
  } catch {
    return DEFAULT_COLLAPSE_STATE
  }
}

function setCollapseStateToCookie(state) {
  if (typeof document === 'undefined') return
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString()
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(state))}; expires=${expires}; path=/`
}

// Hook to measure container width using ResizeObserver
function useContainerWidth(ref, breakpoint = 500) {
  const [isNarrow, setIsNarrow] = useState(false)

  useEffect(() => {
    if (!ref.current) return

    // Set initial state immediately
    const initialWidth = ref.current.getBoundingClientRect().width
    setIsNarrow(initialWidth < breakpoint)

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setIsNarrow(entry.contentRect.width < breakpoint)
      }
    })

    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [ref, breakpoint])

  return isNarrow
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

// Add Funds Popup Component
function AddFundsPopup({ projectId, fundsAsset, votingSystem, onClose, onSend, balances = {} }) {
  const [amount, setAmount] = useState('')
  const [asset, setAsset] = useState((fundsAsset || 'HIVE').toUpperCase())
  const [toStake, setToStake] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)

  const isDemocratic = votingSystem !== '1'

  const currentBalance = useMemo(() => {
    if (asset === 'HIVE') return balances.hive || 0
    if (asset === 'hbd_savings') return balances.hbd_savings || 0
    return balances.hbd || 0
  }, [asset, balances])

  const isValidAmount = useMemo(() => {
    if (!amount) return false
    const num = parseFloat(amount)
    return !isNaN(num) && num > 0 && num <= currentBalance
  }, [amount, currentBalance])

  const handleSubmit = async () => {
    if (!isValidAmount || isProcessing || !onSend) return
    setIsProcessing(true)
    try {
      // Build the params for the transaction
      const params = {
        'Project Id': projectId,
        'Add To Stake? (true/false)': isDemocratic ? false : toStake,
        'Deposit amount / asset': { amount, asset },
      }
      const success = await onSend(params)
      if (success) {
        onClose?.()
      }
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '8px' }}>
      <AssetAmountInput
        label="Amount"
        amount={amount}
        onAmountChange={setAmount}
        asset={asset}
        onAssetChange={setAsset}
        balances={balances}
      />

      {!isDemocratic && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 0',
          marginBottom: '60px',
        }}>
          <span style={{
            color: 'var(--color-primary-lighter)',
            fontSize: 'var(--font-size-base)',
            opacity: toStake ? 0.5 : 1,
          }}>
            Treasury
          </span>
          <NeonSwitch
            checked={toStake}
            onChange={setToStake}
            beep={false}
          />
          <span style={{
            color: 'var(--color-primary-lighter)',
            fontSize: 'var(--font-size-base)',
            opacity: toStake ? 1 : 0.5,
          }}>
            Stake
          </span>
        </div>
      )}

      {isDemocratic && (
        <div style={{
          fontSize: 'var(--font-size-base)',
          color: 'var(--color-primary-darker)',
          fontStyle: 'italic',
          marginBottom: '60px',
        }}>
          Democratic DAOs can only add funds to the treasury.
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!isValidAmount || isProcessing}
        style={{
          border: '1px solid var(--color-primary-darkest)',
          background: isValidAmount && !isProcessing ? 'var(--color-primary-darkest)' : 'transparent',
          color: isValidAmount && !isProcessing ? 'var(--color-primary)' : 'var(--color-primary-darker)',
          padding: '0.75rem 1rem',
          cursor: isValidAmount && !isProcessing ? 'pointer' : 'not-allowed',
          fontSize: 'var(--font-size-base)',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          fontFamily: 'var(--font-family-base)',
          transition: 'all 0.2s ease',
          opacity: isValidAmount && !isProcessing ? 1 : 0.4,
        }}
      >
        {isProcessing ? 'Processing...' : 'Send'}
      </button>
    </div>
  )
}

export default function DaoDetail({
  projectId,
  client,
  onCreateProposal,
  onProposalClick,
  isMember,
  onJoin,
  joinPending,
  isMobile: isMobileProp,
}) {
  const containerRef = useRef(null)
  const isContainerNarrow = useContainerWidth(containerRef, 500)
  // Use container width for responsiveness, fallback to prop
  const isNarrow = isContainerNarrow || isMobileProp
  const [collapseState, setCollapseState] = useState(() => getCollapseStateFromCookie())
  const [proposalFilter, setProposalFilter] = useState('active') // 'active' or 'closed'
  const popup = useContext(PopupContext)

  // Setup for project_funds transaction
  const daoContract = useMemo(
    () => contractsCfg.contracts.find((c) => c.vscId === DAO_VSC_ID),
    []
  )
  const projectFundsFn = useMemo(
    () => daoContract?.functions?.find((f) => f.name === 'project_funds'),
    [daoContract]
  )

  const { handleSend: executeProjectFunds, balances } = useExecuteHandler({
    contract: daoContract,
    fn: projectFundsFn,
    params: {},
    disablePreview: true,
  })

  // Helper to toggle collapse state and persist to cookie
  const toggleCollapse = (key) => {
    setCollapseState((prev) => {
      const newState = { ...prev, [key]: !prev[key] }
      setCollapseStateToCookie(newState)
      return newState
    })
  }

  // Function to open add funds popup
  const openAddFundsPopup = useCallback((dao) => {
    popup?.openPopup?.({
      title: 'Add Funds / Stake',
      width: '520px',
      body: () => (
        <AddFundsPopup
          projectId={dao.project_id ?? projectId}
          fundsAsset={dao.funds_asset}
          votingSystem={dao.voting_system}
          onClose={() => popup?.closePopup?.()}
          onSend={(params) => executeProjectFunds(params)}
          balances={balances}
        />
      ),
    })
  }, [popup, projectId, executeProjectFunds, balances])

  const [{ data: detailData, fetching: detailFetching, error: detailError }] = useQuery({
    query: DAO_DETAIL_QUERY,
    variables: { projectId },
    requestPolicy: 'cache-first',
  })

  if (detailFetching) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

  const headerLayoutStyle = isNarrow
    ? { display: 'flex', flexDirection: 'row', gap: '12px', alignItems: 'flex-start' }
    : { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', alignItems: 'center' }

  const popupButtonStyle = {
    backgroundColor: 'transparent',
    color: 'var(--color-primary-lighter)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontSize: 'var(--font-size-base)',
    padding: '0.5em 1em',
    cursor: 'pointer',
    border: '1px solid var(--color-primary-darkest)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    textAlign: 'left',
    whiteSpace: 'nowrap',
    marginTop: 0,
  }

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '260px', position: 'relative' }}>
      {/* Header Container */}
      <div
        style={{
          padding: isNarrow ? '12px' : '16px',
          background: 'linear-gradient(135deg, rgba(246, 173, 85, 0.1) 0%, rgba(79, 209, 197, 0.1) 100%)',
          border: '1px solid var(--color-primary-darkest)',
        }}
      >
        <div
          onClick={() => toggleCollapse('header')}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            cursor: 'pointer',
            marginBottom: collapseState.header ? 0 : '10px',
            userSelect: 'none',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 'var(--font-size-base)' }}>
              {base.name || `DAO #${projectId}`}
            </div>
            {base.description && (
              <div style={{ fontSize: 'var(--font-size-base)', opacity: 0.8, marginTop: '4px', lineHeight: 1.4 }}>
                {base.description}
              </div>
            )}
          </div>
          <FontAwesomeIcon
            icon={collapseState.header ? faChevronDown : faChevronUp}
            style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '4px' }}
          />
        </div>
        {!collapseState.header && (
          <div style={headerLayoutStyle}>
            {isNarrow ? (
              <>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 'var(--font-size-base)', lineHeight: 1.4, opacity: 0.9 }}>by {base.created_by || 'n/a'}</div>
                  <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {daoUrl && (
                      <NeonButton
                        onClick={(e) => {
                          e.stopPropagation()
                          try {
                            window.open(daoUrl, '_blank')
                          } catch {}
                        }}
                        style={popupButtonStyle}
                      >
                        <FontAwesomeIcon icon={faLink} style={{ fontSize: '0.9rem' }} />
                        <span>Open DAO URL</span>
                      </NeonButton>
                    )}
                    {!isMember && onJoin && (
                      <NeonButton disabled={joinPending} onClick={(e) => { e.stopPropagation(); onJoin(base) }} style={popupButtonStyle}>
                        {joinPending ? 'Joining…' : (() => {
                          const stakeMin = Number(base.stake_min_amount) || 0
                          const asset = (base.funds_asset || 'HIVE').toUpperCase()
                          const isStakeBased = base.voting_system === '1'
                          if (stakeMin > 0) {
                            return `Join DAO (${isStakeBased ? '≥' : ''}${stakeMin} ${asset})`
                          }
                          return 'Join DAO'
                        })()}
                      </NeonButton>
                    )}
                    {onCreateProposal && (isMember || base.proposals_members_only === false) && (
                      <NeonButton
                        onClick={(e) => {
                          e.stopPropagation()
                          onCreateProposal(projectId, base)
                        }}
                        style={popupButtonStyle}
                      >
                        <FontAwesomeIcon icon={faPlus} style={{ fontSize: '0.9rem' }} />
                        <span>Create Proposal</span>
                      </NeonButton>
                    )}
                    <CopyUrlButton
                      type={DEEP_LINK_TYPES.DAO}
                      id={projectId}
                      iconOnly
                      style={popupButtonStyle}
                    />
                  </div>
                </div>
                <div style={{ flexShrink: 0, textAlign: 'center' }}>
                  <Avatar username={base.created_by} size={70} />
                </div>
              </>
            ) : (
              <>
                <div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {daoUrl && (
                      <NeonButton
                        onClick={(e) => {
                          e.stopPropagation()
                          try {
                            window.open(daoUrl, '_blank')
                          } catch {}
                        }}
                        style={popupButtonStyle}
                      >
                        <FontAwesomeIcon icon={faLink} style={{ fontSize: '0.9rem' }} />
                        <span>Open DAO URL</span>
                      </NeonButton>
                    )}
                    {!isMember && onJoin && (
                      <NeonButton disabled={joinPending} onClick={(e) => { e.stopPropagation(); onJoin(base) }} style={popupButtonStyle}>
                        {joinPending ? 'Joining…' : (() => {
                          const stakeMin = Number(base.stake_min_amount) || 0
                          const asset = (base.funds_asset || 'HIVE').toUpperCase()
                          const isStakeBased = base.voting_system === '1'
                          if (stakeMin > 0) {
                            return `Join DAO (${isStakeBased ? '≥' : ''}${stakeMin} ${asset})`
                          }
                          return 'Join DAO'
                        })()}
                      </NeonButton>
                    )}
                    {onCreateProposal && (isMember || base.proposals_members_only === false) && (
                      <NeonButton
                        onClick={(e) => {
                          e.stopPropagation()
                          onCreateProposal(projectId, base)
                        }}
                        style={popupButtonStyle}
                      >
                        <FontAwesomeIcon icon={faPlus} style={{ fontSize: '0.9rem' }} />
                        <span>Create Proposal</span>
                      </NeonButton>
                    )}
                    <CopyUrlButton
                      type={DEEP_LINK_TYPES.DAO}
                      id={projectId}
                      iconOnly
                      style={popupButtonStyle}
                    />
                  </div>
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
                  <Avatar username={base.created_by} size={140} />
                  <div style={{ fontSize: 'var(--font-size-base)', opacity: 0.9 }}>
                    {base.created_by || 'Unknown owner'}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Treasury Container */}
      <div
        style={{
          padding: '12px',
          background: 'rgba(0, 0, 0, 0.2)',
          border: '1px solid var(--color-primary-darkest)',
        }}
      >
        <div
          onClick={() => toggleCollapse('treasury')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            marginBottom: collapseState.treasury ? 0 : '10px',
            userSelect: 'none',
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 'var(--font-size-base)' }}>Treasury</span>
          <FontAwesomeIcon
            icon={collapseState.treasury ? faChevronDown : faChevronUp}
            style={{ fontSize: '0.8rem', opacity: 0.8 }}
          />
        </div>
        {!collapseState.treasury && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-primary-lighter)' }}>
              {Object.keys(treasuryTotals).length === 0
                ? 'No treasury movements yet.'
                : Object.entries(treasuryTotals)
                    .map(([asset, amt]) => `${Number(amt).toFixed(3)} ${asset}`)
                    .join(' · ')}
            </div>
            {isMember && (
              <NeonButton
                onClick={(e) => {
                  e.stopPropagation()
                  openAddFundsPopup(base)
                }}
                style={popupButtonStyle}
              >
                <FontAwesomeIcon icon={faPlus} style={{ fontSize: '0.9rem' }} />
                <span>Add Funds / Stake</span>
              </NeonButton>
            )}
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: isNarrow ? 'column' : 'row',
          gap: isNarrow ? '16px' : '24px',
          padding: '16px 0',
          background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.15) 100%)',
        }}
      >
        <div
          style={{
            flex: isNarrow ? 'none' : 1,
            width: isNarrow ? '100%' : 'auto',
            minWidth: 0,
            padding: '12px',
            background: 'rgba(0, 0, 0, 0.2)',
            border: '1px solid var(--color-primary-darkest)',
          }}
        >
          {isNarrow && (
            <div
              onClick={() => toggleCollapse('properties')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                marginBottom: collapseState.properties ? 0 : '10px',
                userSelect: 'none',
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 'var(--font-size-base)' }}>DAO Properties</span>
              <FontAwesomeIcon
                icon={collapseState.properties ? faChevronDown : faChevronUp}
                style={{ fontSize: '0.8rem', opacity: 0.8 }}
              />
            </div>
          )}
          {(!isNarrow || !collapseState.properties) && (
            <>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: 'var(--font-size-base)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ opacity: 0.85 }}>Voting</span>
                  <span style={{ color: 'var(--color-primary-lighter)' }}>
                    {base.voting_system === '1' ? 'Stake-weighted' : 'Democratic'}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ opacity: 0.85 }}>Minimum Stake / Fee</span>
                  <span style={{ color: 'var(--color-primary-lighter)' }}>
                    {base.stake_min_amount ?? '?'} {(base.funds_asset || 'HIVE').toUpperCase()}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ opacity: 0.85 }}>Proposal Cost</span>
                  <span style={{ color: 'var(--color-primary-lighter)' }}>
                    {base.proposal_cost ?? '?'} {(base.funds_asset || 'HIVE').toUpperCase()}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ opacity: 0.85 }}>Threshold</span>
                  <span style={{ color: 'var(--color-primary-lighter)' }}>
                    {base.threshold_percent ?? '?'}%
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ opacity: 0.85 }}>Quorum</span>
                  <span style={{ color: 'var(--color-primary-lighter)' }}>
                    {base.quorum_percent ?? '?'}%
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        <div
          style={{
            flex: isNarrow ? 'none' : 1,
            minWidth: 0,
            padding: '12px',
            background: 'rgba(0, 0, 0, 0.2)',
            border: '1px solid var(--color-primary-darkest)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontWeight: 700 }}>
                Proposals ({base.proposals_members_only === false ? 'Public' : 'Members only'})
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => setProposalFilter('active')}
                  style={{
                    background: proposalFilter === 'active' ? 'var(--color-primary-darker)' : 'transparent',
                    color: proposalFilter === 'active' ? 'black' : 'var(--color-primary-lighter)',
                    border: '1px solid var(--color-primary-darkest)',
                    padding: '4px 8px',
                    fontSize: 'var(--font-size-base)',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                  }}
                >
                  Active
                </button>
                <button
                  onClick={() => setProposalFilter('closed')}
                  style={{
                    background: proposalFilter === 'closed' ? 'var(--color-primary-darker)' : 'transparent',
                    color: proposalFilter === 'closed' ? 'black' : 'var(--color-primary-lighter)',
                    border: '1px solid var(--color-primary-darkest)',
                    padding: '4px 8px',
                    fontSize: 'var(--font-size-base)',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                  }}
                >
                  Closed
                </button>
              </div>
            </div>
            {(() => {
              const filteredProposals = proposals.filter((p) =>
                proposalFilter === 'active' ? !isClosedProposal(p) : isClosedProposal(p)
              )
              if (proposals.length === 0) {
                return <div style={{ fontSize: 'var(--font-size-base)', opacity: 0.8 }}>No proposals yet.</div>
              }
              if (filteredProposals.length === 0) {
                return (
                  <div style={{ fontSize: 'var(--font-size-base)', opacity: 0.8 }}>
                    No {proposalFilter} proposals.
                  </div>
                )
              }
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {filteredProposals.map((p) => (
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
                      <div style={{ fontSize: 'var(--font-size-base)', opacity: 0.85 }}>
                        ID {p.proposal_id} · Ready at {p.ready_at ?? 'n/a'} · Creator {p.created_by || 'n/a'}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        </div>
      </div>

      {/* Members Container */}
      <div
        style={{
          padding: '12px',
          background: 'rgba(0, 0, 0, 0.2)',
          border: '1px solid var(--color-primary-darkest)',
        }}
      >
        <div
          onClick={() => toggleCollapse('members')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            marginBottom: collapseState.members ? 0 : '10px',
            userSelect: 'none',
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 'var(--font-size-base)' }}>
            Members ({members.length})
          </span>
          <FontAwesomeIcon
            icon={collapseState.members ? faChevronDown : faChevronUp}
            style={{ fontSize: '0.8rem', opacity: 0.8 }}
          />
        </div>
        {!collapseState.members && (
          members.length === 0 ? (
            <div style={{ fontSize: 'var(--font-size-base)', opacity: 0.8 }}>No members listed.</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: 'var(--font-size-base)' }}>
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
          )
        )}
      </div>
    </div>
  )
}
