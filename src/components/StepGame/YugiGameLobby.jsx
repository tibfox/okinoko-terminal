import { useState, useMemo } from 'preact/hooks'
import NeonButtonSimple from '../buttons/NeonButtonSimple.jsx'
import NeonListDropdown from '../common/NeonListDropdown.jsx'
import { getCookie, setCookie } from '../../lib/cookies.js'
import { useIsMobile } from './lib/asciiGameEngine.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlay, faPaperPlane, faDice, faGavel, faCalendarPlus, faFilter, faChevronLeft } from '@fortawesome/free-solid-svg-icons'

// Dummy global leaderboard data
const DUMMY_LEADERBOARD = [
  { player: 'cryptoninja', highscore: 892, total_points: 14250, avg_points: 100.4, game_count: 142, status: 'active' },
  { player: 'pixelmaster', highscore: 1245, total_points: 12680, avg_points: 142.5, game_count: 89, status: 'active' },
  { player: 'arcadeking', highscore: 1567, total_points: 28420, avg_points: 140.0, game_count: 203, status: 'active' },
  { player: 'retrowave', highscore: 678, total_points: 7370, avg_points: 110.0, game_count: 67, status: 'closed' },
  { player: 'neonsamurai', highscore: 934, total_points: 15600, avg_points: 100.0, game_count: 156, status: 'active' },
  { player: 'bitrunner', highscore: 1823, total_points: 32760, avg_points: 140.0, game_count: 234, status: 'closed' },
  { player: 'glitchwave', highscore: 456, total_points: 5400, avg_points: 120.0, game_count: 45, status: 'active' },
  { player: 'synthknight', highscore: 1102, total_points: 21360, avg_points: 120.0, game_count: 178, status: 'active' },
]

// Dummy events leaderboard data (with event names)
const DUMMY_EVENTS = [
  { player: 'eventmaster', highscore: 1450, total_points: 8500, avg_points: 170.0, game_count: 50, status: 'active', event: 'Summer Championship' },
  { player: 'tourneyking', highscore: 1320, total_points: 7200, avg_points: 144.0, game_count: 50, status: 'active', event: 'Summer Championship' },
  { player: 'arcadeking', highscore: 1180, total_points: 6800, avg_points: 136.0, game_count: 50, status: 'active', event: 'Weekly Challenge #12' },
  { player: 'cryptoninja', highscore: 980, total_points: 5500, avg_points: 110.0, game_count: 50, status: 'closed', event: 'Spring Tournament' },
  { player: 'neonsamurai', highscore: 750, total_points: 4200, avg_points: 84.0, game_count: 50, status: 'closed', event: 'Weekly Challenge #11' },
]

// Dummy past seasons for global-closed
const DUMMY_PAST_SEASONS = [
  { key: 'season5', label: 'Season 5 (Dec 2024)' },
  { key: 'season4', label: 'Season 4 (Nov 2024)' },
  { key: 'season3', label: 'Season 3 (Oct 2024)' },
  { key: 'season2', label: 'Season 2 (Sep 2024)' },
  { key: 'season1', label: 'Season 1 (Aug 2024)' },
]

// Dummy active events
const DUMMY_ACTIVE_EVENTS_LIST = [
  { key: 'summer-championship', label: 'Summer Championship' },
  { key: 'weekly-12', label: 'Weekly Challenge #12' },
]

// Dummy closed events
const DUMMY_CLOSED_EVENTS_LIST = [
  { key: 'spring-tournament', label: 'Spring Tournament' },
  { key: 'weekly-11', label: 'Weekly Challenge #11' },
  { key: 'weekly-10', label: 'Weekly Challenge #10' },
  { key: 'winter-cup', label: 'Winter Cup 2024' },
  { key: 'weekly-9', label: 'Weekly Challenge #9' },
  { key: 'new-year-bash', label: 'New Year Bash' },
]

const LEADERBOARD_FIELD_MAP = {
  player: 'player',
  highscore: 'highscore',
  total: 'total_points',
  avg: 'avg_points',
  games: 'game_count',
}

const baseButtonStyle = (active = false) => ({
  backgroundColor: active ? 'var(--color-primary-darker)' : 'transparent',
  color: active ? 'black' : 'var(--color-primary-lighter)',
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
})

export default function YugiGameLobby({ gameTypeId, gameDescription, onPlayGame }) {
  const [leaderboardTab, setLeaderboardTab] = useState('global') // 'global' or 'events'
  const [leaderboardScope, setLeaderboardScope] = useState('season') // For global-active: 'season' or 'all'
  const [selectedPastSeason, setSelectedPastSeason] = useState('season5') // For global-closed
  const [selectedEvent, setSelectedEvent] = useState('') // For events tab
  const [statusFilter, setStatusFilter] = useState('active') // 'active' or 'closed'
  const [showFilterRow, setShowFilterRow] = useState(false)
  const [sortKey, setSortKey] = useState(() => getCookie('yugiLeaderboardSortKey') || 'highscore')
  const [sortDirection, setSortDirection] = useState(() => getCookie('yugiLeaderboardSortDir') || 'desc')
  const [mobileTab, setMobileTab] = useState('game') // 'game' or 'leaderboard'
  const [selectedGameMode, setSelectedGameMode] = useState('global-season') // 'global-season' or event key
  const isMobile = useIsMobile()

  // Game mode options for dropdown
  const gameModeOptions = [
    { key: 'global-season', label: 'Global Season' },
    ...DUMMY_ACTIVE_EVENTS_LIST,
  ]

  // Get the scope options based on current tab and filter
  const getScopeOptions = () => {
    if (leaderboardTab === 'global') {
      if (statusFilter === 'active') {
        return [
          { key: 'season', label: 'Current Season' },
          { key: 'all', label: 'All Time' },
        ]
      } else {
        // closed - show past seasons
        return DUMMY_PAST_SEASONS
      }
    } else {
      // events tab
      if (statusFilter === 'active') {
        return DUMMY_ACTIVE_EVENTS_LIST
      } else {
        return DUMMY_CLOSED_EVENTS_LIST
      }
    }
  }

  const scopeOptions = getScopeOptions()

  // Get the current selected scope value
  const getCurrentScopeValue = () => {
    if (leaderboardTab === 'global') {
      if (statusFilter === 'active') {
        return leaderboardScope
      } else {
        return selectedPastSeason
      }
    } else {
      return selectedEvent || (scopeOptions[0]?.key || '')
    }
  }

  const currentScopeValue = getCurrentScopeValue()

  // Handle scope selection change
  const handleScopeChange = (key) => {
    if (leaderboardTab === 'global') {
      if (statusFilter === 'active') {
        setLeaderboardScope(key)
      } else {
        setSelectedPastSeason(key)
      }
    } else {
      setSelectedEvent(key)
    }
  }

  // Dummy user stats
  const userStats = {
    gameTokens: 100,
    daysInSeason: '3 days 12 hours',
    seasonPot: '12.001 HIVE',
  }

  const handleSortChange = (nextKey) => {
    if (!LEADERBOARD_FIELD_MAP[nextKey]) return
    if (sortKey === nextKey) {
      const newDir = sortDirection === 'desc' ? 'asc' : 'desc'
      setSortDirection(newDir)
      setCookie('yugiLeaderboardSortDir', newDir, 30)
    } else {
      setSortKey(nextKey)
      setSortDirection('desc')
      setCookie('yugiLeaderboardSortKey', nextKey, 30)
      setCookie('yugiLeaderboardSortDir', 'desc', 30)
    }
  }

  const sortedRows = useMemo(() => {
    const field = LEADERBOARD_FIELD_MAP[sortKey] || 'total_points'
    const dataSource = leaderboardTab === 'events' ? DUMMY_EVENTS : DUMMY_LEADERBOARD
    // Filter by status
    const filtered = dataSource.filter((row) => row.status === statusFilter)
    // Sort
    const sorted = [...filtered]
    sorted.sort((a, b) => {
      const aVal = a[field]
      const bVal = b[field]
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
    return sorted
  }, [sortKey, sortDirection, leaderboardTab, statusFilter])

  const formatNumber = (value) => {
    if (value === null || value === undefined) return '–'
    const num = Number(value)
    if (Number.isNaN(num)) return '–'
    return num.toLocaleString()
  }

  const formatAvg = (value) => {
    if (value === null || value === undefined) return '–'
    const num = Number(value)
    if (Number.isNaN(num)) return '–'
    return num.toFixed(1)
  }

  const columnHeaders = [
    { key: 'player', label: 'Name', sortable: true, sortKey: 'player' },
    { key: 'highscore', label: 'Highscore', sortable: true, sortKey: 'highscore' },
    { key: 'total_points', label: 'Total Points', sortable: true, sortKey: 'total' },
    { key: 'avg_points', label: 'Avg. Points', sortable: true, sortKey: 'avg' },
    { key: 'game_count', label: 'Game Count', sortable: true, sortKey: 'games' },
  ]

  // Game section content (buttons + stats)
  const gameSection = (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '20px',
        padding: '10px 0',
        flex: isMobile ? 1 : undefined,
      }}
    >
      {/* Left column: Action buttons - uses flex-wrap for responsive layout */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: '1 1 300px', minWidth: isMobile ? '100px' : '200px' }}>
        {/* Play button row with dropdown */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <NeonButtonSimple onClick={onPlayGame} style={{ padding: '12px 1rem' }}>
            {isMobile ? <FontAwesomeIcon icon={faPlay} /> : 'Play Game'}
          </NeonButtonSimple>
          <NeonListDropdown
            options={gameModeOptions.map((opt) => ({ value: opt.key, label: opt.label }))}
            value={selectedGameMode}
            onChange={setSelectedGameMode}
            placeholder="Select game mode"
            style={{ flex: 1 }}
          />
        </div>
        {/* Other action buttons */}
        <div style={{ display: 'flex', flexWrap: isMobile ? 'nowrap' : 'wrap', gap: '10px', justifyContent: isMobile ? 'space-between' : undefined }}>
          <NeonButtonSimple onClick={() => {}} style={{ flex: isMobile ? '1' : '1 1 auto', minWidth: isMobile ? 'auto' : '100px', padding: isMobile ? '8px 12px' : '12px 1rem' }}>
            {isMobile ? <FontAwesomeIcon icon={faPaperPlane} /> : 'Send Token'}
          </NeonButtonSimple>
          <NeonButtonSimple onClick={() => {}} style={{ flex: isMobile ? '1' : '1 1 auto', minWidth: isMobile ? 'auto' : '100px', padding: isMobile ? '8px 12px' : '12px 1rem' }}>
            {isMobile ? <FontAwesomeIcon icon={faDice} /> : 'Claim Tokens'}
          </NeonButtonSimple>
          <NeonButtonSimple disabled onClick={() => {}} style={{ flex: isMobile ? '1' : undefined, width: isMobile ? 'auto' : '100%', padding: isMobile ? '8px 12px' : '12px 1rem' }}>
            {isMobile ? <FontAwesomeIcon icon={faGavel} /> : 'Execute Season'}
          </NeonButtonSimple>
          <NeonButtonSimple disabled onClick={() => {}} style={{ flex: isMobile ? '1' : undefined, width: isMobile ? 'auto' : '100%', padding: isMobile ? '8px 12px' : '12px 1rem' }}>
            {isMobile ? <FontAwesomeIcon icon={faCalendarPlus} /> : 'Host Event'}
          </NeonButtonSimple>
        </div>
      </div>

      {/* Right column: User stats table */}
      <div
        style={{
          border: '1px solid var(--color-primary-darkest)',
          padding: '10px',
          background: 'rgba(0, 0, 0, 0.3)',
          flex: '1 1 250px',
          minWidth: '200px',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ padding: '6px 0', color: 'var(--color-primary-lighter)' }}>Your tokens:</td>
              <td style={{ padding: '6px 0', textAlign: 'right', color: 'var(--color-primary-lightest)', fontSize: '5rem' }}>
                {userStats.gameTokens}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '6px 0', color: 'var(--color-primary-lighter)' }}>Days in season:</td>
              <td style={{ padding: '6px 0', textAlign: 'right', color: 'var(--color-primary-lightest)' }}>
                {userStats.daysInSeason}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '6px 0', color: 'var(--color-primary-lighter)' }}>Season pot:</td>
              <td style={{ padding: '6px 0', textAlign: 'right', color: 'var(--color-primary-lightest)' }}>
                {userStats.seasonPot}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )

  // Leaderboard section content
  const leaderboardSection = (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Global / Events tabs */}
      {!isMobile && (
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
          {[
            { key: 'global', label: 'Global' },
            { key: 'events', label: 'Events' },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className="tabs-button"
              style={{
                flex: '0 0 auto',
                padding: '6px 12px',
                border: '1px solid var(--color-primary-darkest)',
                background: leaderboardTab === key ? 'var(--color-primary-darker)' : 'transparent',
                color: leaderboardTab === key ? 'black' : 'var(--color-primary-lightest)',
                cursor: 'pointer',
                fontSize: 'var(--font-size-base)',
                letterSpacing: '0.04em',
              }}
              onClick={() => setLeaderboardTab(key)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Filter row with funnel icon */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={() => setShowFilterRow(!showFilterRow)}
          style={baseButtonStyle(showFilterRow)}
          title="Toggle filters"
        >
          <FontAwesomeIcon icon={showFilterRow ? faChevronLeft : faFilter} style={{ fontSize: '0.9rem' }} />
        </button>
        {showFilterRow && (
          <>
            {['active', 'closed'].map((tab) => (
              <button
                key={`status-${tab}`}
                onClick={() => setStatusFilter(tab)}
                style={baseButtonStyle(statusFilter === tab)}
              >
                {tab === 'active' ? 'Active' : 'Closed'}
              </button>
            ))}
          </>
        )}
        {/* Dynamic scope buttons based on tab and filter - horizontal scroll */}
        <div
          className="neon-scroll"
          style={{
            display: 'flex',
            gap: '6px',
            marginLeft: 'auto',
            overflowX: 'auto',
            overflowY: 'hidden',
            flexShrink: 1,
            minWidth: 0,
            maxWidth: '100%',
            paddingBottom: '14px',
          }}
        >
          {scopeOptions.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className="tabs-button"
              style={{
                flex: '0 0 auto',
                padding: '6px 12px',
                border: '1px solid var(--color-primary-darkest)',
                background: currentScopeValue === key ? 'var(--color-primary-darker)' : 'transparent',
                color: currentScopeValue === key ? 'black' : 'var(--color-primary-lightest)',
                cursor: 'pointer',
                fontSize: 'var(--font-size-base)',
                letterSpacing: '0.04em',
                whiteSpace: 'nowrap',
              }}
              onClick={() => handleScopeChange(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div class="game-selection-table" style={{ flex: 1, display: 'flex', flexDirection: 'column', maxHeight: 'none' }}>
          <div class="game-table-wrapper" style={{ flex: 1 }}>
            <table style={{ width: '100%', tableLayout: 'auto', minWidth: '400px' }}>
              <thead style={{ background: 'var(--color-primary-darkest)' }}>
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
                          fontSize: isMobile ? '0.95rem' : undefined,
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
                {sortedRows.map((row) => (
                  <tr key={row.player}>
                    <td style={{ padding: '4px 6px', textAlign: 'left' }}>{row.player}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right' }}>{formatNumber(row.highscore)}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right' }}>{formatNumber(row.total_points)}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right' }}>{formatAvg(row.avg_points)}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right' }}>{formatNumber(row.game_count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )

  // Mobile layout with tabs
  if (isMobile) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Mobile tabs: Game / Global / Events */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
          {[
            { key: 'game', label: 'Game' },
            { key: 'global', label: 'Global' },
            { key: 'events', label: 'Events' },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className="tabs-button"
              style={{
                flex: 1,
                padding: '10px 12px',
                border: '1px solid var(--color-primary-darkest)',
                background: (key === 'game' ? mobileTab === 'game' : (mobileTab === 'leaderboard' && leaderboardTab === key)) ? 'var(--color-primary-darker)' : 'transparent',
                color: (key === 'game' ? mobileTab === 'game' : (mobileTab === 'leaderboard' && leaderboardTab === key)) ? 'black' : 'var(--color-primary-lightest)',
                cursor: 'pointer',
                fontSize: 'var(--font-size-base)',
                letterSpacing: '0.04em',
              }}
              onClick={() => {
                if (key === 'game') {
                  setMobileTab('game')
                } else {
                  setMobileTab('leaderboard')
                  setLeaderboardTab(key)
                }
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {mobileTab === 'game' ? gameSection : leaderboardSection}
        </div>
      </div>
    )
  }

  // Desktop layout - show both sections
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
      {gameSection}
      {leaderboardSection}
    </div>
  )
}
