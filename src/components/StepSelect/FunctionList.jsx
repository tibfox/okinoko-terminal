import { useMemo } from 'preact/hooks'
import { useQuery, gql } from '@urql/preact'
import ListButton from '../buttons/ListButton.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDice, faCirclePlay, faUser, faStore, faHourglassHalf } from '@fortawesome/free-solid-svg-icons'
import { useAioha } from '@aioha/react-ui'
import { deriveGameTypeId } from '../StepGame/gameTypes.js'
import { playBeep } from '../../lib/beep.js'
import { useDeviceBreakpoint } from '../../hooks/useDeviceBreakpoint.js'

// Game-specific button component with stats
const GameListButton = ({ children, onClick, isActive, beep = true, isMobile = false, style = {}, ...props }) => {
  const handleClick = (e) => {
    if (beep) {
      playBeep(500, 25, 'square')
    }
    if (onClick) onClick(e)
  }

  return (
    <button
      className="neon-list-btn"
      onClick={handleClick}
      style={{
        backgroundColor: isActive ? 'var(--color-primary-darker)' : 'transparent',
        color: isActive ? 'black' : 'var(--color-primary-lighter)',
        textAlign: 'left',
        padding: isMobile ? '0.25em 0.25em' : '0.5em',
        display: 'flex',
        flexDirection: 'column',
        flex: '0 0 auto',
        width: 'auto',
        height: 'auto',
        alignItems: 'flex-start',
        justifyContent: 'space-evenly',
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  )
}

const GAME_COUNTS_QUERY = gql`
  query GameCounts($gameType: numeric!, $user: String!) {
    lobby: okinoko_iarv2_waiting_for_join_aggregate(
      where: {
        type: { _eq: $gameType }
        creator: { _neq: $user }
      }
    ) {
      aggregate {
        count
      }
    }
    active: okinoko_iarv2_active_with_turn_aggregate(
      where: {
        type: { _eq: $gameType }
        _or: [{ creator: { _eq: $user } }, { joiner: { _eq: $user } }]
      }
    ) {
      aggregate {
        count
      }
    }
    myTurn: okinoko_iarv2_active_with_turn_aggregate(
      where: {
        type: { _eq: $gameType }
        next_turn_player: { _eq: $user }
        joiner: { _is_null: false }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

export default function FunctionList({ selectedContract, fnName, setFnName }) {
  const { user } = useAioha()
  const isMobile = useDeviceBreakpoint()
  const normalizedUser = useMemo(() => {
    const u = (user || '').replace(/^hive:/i, '').toLowerCase()
    return u ? `hive:${u}` : ''
  }, [user])
  const grouped = useMemo(() => {
    const fns = selectedContract?.functions || []
    const groups = []
    fns.forEach((fn) => {
      const key = (fn.groupHeader || '').trim()
      let group = groups.find((g) => g.key === key)
      if (!group) {
        group = { key, label: key || null, items: [] }
        groups.push(group)
      }
      group.items.push(fn)
    })
    return groups
  }, [selectedContract])

  const renderButtons = (fns) =>
    fns.map((fn) => {
      const isGame = fn.parse === 'game'
      const gameTypeId = isGame ? deriveGameTypeId(fn.name) : null

      return (
        <GameButton
          key={fn.name}
          fn={fn}
          fnName={fnName}
          setFnName={setFnName}
          gameTypeId={gameTypeId}
          user={normalizedUser}
        />
      )
    })

  const allUngrouped = grouped.every((g) => !g.label)

  if (allUngrouped) {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '10px',
        }}
      >
        {renderButtons(grouped.flatMap((g) => g.items))}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {grouped.map((group) => (
        <div key={group.key || 'default'}>
          {group.label && (
            <div
              style={{
                marginBottom: '6px',
                color: 'var(--color-primary-lighter)',
                // fontWeight: '700',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {group.label}
            </div>
          )}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '10px',
            }}
          >
            {renderButtons(group.items)}
          </div>
        </div>
      ))}
    </div>
  )
}

function GameButton({ fn, fnName, setFnName, gameTypeId, user }) {
  const isGame = fn.parse === 'game'
  const isActive = fnName === fn.name
  const isMobile = useDeviceBreakpoint()

  const [{ data }] = useQuery({
    query: GAME_COUNTS_QUERY,
    variables: gameTypeId && user ? { gameType: gameTypeId.toString(), user } : undefined,
    pause: !isGame || !gameTypeId || !user,
    requestPolicy: 'cache-and-network',
  })

  const lobbyCount = data?.lobby?.aggregate?.count ?? 0
  const activeCount = data?.active?.aggregate?.count ?? 0
  const myTurnCount = data?.myTurn?.aggregate?.count ?? 0

  // Use the custom GameListButton for games, regular ListButton for others
  const ButtonComponent = isGame ? GameListButton : ListButton

  return (
    <ButtonComponent
      onClick={() => setFnName(fn.name)}
      isActive={isActive}
      isMobile={isMobile}
      style={!isGame ? {
        backgroundColor: isActive ? 'var(--color-primary-darker)' : 'transparent',
        color: isActive ? 'black' : 'var(--color-primary-lighter)',
        textAlign: 'left',
        whiteSpace: 'nowrap',
        padding: '0.5em 1em',
        cursor: 'pointer',
        display: 'inline-flex',
        flex: '0 0 auto',
        width: 'auto',
        alignItems: 'center',
        textTransform: 'uppercase',
        fontSize: '0.85rem',
        letterSpacing: '0.05em',
      } : undefined}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: isGame && isMobile ? '4px' : '8px',
        fontSize: isGame && isMobile ? '0.75rem' : undefined,
      }}>
        <FontAwesomeIcon
          icon={isGame ? faDice : faCirclePlay}
          style={{
            marginRight: isGame && isMobile ? '0' : '2px',
            fontSize: isGame && isMobile ? '0.75rem' : undefined,
          }}
        />
        {fn.friendlyName}
      </div>
      {isGame && myTurnCount > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '0.72rem',
          opacity: 0.85,
          textTransform: 'lowercase',
          letterSpacing: '0.02em',
          color: isActive ? 'inherit' : 'var(--color-primary)',
          fontWeight: '600',
        }}>
          <FontAwesomeIcon icon={faHourglassHalf} style={{ fontSize: '0.65rem' }} />
          your turn: {myTurnCount}
        </div>
      )}
      {isGame && (
        <div style={{
          display: 'flex',
          gap: '12px',
          fontSize: '0.72rem',
          opacity: 0.85,
          textTransform: 'lowercase',
          letterSpacing: '0.02em',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <FontAwesomeIcon icon={faUser} style={{ fontSize: '0.65rem' }} />
            {activeCount} active
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <FontAwesomeIcon icon={faStore} style={{ fontSize: '0.65rem' }} />
            {lobbyCount} lobby
          </span>
        </div>
      )}
    </ButtonComponent>
  )
}
