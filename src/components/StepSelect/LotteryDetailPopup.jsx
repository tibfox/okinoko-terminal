import { useState, useEffect } from 'preact/hooks'
import { gql, useQuery } from '@urql/preact'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowUpRightFromSquare, faTicket, faTrophy } from '@fortawesome/free-solid-svg-icons'
import { faStar } from '@fortawesome/free-regular-svg-icons'
import NeonButton from '../buttons/NeonButton.jsx'
import PollPie from './PollPie.jsx'
import GamblingInfoIcon from '../common/GamblingInfoIcon.jsx'

const PIE_COLORS = ['#4fd1c5', '#ed64a6', '#63b3ed', '#f6ad55', '#9f7aea', '#68d391', '#f56565']

const LOTTERY_PARTICIPANTS_QUERY = gql`
  query LotteryParticipants($lotteryId: numeric!) {
    oki_lottery_v2_participant_summary(
      where: { lottery_id: { _eq: $lotteryId } }
      order_by: { tickets: desc }
    ) {
      participant
      tickets
    }
  }
`

const formatDeadline = (unixTimestamp) => {
  const date = new Date(unixTimestamp * 1000)
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

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

const formatParticipant = (participant) => {
  const name = String(participant || '').replace(/^hive:/i, '')
  return name ? `@${name}` : 'Unknown'
}

const baseButtonStyle = {
  backgroundColor: 'transparent',
  color: 'var(--color-primary-lighter)',
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
}

const tabButtonStyle = (active = false) => ({
  ...baseButtonStyle,
  backgroundColor: active ? 'var(--color-primary-darker)' : 'transparent',
  color: active ? 'black' : 'var(--color-primary-lighter)',
  fontSize: '0.75rem',
  padding: '0.35em 0.8em',
})

export default function LotteryDetailPopup({
  lottery,
  userTickets = 0,
  onBuyTickets,
  onExecute,
  canExecute = false,
}) {
  if (!lottery) return null

  const [activeChart, setActiveChart] = useState('prize')
  const countdown = useCountdown(lottery.deadline)
  const totalPot = (lottery.total_tickets_sold || 0) * (lottery.ticket_price || 0)
  const burnPercent = Number(lottery.burn_percent) || 0
  const donationPercent =
    lottery.donation_account && lottery.donation_percent > 0 ? Number(lottery.donation_percent) || 0 : 0
  const burnAmount = totalPot * (burnPercent / 100)
  const donationAmount = donationPercent > 0 ? totalPot * (donationPercent / 100) : 0
  const prizePool = totalPot - burnAmount - donationAmount
  const prizePoolPercent = Math.max(0, 100 - burnPercent - donationPercent)
  const creatorName = String(lottery.creator || '').replace(/^hive:/i, '')
  const donationName = String(lottery.donation_account || '').replace(/^hive:/i, '')
  const creatorUrl = creatorName ? `https://ecency.com/@${creatorName}` : ''
  const donationUrl = donationName ? `https://ecency.com/@${donationName}` : ''
  const metaParts = parseLotteryMeta(lottery.metadata)
  const lotteryPostUrl = metaParts.lotteryPostUrl
  const donationPostUrl = metaParts.donationPostUrl
  const description = metaParts.additionalDescription
  const lotteryId = Number(lottery.id)
  const [{ data: participantData }] = useQuery({
    query: LOTTERY_PARTICIPANTS_QUERY,
    variables: { lotteryId },
    pause: !Number.isFinite(lotteryId),
  })

  // Parse winner shares
  const shares = (lottery.winner_shares || '')
    .split(/[;,]/)
    .map((s) => parseFloat(s.trim()))
    .filter((n) => !isNaN(n) && n > 0)
  const shareParts = shares.length
    ? shares.map((share, idx) => ({
        label: `Winner ${idx + 1}`,
        percent: (share / 100) * prizePoolPercent,
        amount: prizePool * (share / 100),
      }))
    : [{ label: 'Prize Pool', percent: prizePoolPercent, amount: prizePool }]
  const distributionParts = [
    ...(burnPercent > 0 ? [{ label: 'Burn', percent: burnPercent, amount: burnAmount }] : []),
    ...(donationPercent > 0 ? [{ label: 'Donation', percent: donationPercent, amount: donationAmount }] : []),
    ...shareParts,
  ]
  const totalTickets = lottery.total_tickets_sold || 0
  const ticketParts = [
    { label: 'Your Tickets', percent: totalTickets > 0 ? (userTickets / totalTickets) * 100 : 0 },
    { label: 'Other Tickets', percent: totalTickets > 0 ? ((totalTickets - userTickets) / totalTickets) * 100 : 0 },
  ]
  const participantRows = participantData?.oki_lottery_v2_participant_summary || []
  const ticketsByParticipant = new Map()
  participantRows.forEach((row) => {
    const key = row.participant || ''
    const existing = ticketsByParticipant.get(key) || 0
    ticketsByParticipant.set(key, existing + (Number(row.tickets) || 0))
  })
  const sortedParticipants = [...ticketsByParticipant.entries()]
    .map(([participant, tickets]) => ({ participant, tickets }))
    .sort((a, b) => b.tickets - a.tickets)
  const allBuyerParts = sortedParticipants.map((entry) => ({
    label: formatParticipant(entry.participant),
    percent: totalTickets > 0 ? (entry.tickets / totalTickets) * 100 : 0,
    tickets: entry.tickets,
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '280px' }}>
      <div
        style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start',
          padding: '16px',
          background: 'linear-gradient(135deg, rgba(246, 173, 85, 0.1) 0%, rgba(79, 209, 197, 0.1) 100%)',
          border: '1px solid var(--color-primary-darkest)',
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: '4px' }}>
            {lottery.name || `Lottery #${lottery.id}`}
          </div>
          <div style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '8px' }}>
            by{' '}
            {creatorName ? (
              <a href={creatorUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary-lighter)', textDecoration: 'none' }}>
                @{creatorName}
              </a>
            ) : (
              ''
            )}
          </div>
          {description && (
            <div style={{ fontSize: '0.9rem', lineHeight: 1.4, color: 'var(--color-primary-lighter)' }}>
              {description}
            </div>
          )}
        </div>
        {lotteryPostUrl && (
          <NeonButton
            as="a"
            href={lotteryPostUrl}
            target="_blank"
            rel="noreferrer"
            style={baseButtonStyle}
            title="Open lottery post"
          >
            <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
            <span>Open Post</span>
          </NeonButton>
        )}
      </div>

      {lottery.is_executed && lottery.winners && lottery.winners.length > 0 && (
        <div
          style={{
            padding: '16px',
            background: 'linear-gradient(135deg, rgba(246, 173, 85, 0.1) 0%, rgba(79, 209, 197, 0.1) 100%)',
            border: '1px solid var(--color-primary-darkest)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <FontAwesomeIcon icon={faStar} style={{ color: 'var(--color-primary-darker)', fontSize: '1.2rem' }} />
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-primary-lightest)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {lottery.winners.length === 1 ? 'Winner' : 'Winners'}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {lottery.winners.map((winner, idx) => {
              const winnerName = String(winner || '').replace(/^hive:/i, '')
              const winnerUrl = winnerName ? `https://ecency.com/@${winnerName}` : ''
              const winAmount = lottery.winner_amounts && lottery.winner_amounts[idx] ? Number(lottery.winner_amounts[idx]) : 0
              return (
                <div
                  key={`winner-${lottery.id}-${idx}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    border: '1px solid var(--color-primary-darkest)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        color: idx === 0 ? 'var(--color-primary-darker)' : 'var(--color-primary-lighter)',
                        minWidth: '30px',
                      }}
                    >
                      #{idx + 1}
                    </div>
                    {winnerName ? (
                      <a
                        href={winnerUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          color: 'var(--color-primary-lightest)',
                          textDecoration: 'none',
                          fontSize: '1rem',
                          fontWeight: 600,
                        }}
                      >
                        @{winnerName}
                      </a>
                    ) : (
                      <span style={{ color: 'var(--color-primary-lighter)', fontSize: '1rem' }}>Unknown</span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: 'var(--color-primary)',
                    }}
                  >
                    {winAmount.toFixed(3)} {formatAsset(lottery.asset)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          padding: '16px 0',
          background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.15) 100%)',
        }}
      >
        <style>{`
          @media (min-width: 768px) {
            .lottery-two-column {
              display: flex !important;
              flex-direction: row !important;
              gap: 24px !important;
            }
            .lottery-left-col {
              flex: 1 !important;
              min-width: 0 !important;
            }
            .lottery-right-col {
              flex: 1 !important;
              display: flex !important;
              flex-direction: column !important;
              align-items: center !important;
              justify-content: flex-start !important;
            }
          }
        `}</style>

        <div className="lottery-two-column" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            className="lottery-left-col"
            style={{
              padding: '12px',
              background: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid var(--color-primary-darkest)',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <tbody>
                <tr>
                  <td style={{ paddingRight: '12px', paddingBottom: '6px', opacity: 0.85, whiteSpace: 'nowrap', width: '1%' }}>
                    Lottery ID
                  </td>
                  <td style={{ paddingBottom: '6px', color: 'var(--color-primary-lighter)' }}>
                    {lottery.id}
                  </td>
                </tr>
                <tr>
                  <td style={{ paddingRight: '12px', paddingBottom: '6px', opacity: 0.85, whiteSpace: 'nowrap', width: '1%' }}>
                    Ticket Price
                  </td>
                  <td style={{ paddingBottom: '6px', color: 'var(--color-primary-lighter)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      {lottery.ticket_price} {formatAsset(lottery.asset)}
                      <GamblingInfoIcon size={14} context="lottery" />
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style={{ paddingRight: '12px', paddingBottom: '6px', opacity: 0.85, whiteSpace: 'nowrap', width: '1%' }}>
                    Your Tickets
                  </td>
                  <td style={{ paddingBottom: '6px', color: userTickets > 0 ? 'var(--color-primary)' : 'var(--color-primary-lighter)', fontWeight: userTickets > 0 ? 700 : 400 }}>
                    {userTickets} {userTickets > 0 ? `(${((userTickets / (lottery.total_tickets_sold || 1)) * 100).toFixed(1)}% of total)` : ''}
                  </td>
                </tr>
                <tr>
                  <td style={{ paddingRight: '12px', paddingBottom: '6px', opacity: 0.85, whiteSpace: 'nowrap', width: '1%' }}>
                    Total Tickets Sold
                  </td>
                  <td style={{ paddingBottom: '6px', color: 'var(--color-primary-lighter)' }}>
                    {lottery.total_tickets_sold || 0}
                  </td>
                </tr>
                <tr>
                  <td style={{ paddingRight: '12px', paddingBottom: '6px', opacity: 0.85, whiteSpace: 'nowrap', width: '1%' }}>
                    Participants
                  </td>
                  <td style={{ paddingBottom: '6px', color: 'var(--color-primary-lighter)' }}>
                    {lottery.unique_participants || 0}
                  </td>
                </tr>
                <tr>
                  <td style={{ paddingRight: '12px', paddingBottom: '6px', opacity: 0.85, whiteSpace: 'nowrap', width: '1%' }}>
                    Deadline
                  </td>
                  <td style={{ paddingBottom: '6px', color: 'var(--color-primary-lighter)' }}>
                    {formatDeadline(lottery.deadline)}
                  </td>
                </tr>
                <tr>
                  <td style={{ paddingRight: '12px', paddingBottom: '6px', opacity: 0.85, whiteSpace: 'nowrap', width: '1%' }}>
                    Countdown
                  </td>
                  <td style={{ paddingBottom: '6px', color: canExecute ? 'var(--color-primary)' : 'var(--color-primary-lighter)', fontWeight: canExecute ? 700 : 400 }}>
                    {canExecute ? 'Ready to execute!' : countdown}
                  </td>
                </tr>
                <tr>
                  <td style={{ paddingRight: '12px', paddingBottom: '6px', opacity: 0.85, whiteSpace: 'nowrap', width: '1%' }}>
                    Burn Amount
                  </td>
                  <td style={{ paddingBottom: '6px', color: 'var(--color-primary-lighter)' }}>
                    {burnAmount.toFixed(3)} {formatAsset(lottery.asset)} ({burnPercent}%)
                  </td>
                </tr>
                {lottery.donation_account && lottery.donation_percent > 0 && (
                  <tr>
                    <td style={{ paddingRight: '12px', paddingBottom: '6px', opacity: 0.85, whiteSpace: 'nowrap', width: '1%' }}>
                      Donation
                    </td>
                    <td style={{ paddingBottom: '6px', color: 'var(--color-primary-lighter)' }}>
                      <span style={{ marginRight: '8px' }}>
                        {donationAmount.toFixed(3)} {formatAsset(lottery.asset)} ({donationPercent}%) to{' '}
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
                            ...baseButtonStyle,
                            fontSize: '0.75rem',
                            padding: '0.2em 0.6em',
                          }}
                          title="Open donation post"
                        >
                          <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
                          <span>Open Post</span>
                        </a>
                      )}
                    </td>
                  </tr>
                )}
                <tr>
                  <td style={{ paddingRight: '12px', paddingBottom: '6px', opacity: 0.85, whiteSpace: 'nowrap', width: '1%' }}>
                    Prize Pool
                  </td>
                  <td style={{ paddingBottom: '6px', color: 'var(--color-primary)' }}>
                    {prizePool.toFixed(3)} {formatAsset(lottery.asset)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div
            className="lottery-right-col"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              alignItems: 'center',
              padding: '12px',
              background: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid var(--color-primary-darkest)',
            }}
          >
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={() => setActiveChart('prize')}
                style={tabButtonStyle(activeChart === 'prize')}
                type="button"
              >
                Prize Split
              </button>
              <button
                onClick={() => setActiveChart('tickets')}
                style={tabButtonStyle(activeChart === 'tickets')}
                type="button"
              >
                Tickets
              </button>
              <button
                onClick={() => setActiveChart('buyers')}
                style={tabButtonStyle(activeChart === 'buyers')}
                type="button"
              >
                Buyers
              </button>
            </div>
            {activeChart === 'prize' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', minWidth: '150px' }}>
                <PollPie parts={distributionParts} size={150} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem', alignItems: 'flex-start' }}>
                  {distributionParts.map((o, i) => (
                    <div key={`dist-${lottery.id}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span style={{ color: 'var(--color-primary-lighter)' }}>
                        {o.label}: {o.percent.toFixed(1)}%
                        {Number.isFinite(o.amount) ? ` (${o.amount.toFixed(3)} ${formatAsset(lottery.asset)})` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeChart === 'tickets' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', minWidth: '150px' }}>
                <PollPie parts={ticketParts} size={150} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem', alignItems: 'flex-start' }}>
                  {ticketParts.map((o, i) => (
                    <div key={`tickets-${lottery.id}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span style={{ color: 'var(--color-primary-lighter)' }}>
                        {o.label}: {o.percent.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeChart === 'buyers' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', minWidth: '150px' }}>
                {allBuyerParts.length > 0 && totalTickets > 0 ? (
                  <>
                    <PollPie parts={allBuyerParts} size={150} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem', alignItems: 'flex-start' }}>
                      {allBuyerParts.map((o, i) => (
                        <div key={`buyers-${lottery.id}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span style={{ color: 'var(--color-primary-lighter)' }}>
                            {o.label}: {o.percent.toFixed(1)}% ({o.tickets} tickets)
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-primary-lighter)', opacity: 0.8 }}>
                    No ticket buyer data.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>



      <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'center' }}>
        {!lottery.is_executed && !canExecute && onBuyTickets && (
          <NeonButton
            onClick={onBuyTickets}
            style={{
              ...baseButtonStyle,
              backgroundColor: 'var(--color-primary-darker)',
              color: 'black',
            }}
          >
            <FontAwesomeIcon icon={faTicket} />
            <span>Buy Tickets</span>
          </NeonButton>
        )}
        {canExecute && onExecute && (
          <NeonButton onClick={onExecute} style={baseButtonStyle}>
            <FontAwesomeIcon icon={faTrophy} />
            <span>Execute Lottery</span>
          </NeonButton>
        )}
      </div>
    </div>
  )
}
