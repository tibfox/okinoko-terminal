import { useMemo, useState, useEffect } from 'preact/hooks'
import { useAioha } from '@aioha/react-ui'
import { useQuery } from '@urql/preact'
import {
  PLAYER_LEADERBOARD_QUERY,
  PLAYER_LEADERBOARD_SEASON_QUERY,
  COMPLETED_GAMES_HISTORY_QUERY,
} from '../../../data/inarow_gql.js'
import { GAME_TYPE_OPTIONS } from '../gameTypes.js'
import { Tabs } from '../../common/Tabs.jsx'
import { playBeep } from '../../../lib/beep.js'
import { getCookie, setCookie } from '../../../lib/cookies.js'

const DEFAULT_LEADERBOARD_GAME_TYPE = GAME_TYPE_OPTIONS[0]?.id ?? 1

const LEADERBOARD_FIELD_MAP = {
  player: 'player',
  ratio: 'win_ratio',
  wins: 'wins',
  games: 'games_played',
  draws: 'draws',
  losses: 'losses',
  active: 'active_games',
}

export default function EmptyGamePanel({ defaultGameTypeId, description }) {
  const [activeTab, setActiveTab] = useState('leaderboard')
  const [leaderboardScope, setLeaderboardScope] = useState('season')
  const [sortKey, setSortKey] = useState(() => getCookie('leaderboardSortKey') || 'ratio')
  const [sortDirection, setSortDirection] = useState(() => getCookie('leaderboardSortDir') || 'desc')
  const [historySortKey, setHistorySortKey] = useState(() => getCookie('historySortKey') || 'id')
  const [historySortDirection, setHistorySortDirection] = useState(() => getCookie('historySortDir') || 'desc')
  const { user } = useAioha()
  const normalizedUser = useMemo(() => {
    if (!user) return ''
    return user.startsWith('hive:') ? user : `hive:${user}`
  }, [user])
  const selectedType = defaultGameTypeId ?? DEFAULT_LEADERBOARD_GAME_TYPE

  const orderBy = useMemo(() => {
    const field = LEADERBOARD_FIELD_MAP[sortKey] || 'win_ratio'
    const primaryDirection =
      field === 'win_ratio'
        ? sortDirection === 'asc'
          ? 'asc_nulls_last'
          : 'desc_nulls_last'
        : field === 'player'
        ? sortDirection
        : sortDirection
    const base = [{ [field]: primaryDirection }]
    if (field !== 'win_ratio' && field !== 'player') {
      base.push({ win_ratio: 'desc_nulls_last' })
    }
    if (field !== 'player') {
      base.push({ wins: 'desc' }, { games_played: 'desc' })
    }
    return base
  }, [sortKey, sortDirection])

  const hasSelectedType = selectedType != null
  const leaderboardQuery =
    leaderboardScope === 'season' ? PLAYER_LEADERBOARD_SEASON_QUERY : PLAYER_LEADERBOARD_QUERY
  const leaderboardPaused = activeTab !== 'leaderboard' || !hasSelectedType
  const [{ data, fetching, error }] = useQuery({
    query: leaderboardQuery,
    variables: hasSelectedType
      ? {
          gameType: selectedType,
          orderBy,
          limit: 25,
        }
      : undefined,
    pause: leaderboardPaused,
    requestPolicy: 'cache-and-network',
  })

  const historyPaused = activeTab !== 'history' || !hasSelectedType || !normalizedUser
  const [{ data: historyData, fetching: historyFetching, error: historyError }] = useQuery({
    query: COMPLETED_GAMES_HISTORY_QUERY,
    variables:
      hasSelectedType && normalizedUser
        ? {
            gameType: selectedType,
            user: normalizedUser,
          }
        : undefined,
    pause: historyPaused,
    requestPolicy: 'cache-and-network',
  })

  const rows =
    data?.okinoko_iarv2_player_stats_by_type ??
    data?.okinoko_iarv2_player_stats_by_type_current_season ??
    []

  const rawHistoryRows = historyData?.okinoko_iarv2_completed_games ?? []

  // Helper functions for formatting
  const formatRatio = (value) => {
    if (value === null || value === undefined) return '–'
    const num = Number(value)
    if (Number.isNaN(num)) return '–'
    return `${(num * 100).toFixed(1)}%`
  }

  const normalizeId = (value) => (value || '').replace(/^hive:/i, '')
  const formatId = (value) => {
    const cleaned = normalizeId(value)
    return cleaned.length > 0 ? cleaned : '—'
  }

  const formatOutcome = (row) => {
    const winner = normalizeId(row.winner)
    const resigner = normalizeId(row.resigner)
    const timedout = normalizeId(row.timedout)
    const joiner = normalizeId(row.joined_by)

    // If someone won
    if (winner) {
      return winner === normalizedUser ? 'Win' : 'Loss'
    }

    // If someone resigned
    if (resigner) {
      // If no one joined and the creator resigned, it's cancelled
      if (!joiner) {
        return 'Cancelled'
      }
      return resigner === normalizedUser ? 'Loss (resigned)' : 'Win (opponent resigned)'
    }

    // If someone timed out
    if (timedout) {
      return timedout === normalizedUser ? 'Loss (timeout)' : 'Win (timeout)'
    }

    // Otherwise it's a draw
    return 'Draw'
  }

  const formatOpponent = (row) => {
    const creator = normalizeId(row.creator)
    const joiner = normalizeId(row.joined_by)
    if (!normalizedUser) return formatId(joiner) || formatId(creator)
    if (creator === normalizedUser) return formatId(joiner)
    if (joiner === normalizedUser) return formatId(creator)
    return formatId(creator)
  }

  const formatCompletedAt = (timestamp) => {
    if (!timestamp) return '—'
    try {
      const date = new Date(timestamp)
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return '—'
    }
  }

  // Client-side sorting for history
  const historyRows = useMemo(() => {
    const sorted = [...rawHistoryRows]
    sorted.sort((a, b) => {
      let aVal, bVal

      switch (historySortKey) {
        case 'id':
          aVal = Number(a.id) || 0
          bVal = Number(b.id) || 0
          break
        case 'name':
          aVal = (a.name || `Game #${a.id}`).toLowerCase()
          bVal = (b.name || `Game #${b.id}`).toLowerCase()
          break
        case 'opponent':
          aVal = formatOpponent(a).toLowerCase()
          bVal = formatOpponent(b).toLowerCase()
          break
        case 'outcome':
          aVal = formatOutcome(a).toLowerCase()
          bVal = formatOutcome(b).toLowerCase()
          break
        case 'bet':
          aVal = Number(a.betamount) || 0
          bVal = Number(b.betamount) || 0
          break
        case 'completed':
          aVal = a.indexer_ts ? new Date(a.indexer_ts).getTime() : 0
          bVal = b.indexer_ts ? new Date(b.indexer_ts).getTime() : 0
          break
        default:
          return 0
      }

      if (aVal < bVal) return historySortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return historySortDirection === 'asc' ? 1 : -1
      return 0
    })
    return sorted
  }, [rawHistoryRows, historySortKey, historySortDirection])

  const handleScopeChange = (key) => {
    playBeep(800, 25, 'square')
    setLeaderboardScope(key)
  }

  const handleSortChange = (nextKey) => {
    if (!LEADERBOARD_FIELD_MAP[nextKey]) return
    if (sortKey === nextKey) {
      const newDir = sortDirection === 'desc' ? 'asc' : 'desc'
      setSortDirection(newDir)
      setCookie('leaderboardSortDir', newDir, 30)
    } else {
      setSortKey(nextKey)
      setSortDirection('desc')
      setCookie('leaderboardSortKey', nextKey, 30)
      setCookie('leaderboardSortDir', 'desc', 30)
    }
  }

  const handleHistorySortChange = (nextKey) => {
    if (historySortKey === nextKey) {
      const newDir = historySortDirection === 'desc' ? 'asc' : 'desc'
      setHistorySortDirection(newDir)
      setCookie('historySortDir', newDir, 30)
    } else {
      setHistorySortKey(nextKey)
      setHistorySortDirection('desc')
      setCookie('historySortKey', nextKey, 30)
      setCookie('historySortDir', 'desc', 30)
    }
  }

  const columnHeaders = [
    { key: 'player', label: 'Player', sortable: true, sortKey: 'player' },
    { key: 'win_ratio', label: 'Win Ratio', sortable: true, sortKey: 'ratio' },
    { key: 'wins', label: 'Wins', sortable: true, sortKey: 'wins' },
    { key: 'games_played', label: 'Joined', sortable: true, sortKey: 'games' },
    { key: 'active_games', label: 'Active', sortable: true, sortKey: 'active' },
    { key: 'draws', label: 'Draws', sortable: true, sortKey: 'draws' },
    { key: 'losses', label: 'Losses', sortable: true, sortKey: 'losses' },
  ]

  const tabButtonStyle = (active) => ({
    flex: 1,
    padding: '10px 12px',
    background: active ? 'var(--color-primary-darkest)' : 'transparent',
    color: active ? 'var(--color-primary-lightest)' : 'var(--color-primary-lighter)',
    border: '1px solid var(--color-primary-darkest)',
    cursor: 'pointer',
    textTransform: 'uppercase',
    fontSize: 'var(--font-size-base)',
    letterSpacing: '0.05em',
  })

  const descriptionParagraphs =
    description && description.trim().length > 0
      ? description
          .trim()
          .split(/\r?\n\s*\r?\n/)
          .map((text) => text.trim())
      : [
          'Select a game to view its description, rules, and any special actions you can perform.',
        ]

  const infoTab = (
    <div>
      {descriptionParagraphs.map((text, idx) => (
        <p key={idx} style={{ lineHeight: 1.5 }}>
          {text}
        </p>
      ))}
      <div style={{ marginTop: '24px' }}>
        <h4>First Move Payment (FMP)</h4>
        <p style={{ lineHeight: 1.5 }}>
          When available, FMP lets you pay a small premium to guarantee the opening move. Leave it off
          to join games normally.
        </p>
      </div>
    </div>
  )

  const leaderboardTab = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {!hasSelectedType && (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-primary-lighter)' }}>
          Choose a game type to see leaderboard stats.
        </div>
      )}

      {hasSelectedType && (
        <div class="game-selection-table">
          <div class="game-table-wrapper">
            <table style={{ width: '100%', tableLayout: 'auto', minWidth: '640px' }}>
              <thead>
                <tr>
                  {columnHeaders.map((col) => {
                    const isActiveSort = col.sortable && sortKey === col.sortKey
                    const arrow = isActiveSort ? (sortDirection === 'desc' ? '▼' : '▲') : ''
                    return (
                      <th
                        key={col.key}
                        style={{
                          textAlign: col.key === 'player' ? 'left' : 'right',
                          padding: '4px 6px',
                          cursor: col.sortable ? 'pointer' : 'default',
                          color: isActiveSort ? 'var(--color-primary-lightest)' : 'var(--color-primary-lighter)',
                          whiteSpace: 'nowrap',
                        }}
                        onClick={() => col.sortable && handleSortChange(col.sortKey)}
                      >
                        {col.label} {arrow}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {fetching && (
                  <tr>
                    <td colSpan={columnHeaders.length} style={{ padding: '18px', textAlign: 'center' }}>
                      Loading leaderboard…
                    </td>
                  </tr>
                )}
                {error && !fetching && (
                  <tr>
                    <td
                      colSpan={columnHeaders.length}
                      style={{ padding: '18px', textAlign: 'center', color: 'var(--color-error, #ff5c8d)' }}
                    >
                      Failed to load leaderboard. Please try again.
                    </td>
                  </tr>
                )}
                {!fetching && !error && rows.length === 0 && (
                  <tr>
                    <td colSpan={columnHeaders.length} style={{ padding: '18px', textAlign: 'center' }}>
                      No stats recorded yet for this game type.
                    </td>
                  </tr>
                )}
                {!fetching &&
                  !error &&
                  rows.map((row) => (
                    <tr key={`${row.player}-${row.type}`}>
                      <td style={{ padding: '4px 6px', textAlign: 'left' }}>{row.player?.replace('hive:', '') ?? '—'}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right' }}>{formatRatio(row.win_ratio)}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right' }}>{Number(row.wins ?? 0)}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right' }}>{Number(row.games_played ?? 0)}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right' }}>{Number(row.active_games ?? 0)}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right' }}>{Number(row.draws ?? 0)}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right' }}>{Number(row.losses ?? 0)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )

  const historyTab = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {!user && (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-primary-lighter)' }}>
          Sign in to view your recent games.
        </div>
      )}
      {user && !hasSelectedType && (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-primary-lighter)' }}>
          Choose a game type to see your completed games.
        </div>
      )}
      {user && hasSelectedType && (
        <div class="game-selection-table">
          <div class="game-table-wrapper">
            <table style={{ width: '100%', tableLayout: 'auto', minWidth: '640px' }}>
              <thead>
                <tr>
                  {[
                    { key: 'name', label: 'Game', align: 'left' },
                    { key: 'opponent', label: 'Opponent', align: 'left' },
                    { key: 'outcome', label: 'Outcome', align: 'left' },
                    { key: 'bet', label: 'Bet', align: 'right' },
                    { key: 'completed', label: 'Completed', align: 'left' },
                  ].map((col) => {
                    const isActive = historySortKey === col.key
                    const arrow = isActive ? (historySortDirection === 'desc' ? '▼' : '▲') : ''
                    return (
                      <th
                        key={col.key}
                        style={{
                          textAlign: col.align,
                          padding: '4px 6px',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer',
                          color: isActive ? 'var(--color-primary-lightest)' : 'var(--color-primary-lighter)',
                        }}
                        onClick={() => handleHistorySortChange(col.key)}
                      >
                        {col.label} {arrow}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {historyFetching && (
                  <tr>
                    <td colSpan={5} style={{ padding: '18px', textAlign: 'center' }}>
                      Loading history…
                    </td>
                  </tr>
                )}
                {historyError && !historyFetching && (
                  <tr>
                    <td
                      colSpan={5}
                      style={{ padding: '18px', textAlign: 'center', color: 'var(--color-error, #ff5c8d)' }}
                    >
                      Failed to load history. Please try again.
                    </td>
                  </tr>
                )}
                {!historyFetching && !historyError && historyRows.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '18px', textAlign: 'center' }}>
                      No completed games found.
                    </td>
                  </tr>
                )}
                {!historyFetching &&
                  !historyError &&
                  historyRows.map((row) => {
                    const betAmount = row.betamount ? (Number(row.betamount) / 1000).toFixed(3) : null
                    const betAsset = row.betasset ? String(row.betasset).toUpperCase() : ''
                    const betDisplay = betAmount ? `${betAmount} ${betAsset}`.trim() : '—'

                    return (
                      <tr key={row.id}>
                        <td style={{ padding: '4px 6px', textAlign: 'left' }}>{row.name || `Game #${row.id}`}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'left' }}>{formatOpponent(row)}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'left' }}>{formatOutcome(row)}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'right' }}>{betDisplay}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'left' }}>{formatCompletedAt(row.indexer_ts)}</td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
     <Tabs
  tabs={[
    { id: 'leaderboard', label: 'Leaderboard' },
    { id: 'history', label: 'History' },
    { id: 'info', label: 'Game Info' },
  ]}
  activeTab={activeTab}
  onChange={setActiveTab}
/>
      {activeTab === 'leaderboard' && (
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
          {[
            { key: 'season', label: 'Current Season' },
            { key: 'all', label: 'All Time' },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className="tabs-button"
              style={{
                flex: '0 0 auto',
                padding: '6px 12px',
                border: '1px solid var(--color-primary-darkest)',
                background: leaderboardScope === key ? 'var(--color-primary-darker)' : 'transparent',
                color: leaderboardScope === key ? 'black' : 'var(--color-primary-lightest)',
                cursor: 'pointer',
                fontSize: 'var(--font-size-base)',
                letterSpacing: '0.04em',
              }}
              onClick={() => handleScopeChange(key)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {activeTab === 'info' ? infoTab : activeTab === 'history' ? historyTab : leaderboardTab}
      </div>
    </div>
  )
}
