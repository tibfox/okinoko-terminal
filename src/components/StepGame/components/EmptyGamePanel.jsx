import { useMemo, useState } from 'preact/hooks'
import { useQuery } from '@urql/preact'
import {
  PLAYER_LEADERBOARD_QUERY,
  PLAYER_LEADERBOARD_SEASON_QUERY,
} from '../../../data/inarow_gql.js'
import { GAME_TYPE_OPTIONS } from '../gameTypes.js'

const DEFAULT_LEADERBOARD_GAME_TYPE = GAME_TYPE_OPTIONS[0]?.id ?? 1

const LEADERBOARD_FIELD_MAP = {
  ratio: 'win_ratio',
  wins: 'wins',
  games: 'games_played',
  draws: 'draws',
  losses: 'losses',
  active: 'active_games',
}

export default function EmptyGamePanel({ defaultGameTypeId }) {
  const [activeTab, setActiveTab] = useState('info')
  const [leaderboardScope, setLeaderboardScope] = useState('all')
  const [sortKey, setSortKey] = useState('ratio')
  const [sortDirection, setSortDirection] = useState('desc')
  const selectedType = defaultGameTypeId ?? DEFAULT_LEADERBOARD_GAME_TYPE

  const orderBy = useMemo(() => {
    const field = LEADERBOARD_FIELD_MAP[sortKey] || 'win_ratio'
    const primaryDirection =
      field === 'win_ratio'
        ? sortDirection === 'asc'
          ? 'asc_nulls_last'
          : 'desc_nulls_last'
        : sortDirection
    const base = [{ [field]: primaryDirection }]
    if (field !== 'win_ratio') {
      base.push({ win_ratio: 'desc_nulls_last' })
    }
    base.push({ wins: 'desc' }, { games_played: 'desc' })
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

  const rows =
    data?.okinoko_iarv2_player_stats_by_type ??
    data?.okinoko_iarv2_player_stats_by_type_current_season ??
    []

  const handleSortChange = (nextKey) => {
    if (!LEADERBOARD_FIELD_MAP[nextKey]) return
    if (sortKey === nextKey) {
      setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortKey(nextKey)
      setSortDirection('desc')
    }
  }

  const columnHeaders = [
    { key: 'player', label: 'Player', sortable: false },
    { key: 'win_ratio', label: 'Win Ratio', sortable: true, sortKey: 'ratio' },
    { key: 'wins', label: 'Wins', sortable: true, sortKey: 'wins' },
    { key: 'games_played', label: 'Joined', sortable: true, sortKey: 'games' },
    { key: 'active_games', label: 'Active', sortable: true, sortKey: 'active' },
    { key: 'draws', label: 'Draws', sortable: true, sortKey: 'draws' },
    { key: 'losses', label: 'Losses', sortable: true, sortKey: 'losses' },
  ]

  const formatRatio = (value) => {
    if (value === null || value === undefined) return '–'
    const num = Number(value)
    if (Number.isNaN(num)) return '–'
    return `${(num * 100).toFixed(1)}%`
  }

  const tabButtonStyle = (active) => ({
    flex: 1,
    padding: '10px 12px',
    background: active ? 'var(--color-primary-darkest)' : 'transparent',
    color: active ? 'var(--color-primary-lightest)' : 'var(--color-primary-lighter)',
    border: '1px solid var(--color-primary-darkest)',
    cursor: 'pointer',
    textTransform: 'uppercase',
    fontSize: '0.85rem',
    letterSpacing: '0.05em',
  })

  const infoTab = (
    <div>
      <h2>Welcome to the Game Arena</h2>
      <p>
        No game selected yet — this is your staging area. From here, you can choose to <b>Create</b> a
        new game, <b>Join</b> a game someone else started, or <b>Continue</b> a game you're already
        part of. Pick an option to get started and dive into a match.
      </p>
      <div style={{ marginTop: '40px' }}>
        <h4>First Move Payment (FMP)</h4>
        <p>
          Some game creators enable a feature called <b>First Move Payment</b>. If it's available, you can
          choose to pay a small extra amount to secure the first turn. Why? Because in many strategy games,
          going first offers a small tactical advantage. If you don't want it, leave it off and join the
          game normally — it's completely optional.
        </p>
      </div>
      <div style={{ marginTop: '40px' }}>
        <h4>Enjoy your gaming!</h4>
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
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px', fontSize: '0.85rem' }}>
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
                        padding: '8px 10px',
                        cursor: col.sortable ? 'pointer' : 'default',
                        color: isActiveSort ? 'var(--color-primary-lightest)' : 'var(--color-primary-lighter)',
                        borderBottom: '1px solid var(--color-primary-darkest)',
                        whiteSpace: 'nowrap',
                        fontSize: '0.8rem',
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
                    <td style={{ padding: '8px 10px', textAlign: 'left' }}>{row.player?.replace('hive:', '') ?? '—'}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>{formatRatio(row.win_ratio)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>{Number(row.wins ?? 0)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>{Number(row.games_played ?? 0)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>{Number(row.active_games ?? 0)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>{Number(row.draws ?? 0)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>{Number(row.losses ?? 0)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button type="button" style={tabButtonStyle(activeTab === 'info')} onClick={() => setActiveTab('info')}>
          Game Info
        </button>
        <button
          type="button"
          style={tabButtonStyle(activeTab === 'leaderboard')}
          onClick={() => setActiveTab('leaderboard')}
        >
          Leaderboard
        </button>
      </div>
      {activeTab === 'leaderboard' && (
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
          {[
            { key: 'season', label: 'Current Season' },
            { key: 'all', label: 'All Time' },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              style={{
                flex: '0 0 auto',
                padding: '6px 12px',
                border: '1px solid var(--color-primary-darkest)',
                background: leaderboardScope === key ? 'var(--color-primary-darkest)' : 'transparent',
                color: 'var(--color-primary-lightest)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                letterSpacing: '0.04em',
              }}
              onClick={() => setLeaderboardScope(key)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {activeTab === 'info' ? infoTab : leaderboardTab}
      </div>
    </div>
  )
}
