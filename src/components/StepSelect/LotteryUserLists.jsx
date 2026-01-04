import { useMemo, useState, useContext, useCallback, useEffect } from 'preact/hooks'
import { gql, useQuery } from '@urql/preact'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faChevronLeft,
  faChevronDown,
  faChevronUp,
  faCircleInfo,
  faFilter,
  faArrowUpRightFromSquare,
  faPlusCircle,
  faPen,
  faTicket,
  faTrophy,
  faUserShield,
  faTicketAlt,
  faGlobe,
  faStar,
} from '@fortawesome/free-solid-svg-icons'
import ListButton from '../buttons/ListButton.jsx'
import contractsCfg from '../../data/contracts.json'
import { PopupContext } from '../../popup/context.js'
import LotteryDetailPopup from './LotteryDetailPopup.jsx'
import PollPie from './PollPie.jsx'
import GamblingInfoIcon from '../common/GamblingInfoIcon.jsx'

const LOTTERY_VSC_ID = 'vsc1BiM4NC1yeGPCjmq8FC3utX8dByizjcCBk7'
const PIE_COLORS = ['#4fd1c5', '#ed64a6', '#63b3ed', '#f6ad55', '#9f7aea', '#68d391', '#f56565']

const baseButtonStyle = (active = false) => ({
  backgroundColor: active ? 'var(--color-primary-darker)' : 'transparent',
  color: active ? 'black' : 'var(--color-primary-lighter)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  fontStyle: 'normal',
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

const LOTTERY_USER_QUERY = gql`
  query LotteryUserLists($user: String!) {
    metadata: oki_lottery_v2_current_metadata {
      id
      metadata
    }
    activeLotteries: oki_lottery_v2_current_state(
      where: { is_executed: { _eq: false } }
      order_by: { deadline: asc }
    ) {
      id
      name
      creator
      ticket_price
      asset
      burn_percent
      donation_account
      donation_percent
      deadline
      total_tickets_sold
      unique_participants
      created_at
      winner_count
      winner_shares
      is_executed
      winners
      winner_amounts
    }
    closedLotteries: oki_lottery_v2_current_state(
      where: { is_executed: { _eq: true } }
      order_by: { deadline: desc }
    ) {
      id
      name
      creator
      ticket_price
      asset
      burn_percent
      donation_account
      donation_percent
      deadline
      total_tickets_sold
      unique_participants
      created_at
      winner_count
      winner_shares
      is_executed
      winners
      winner_amounts
    }
    userParticipations: oki_lottery_v2_participant_summary(
      where: { participant: { _eq: $user } }
      order_by: { indexer_block_height: desc }
    ) {
      lottery_id
      lottery_name
      tickets
      paid
      asset
      is_winner
      win_amount
      indexer_ts
    }
  }
`

const useCountdown = (unixTimestamp) => {
  const [countdown, setCountdown] = useState('')

  useEffect(() => {
    const updateCountdown = () => {
      const date = new Date(unixTimestamp * 1000)
      const now = Date.now()
      const diff = date.getTime() - now

      if (diff < 0) {
        setCountdown('Expired')
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      if (days > 0) {
        setCountdown(`${days}d ${hours}h ${minutes}m`)
      } else if (hours > 0) {
        setCountdown(`${hours}h ${minutes}m ${seconds}s`)
      } else if (minutes > 0) {
        setCountdown(`${minutes}m ${seconds}s`)
      } else {
        setCountdown(`${seconds}s`)
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [unixTimestamp])

  return countdown
}

const formatAsset = (asset) => {
  return (asset || 'HIVE').toUpperCase()
}

const parseLotteryMeta = (raw) => {
  const parts = String(raw || '').split('###')
  return {
    lotteryPostUrl: parts[0] || '',
    donationPostUrl: parts[1] || '',
    additionalDescription: parts.slice(2).join('###') || '',
  }
}

// Cookie helpers for lottery group collapse state
const getLotteryGroupCollapseFromCookie = () => {
  if (typeof document === 'undefined') return { spotlight: false, creator: false, joined: false, other: false }
  const match = (document.cookie || '')
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('lotteryGroupCollapse='))
  if (!match) return { spotlight: false, creator: false, joined: false, other: false }
  try {
    return JSON.parse(decodeURIComponent(match.split('=')[1] || '{}'))
  } catch {
    return { spotlight: false, creator: false, joined: false, other: false }
  }
}

// Helper to check if a lottery qualifies for spotlight
const isSpotlightLottery = (lottery, hasJoined) => {
  if (hasJoined) return false

  const now = Date.now()
  const deadlineMs = lottery.deadline * 1000
  const createdAtMs = lottery.created_at * 1000
  const totalDuration = deadlineMs - createdAtMs
  const timeRemaining = deadlineMs - now
  const timeElapsed = now - createdAtMs

  // Max 7 days in ms
  const maxDays = 7 * 24 * 60 * 60 * 1000

  // New lottery: less than 20% of time elapsed (80% remaining), but max 7 days since creation
  const isNew = timeElapsed <= Math.min(totalDuration * 0.2, maxDays)

  // Ending soon: less than 10% of time remaining, but max 7 days remaining
  const isEndingSoon = timeRemaining > 0 && timeRemaining <= Math.min(totalDuration * 0.1, maxDays)

  return isNew || isEndingSoon
}

export default function LotteryUserLists({
  user,
  isMobile,
  onCreateLottery,
  setParams,
  setFnName,
  setStep,
  setContractId,
}) {
  const [lotteriesCollapsed, setLotteriesCollapsed] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [lotteryStatusFilter, setLotteryStatusFilter] = useState('active')
  const [expandedLotteryIds, setExpandedLotteryIds] = useState(new Set())
  const [groupCollapse, setGroupCollapse] = useState(getLotteryGroupCollapseFromCookie)
  const popup = useContext(PopupContext)

  // Save group collapse state to cookie
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.cookie = `lotteryGroupCollapse=${encodeURIComponent(JSON.stringify(groupCollapse))}; path=/; max-age=${60 * 60 * 24 * 30}`
  }, [groupCollapse])

  const toggleGroupCollapse = useCallback((groupKey) => {
    setGroupCollapse((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }))
  }, [])

  const toggleLotteryExpand = useCallback((lotteryId) => {
    setExpandedLotteryIds((prev) => {
      const next = new Set(prev)
      if (next.has(lotteryId)) {
        next.delete(lotteryId)
      } else {
        next.add(lotteryId)
      }
      return next
    })
  }, [])

  const normalizedUser = (user || '').replace(/^hive:/i, '').toLowerCase()
  const hiveUser = normalizedUser ? `hive:${normalizedUser}` : ''

  const [{ data, fetching, error }] = useQuery({
    query: LOTTERY_USER_QUERY,
    variables: { user: hiveUser },
    requestPolicy: 'network-only',
  })

  const activeLotteries = data?.activeLotteries ?? []
  const closedLotteries = data?.closedLotteries ?? []
  const userParticipations = data?.userParticipations ?? []
  const metadataByLotteryId = useMemo(() => {
    const map = new Map()
    ;(data?.metadata ?? []).forEach((entry) => {
      if (entry?.id === undefined || entry?.id === null) return
      map.set(Number(entry.id), entry?.metadata ?? '')
    })
    return map
  }, [data?.metadata])

  const activeLotteriesWithMetadata = useMemo(
    () =>
      activeLotteries.map((lottery) => ({
        ...lottery,
        metadata: metadataByLotteryId.get(Number(lottery.id)) || '',
      })),
    [activeLotteries, metadataByLotteryId]
  )

  const closedLotteriesWithMetadata = useMemo(
    () =>
      closedLotteries.map((lottery) => ({
        ...lottery,
        metadata: metadataByLotteryId.get(Number(lottery.id)) || '',
      })),
    [closedLotteries, metadataByLotteryId]
  )

  const userTicketsByLottery = useMemo(() => {
    const map = new Map()
    userParticipations.forEach((p) => {
      const existing = map.get(p.lottery_id) || 0
      map.set(p.lottery_id, existing + (p.tickets || 0))
    })
    return map
  }, [userParticipations])

  const isDeadlinePassed = (deadline) => {
    return deadline * 1000 < Date.now()
  }

  const openLotteryDetail = useCallback(
    (lottery) => {
      if (!lottery) return
      popup?.openPopup?.({
        title: `Lottery #${lottery.id}`,
        body: () => (
          <LotteryDetailPopup
            lottery={lottery}
            userTickets={userTicketsByLottery.get(lottery.id) || 0}
            onBuyTickets={() => {
              popup?.closePopup?.()
              setContractId?.(LOTTERY_VSC_ID)
              setFnName?.('join_lottery')
              setParams?.((prev) => ({
                ...prev,
                Lottery: lottery.id,
                lotteryId: lottery.id,
              }))
              setStep?.(2)
            }}
            onExecute={() => {
              popup?.closePopup?.()
              setContractId?.(LOTTERY_VSC_ID)
              setFnName?.('execute_lottery')
              setParams?.((prev) => ({
                ...prev,
                'Lottery ID': lottery.id,
                lotteryId: lottery.id,
              }))
              setStep?.(2)
            }}
            canExecute={!lottery.is_executed && isDeadlinePassed(lottery.deadline)}
          />
        ),
      })
    },
    [popup, userTicketsByLottery, setContractId, setFnName, setParams, setStep]
  )

  const handleBuyTickets = useCallback(
    (lotteryId) => {
      setContractId?.(LOTTERY_VSC_ID)
      setFnName?.('join_lottery')
      setParams?.((prev) => ({
        ...prev,
        Lottery: lotteryId,
        lotteryId: lotteryId,
      }))
      setStep?.(2)
    },
    [setContractId, setFnName, setParams, setStep]
  )

  const handleExecuteLottery = useCallback(
    (lotteryId) => {
      setContractId?.(LOTTERY_VSC_ID)
      setFnName?.('execute_lottery')
      setParams?.((prev) => ({
        ...prev,
        'Lottery ID': lotteryId,
        lotteryId: lotteryId,
      }))
      setStep?.(2)
    },
    [setContractId, setFnName, setParams, setStep]
  )

  const handleEditMetadata = useCallback(
    (lottery) => {
      if (!lottery) return
      setContractId?.(LOTTERY_VSC_ID)
      setFnName?.('change_lottery_metadata')
      setParams?.((prev) => ({
        ...prev,
        'Lottery ID': lottery.id,
        lotteryId: lottery.id,
        Metdata: lottery.metadata || '',
        metadata: lottery.metadata || '',
      }))
      setStep?.(2)
    },
    [setContractId, setFnName, setParams, setStep]
  )

  const renderHeader = (label, collapsed, setCollapsed) => (
   
    <h3
      className="cyber-tile"
      style={{
        maxWidth: '50%',
        minWidth: '50%',
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
      </span>
      <span style={{ marginLeft: 'auto', paddingRight: '8px' }}>
        <FontAwesomeIcon
          icon={collapsed ? faChevronDown : faChevronUp}
          style={{ fontSize: '0.9rem' }}
        />
      </span>
    </h3>
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

  const LotteryItem = ({ lottery, isExpanded, onToggleExpand }) => {
    const userTickets = userTicketsByLottery.get(lottery.id) || 0
    const deadlinePassed = isDeadlinePassed(lottery.deadline)
    const countdown = useCountdown(lottery.deadline)
    const isClosed = Boolean(lottery.is_executed)
    const totalTickets = lottery.total_tickets_sold || 0
    const burnPercent = Number(lottery.burn_percent) || 0
    const donationPercent =
      lottery.donation_account && lottery.donation_percent > 0 ? Number(lottery.donation_percent) || 0 : 0
    const totalPot = (Number(lottery.ticket_price) || 0) * (Number(lottery.total_tickets_sold) || 0)
    const burnAmount = totalPot * (burnPercent / 100)
    const donationAmount = totalPot * (donationPercent / 100)
    const prizePoolAmount = Math.max(0, totalPot - burnAmount - donationAmount)
    const sharePercents = (lottery.winner_shares || '')
      .split(/[;,]/)
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0)
    const winners = Array.isArray(lottery.winners) ? lottery.winners : []
    const winnerAmounts = Array.isArray(lottery.winner_amounts) ? lottery.winner_amounts : []
    const hasWinnerPayouts = isClosed && winners.length > 0
    const creatorName = String(lottery.creator || '').replace(/^hive:/i, '')
    const isCreator = creatorName && creatorName.toLowerCase() === normalizedUser
    const donationName = String(lottery.donation_account || '').replace(/^hive:/i, '')
    const metaParts = parseLotteryMeta(lottery.metadata)
    const lotteryPostUrl = metaParts.lotteryPostUrl
    const donationPostUrl = metaParts.donationPostUrl
    const creatorUrl = creatorName ? `https://ecency.com/@${creatorName}` : ''
    const donationUrl = donationName ? `https://ecency.com/@${donationName}` : ''
    const ticketParts = [
      {
        label: 'Your Tickets',
        percent: totalTickets > 0 ? (userTickets / totalTickets) * 100 : 0,
        count: userTickets,
      },
      {
        label: 'Other Tickets',
        percent: totalTickets > 0 ? ((totalTickets - userTickets) / totalTickets) * 100 : 0,
        count: Math.max(0, totalTickets - userTickets),
      },
    ]
    const winnerCount = lottery.winner_count || sharePercents.length || 1

    // Collapsed tile view - shows minimal info
    if (!isExpanded) {
      return (
        <div
          key={`lottery-${lottery.id}`}
          onClick={onToggleExpand}
          style={{
            border: '1px solid var(--color-primary-darkest)',
            padding: '12px',
            background: 'rgba(0, 0, 0, 0.35)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            minHeight: '160px',
            maxHeight: '200px',
            width: isMobile ? '100%' : '200px',
            transition: 'border-color 0.2s ease, background 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-primary)'
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.5)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-primary-darkest)'
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.35)'
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onToggleExpand()
            }
          }}
        >
          {/* Name */}
          <div style={{
            fontWeight: 700,
            fontSize: '1rem',
            color: 'var(--color-primary-lighter)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {lottery.name || `Lottery #${lottery.id}`}
          </div>

          {/* Creator */}
          <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>
            <span style={{ opacity: 0.7 }}>by </span>
            <span style={{ color: 'var(--color-primary-lighter)' }}>@{creatorName}</span>
          </div>

          {/* Stats row */}
          <div style={{
            display: 'flex',
            gap: '12px',
            fontSize: '0.75rem',
            flexWrap: 'wrap',
          }}>
            <span title="Burn percentage">
              <span style={{ opacity: 0.7 }}>Burn: </span>
              <span style={{ color: 'var(--color-primary-lighter)' }}>{burnPercent}%</span>
            </span>
            {donationPercent > 0 && (
              <span title="Donation percentage">
                <span style={{ opacity: 0.7 }}>Donate: </span>
                <span style={{ color: 'var(--color-primary-lighter)' }}>{donationPercent}%</span>
              </span>
            )}
            <span title="Number of winners">
              <span style={{ opacity: 0.7 }}>Winners: </span>
              <span style={{ color: 'var(--color-primary-lighter)' }}>{winnerCount}</span>
            </span>
          </div>

          {/* Countdown - prominent at bottom */}
          <div style={{ marginTop: 'auto' }}>
            <span style={{
              color: isClosed ? 'var(--color-primary-lighter)' : (deadlinePassed ? 'var(--color-primary)' : 'var(--color-primary-lighter)'),
              fontWeight: deadlinePassed && !isClosed ? 700 : 600,
              fontSize: '1.1rem',
            }}>
              {isClosed ? 'Closed' : (deadlinePassed ? 'Ready!' : countdown)}
            </span>
          </div>

          {/* Expand hint */}
          <div style={{
            fontSize: '0.7rem',
            opacity: 0.5,
            textAlign: 'center',
            marginTop: '4px',
          }}>
            <FontAwesomeIcon icon={faChevronDown} style={{ fontSize: '0.6rem' }} /> Click to expand
          </div>
        </div>
      )
    }

    // Expanded view - full details (original design)
    return (
      <div
        key={`lottery-${lottery.id}`}
        style={{
          border: '1px solid var(--color-primary-darkest)',
          padding: '10px',
          background: 'rgba(0, 0, 0, 0.35)',
          width: '100%',
          flexBasis: '100%',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px',
          }}
        >
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginRight: '16px' }}
            onClick={onToggleExpand}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onToggleExpand()
              }
            }}
          >
            <FontAwesomeIcon
              icon={faChevronUp}
              style={{ fontSize: '0.8rem', opacity: 0.7 }}
              title="Collapse"
            />
            <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>
              {lottery.name || `Lottery #${lottery.id}`}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
            <button
              onClick={() => openLotteryDetail(lottery)}
              style={baseButtonStyle(false)}
              title="Lottery details"
            >
              <FontAwesomeIcon icon={faCircleInfo} />
            </button>
            {lotteryPostUrl && (
              <a
                href={lotteryPostUrl}
                target="_blank"
                rel="noreferrer"
                style={baseButtonStyle(false)}
                title="Open lottery post"
              >
                <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
              </a>
            )}
            {isCreator && (
              <button
                onClick={() => handleEditMetadata(lottery)}
                style={baseButtonStyle(false)}
                title="Edit metadata"
              >
                <FontAwesomeIcon icon={faPen} />
              </button>
            )}
            {!isClosed && !deadlinePassed && (
              <button
                onClick={() => handleBuyTickets(lottery.id)}
                style={{
                  ...baseButtonStyle(false),
                  backgroundColor: 'var(--color-primary-darker)',
                  color: 'black',
                }}
                title="Buy tickets"
              >
                <FontAwesomeIcon icon={faTicket} />
              </button>
            )}
            {!isClosed && deadlinePassed && (
              <button
                onClick={() => handleExecuteLottery(lottery.id)}
                style={baseButtonStyle(false)}
                title="Execute lottery"
              >
                <FontAwesomeIcon icon={faTrophy} />
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'stretch' }}>
          <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <tbody>
                <tr>
                  <td style={{ paddingRight: '12px', paddingBottom: '6px', opacity: 0.85, whiteSpace: 'nowrap', width: '1%' }}>
                    Creator:
                  </td>
                  <td style={{ paddingBottom: '6px', color: 'var(--color-primary-lighter)' }}>
                    {creatorName ? (
                      <a href={creatorUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary-lighter)', textDecoration: 'none' }}>
                        @{creatorName}
                      </a>
                    ) : (
                      ''
                    )}
                  </td>
                </tr>
                {lottery.donation_account && lottery.donation_percent > 0 && (
                <tr>
                  <td style={{ paddingRight: '12px', paddingBottom: '6px', opacity: 0.85, whiteSpace: 'nowrap', width: '1%' }}>
                    Donation to:
                  </td>
                  <td style={{ paddingBottom: '6px', color: 'var(--color-primary-lighter)' }}>
                    <span style={{ marginRight: '8px' }}>
                      {lottery.donation_percent}%{' '}
                      {donationName ? (
                        <a href={donationUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary-lighter)', textDecoration: 'none' }}>
                          @{donationName}
                        </a>
                      ) : (
                        ''
                      )}
                    </span>
                    {donationPostUrl && (
                      <a
                        href={donationPostUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          ...baseButtonStyle(false),
                          fontSize: '0.75rem',
                          padding: '0.2em 0.6em',
                        }}
                        title="Open donation post"
                      >
                        <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
                      </a>
                    )}
                  </td>
                </tr>
              )}
                <tr>
                  <td style={{ paddingRight: '12px', paddingBottom: '6px', opacity: 0.85, whiteSpace: 'nowrap', width: '1%' }}>
                    Burn:
                  </td>
                  <td style={{ paddingBottom: '6px', color: 'var(--color-primary-lighter)' }}>
                    {burnPercent}%
                  </td>
                </tr>
                {isMobile && (
                  <tr>
                    <td style={{ paddingRight: '12px', paddingBottom: '6px', opacity: 0.85, whiteSpace: 'nowrap', width: '1%' }}>
                      Your Tickets:
                    </td>
                    <td style={{ paddingBottom: '6px', color: userTickets > 0 ? 'var(--color-primary)' : 'var(--color-primary-lighter)' }}>
                      {userTickets}
                    </td>
                  </tr>
                )}
                {isMobile && (
                  <tr>
                    <td style={{ paddingRight: '12px', paddingBottom: '6px', opacity: 0.85, whiteSpace: 'nowrap', width: '1%' }}>
                      Total Tickets:
                    </td>
                    <td style={{ paddingBottom: '6px', color: 'var(--color-primary-lighter)' }}>
                      {totalTickets}
                    </td>
                  </tr>
                )}
                {hasWinnerPayouts
                  ? winners.map((winner, idx) => {
                      const winnerName = String(winner || '').replace(/^hive:/i, '')
                      const winnerUrl = winnerName ? `https://ecency.com/@${winnerName}` : ''
                      const amount = Number(winnerAmounts[idx])
                      return (
                        <tr key={`winner-${lottery.id}-${idx}`}>
                          <td style={{ paddingRight: '12px', paddingBottom: '6px', opacity: 0.85, whiteSpace: 'nowrap', width: '1%' }}>
                            #{idx + 1} Winner:
                          </td>
                          <td style={{ paddingBottom: '6px', color: 'var(--color-primary-lighter)' }}>
                            {winnerName ? (
                              <a href={winnerUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary-lighter)', textDecoration: 'none' }}>
                                @{winnerName}
                              </a>
                            ) : (
                              '—'
                            )}
                            {Number.isFinite(amount) ? ` (${amount.toFixed(3)} ${formatAsset(lottery.asset)})` : ''}
                          </td>
                        </tr>
                      )
                    })
                  : sharePercents.map((share, idx) => (
                      <tr key={`share-${lottery.id}-${idx}`}>
                        <td style={{ paddingRight: '12px', paddingBottom: '6px', opacity: 0.85, whiteSpace: 'nowrap', width: '1%' }}>
                          #{idx + 1} Winner:
                        </td>
                        <td style={{ paddingBottom: '6px', color: 'var(--color-primary-lighter)' }}>
                          {share}% ({(prizePoolAmount * (share / 100)).toFixed(3)} {formatAsset(lottery.asset)})
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
            <div style={{ marginTop: 'auto', paddingTop: '12px' }}>
              <span style={{ opacity: 0.85, display: 'block', marginBottom: '4px' }}>Countdown:</span>
              <span style={{
                color: isClosed ? 'var(--color-primary-lighter)' : (deadlinePassed ? 'var(--color-primary)' : 'var(--color-primary-lighter)'),
                fontWeight: isClosed ? 600 : (deadlinePassed ? 700 : 600),
                fontSize: '1.35rem',
              }}>
                {isClosed ? 'Closed' : (deadlinePassed ? 'Ready to Execute!' : countdown)}
              </span>
            </div>
          </div>
          {!isMobile && (
            <div style={{ display: 'flex', gap: '12px', flex: '0 0 auto', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', minWidth: '140px' }}>
                <span style={{ textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', lineHeight: 1.2 }}>
                  <span style={{ fontSize: '0.85rem', opacity: 0.85 }}>Ticket Price</span>
                  <br />
                  <span style={{ fontSize: '1rem', color: 'var(--color-primary-lighter)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    {lottery.ticket_price} {formatAsset(lottery.asset)}
                    <GamblingInfoIcon size={14} context="lottery" />
                  </span>
                </span>
                <PollPie parts={ticketParts} size={120} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem', alignItems: 'flex-start' }}>
                  {ticketParts.map((o, i) => (
                    <div key={`tickets-${lottery.id}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span style={{ color: 'var(--color-primary-lighter)' }}>
                        {o.label}: {o.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderLotteryList = () => {
    if (fetching) return renderEmptyState('Loading active lotteries…')
    if (error) return renderEmptyState('Could not load lotteries right now.')
    const filteredLotteries =
      lotteryStatusFilter === 'closed'
        ? closedLotteriesWithMetadata
        : activeLotteriesWithMetadata
    if (!filteredLotteries.length) {
      return renderEmptyState(lotteryStatusFilter === 'closed' ? 'No closed lotteries yet.' : 'No active lotteries. Create one!')
    }

    // Group lotteries by type
    const joinedLotteryIds = new Set(userParticipations.map((p) => p.lottery_id))

    // Spotlight: new or ending soon lotteries that user hasn't joined
    const spotlightLotteries = filteredLotteries.filter((l) => {
      const creatorName = String(l.creator || '').replace(/^hive:/i, '').toLowerCase()
      const isCreator = creatorName === normalizedUser
      const hasJoined = joinedLotteryIds.has(l.id)
      return !isCreator && isSpotlightLottery(l, hasJoined)
    })
    const spotlightIds = new Set(spotlightLotteries.map((l) => l.id))

    const groupedLotteries = {
      spotlight: spotlightLotteries,
      creator: filteredLotteries.filter((l) => {
        const creatorName = String(l.creator || '').replace(/^hive:/i, '').toLowerCase()
        return creatorName === normalizedUser
      }),
      joined: filteredLotteries.filter((l) => {
        const creatorName = String(l.creator || '').replace(/^hive:/i, '').toLowerCase()
        return creatorName !== normalizedUser && joinedLotteryIds.has(l.id)
      }),
      other: filteredLotteries.filter((l) => {
        const creatorName = String(l.creator || '').replace(/^hive:/i, '').toLowerCase()
        // Exclude spotlight lotteries from "other" to avoid duplicates
        return creatorName !== normalizedUser && !joinedLotteryIds.has(l.id) && !spotlightIds.has(l.id)
      }),
    }

    const renderGroupSection = (title, lotteryList, icon, groupKey) => {
      if (lotteryList.length === 0) return null
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
              fontSize: '0.95rem',
              color: 'var(--color-primary-lighter)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              flex: 1,
            }}>
              {title} ({lotteryList.length})
            </span>
            <FontAwesomeIcon
              icon={isCollapsed ? faChevronDown : faChevronUp}
              style={{ fontSize: '0.8rem', opacity: 0.7 }}
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
              {lotteryList.map((lottery) => (
                <LotteryItem
                  key={`lottery-${lottery.id}`}
                  lottery={lottery}
                  isExpanded={expandedLotteryIds.has(lottery.id)}
                  onToggleExpand={() => toggleLotteryExpand(lottery.id)}
                />
              ))}
            </div>
          )}
        </div>
      )
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {renderGroupSection('Spotlight', groupedLotteries.spotlight, faStar, 'spotlight')}
        {renderGroupSection('Created by You', groupedLotteries.creator, faUserShield, 'creator')}
        {renderGroupSection('Joined Lotteries', groupedLotteries.joined, faTicketAlt, 'joined')}
        {renderGroupSection('Other Lotteries', groupedLotteries.other, faGlobe, 'other')}
        {filteredLotteries.length === 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--color-primary-lighter)',
            fontSize: '0.9rem',
            padding: '8px 2px',
          }}>
            <FontAwesomeIcon icon={faCircleInfo} />
            <span>No lotteries match the current filter.</span>
          </div>
        )}
      </div>
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
      
      {!isMobile && renderHeader('Lotteries', lotteriesCollapsed, setLotteriesCollapsed)}
      {(!isMobile && !lotteriesCollapsed) || isMobile ? (
        <>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', position: 'relative', zIndex: 2, flexWrap: 'wrap' }}>
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
                  { key: 'active', label: 'Active' },
                  { key: 'closed', label: 'Closed' },
                ].map((tab) => (
                  <button
                    key={`lot-${tab.key}`}
                    onClick={() => setLotteryStatusFilter(tab.key)}
                    style={baseButtonStyle(lotteryStatusFilter === tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
            <button
              onClick={() => onCreateLottery?.()}
              style={{
                ...baseButtonStyle(false),
                backgroundColor: 'var(--color-primary-darker)',
                color: 'black',
              }}
              title="Host Lottery"
            >
              <FontAwesomeIcon icon={faPlusCircle} />
              <span>Host Lottery</span>
            </button>
            </div>
          </div>
          {renderLotteryList()}
        </>
      ) : null}
    </div>
  )
}
