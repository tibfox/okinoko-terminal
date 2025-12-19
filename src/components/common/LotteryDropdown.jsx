import { useMemo } from 'preact/hooks'
import { gql, useQuery } from '@urql/preact'
import NeonListDropdown from './NeonListDropdown.jsx'

const ACTIVE_LOTTERIES_QUERY = gql`
  query ActiveLotteries {
    okinoko_lottery_active(order_by: { deadline: asc }) {
      id
      name
      creator
      ticket_price
      asset
      burn_percent
      donation_percent
      deadline
      total_tickets_sold
      unique_participants
    }
  }
`

// Helper to format Unix timestamp to readable date
const formatDeadline = (unixTimestamp) => {
  const date = new Date(unixTimestamp * 1000)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// Template string replacement helper
const fillTemplate = (template, data) => {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = data[key]
    if (key === 'deadline' && typeof value === 'number') {
      return formatDeadline(value)
    }
    if (typeof value === 'number' && key.includes('percent')) {
      return value.toFixed(0)
    }
    if (typeof value === 'number') {
      return value.toFixed(3).replace(/\.?0+$/, '')
    }
    return value !== undefined ? String(value).toUpperCase() : match
  })
}

export default function LotteryDropdown({
  value,
  onChange,
  param,
  placeholder = 'Select a lottery…'
}) {
  const [{ data, fetching, error }] = useQuery({
    query: ACTIVE_LOTTERIES_QUERY,
    requestPolicy: 'cache-and-network',
  })

  const options = useMemo(() => {
    if (!data?.okinoko_lottery_active) return []

    return data.okinoko_lottery_active.map((lottery) => ({
      value: String(lottery[param.valueField || 'id']),
      label: fillTemplate(param.labelTemplate || '#{id}: {name}', lottery),
      subtitle: param.subtitleTemplate
        ? fillTemplate(param.subtitleTemplate, lottery)
        : undefined,
      title: lottery.name,
    }))
  }, [data, param])

  if (fetching && !data) {
    return (
      <div style={{
        padding: '12px 14px',
        background: 'rgba(6, 6, 6, 0.9)',
        border: '1px solid var(--color-primary-darkest)',
        color: 'var(--color-primary-lighter)',
        opacity: 0.7
      }}>
        Loading active lotteries…
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        padding: '12px 14px',
        background: 'rgba(6, 6, 6, 0.9)',
        border: '1px solid var(--color-primary-darkest)',
        color: 'var(--color-primary-lighter)',
        opacity: 0.7
      }}>
        Error loading lotteries
      </div>
    )
  }

  if (!options.length) {
    return (
      <div style={{
        padding: '12px 14px',
        background: 'rgba(6, 6, 6, 0.9)',
        border: '1px solid var(--color-primary-darkest)',
        color: 'var(--color-primary-lighter)',
        opacity: 0.7
      }}>
        No active lotteries available
      </div>
    )
  }

  return (
    <NeonListDropdown
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      showCheck={false}
    />
  )
}
