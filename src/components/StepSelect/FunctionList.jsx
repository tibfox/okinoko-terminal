import { useMemo } from 'preact/hooks'
import ListButton from '../buttons/ListButton.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDice, faCirclePlay } from '@fortawesome/free-solid-svg-icons'

export default function FunctionList({ selectedContract, fnName, setFnName }) {
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
    fns.map((fn) => (
      <ListButton
        key={fn.name}
        onClick={() => setFnName(fn.name)}
        style={{
          backgroundColor:
            fnName === fn.name
              ? 'var(--color-primary-darker)'
              : 'transparent',
          color:
            fnName === fn.name
              ? 'black'
              : 'var(--color-primary-lighter)',
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
        }}
      >
        <FontAwesomeIcon
          icon={fn.parse == 'game' ? faDice : faCirclePlay}
          style={{ marginRight: '10px' }}
        />
        {fn.friendlyName}
      </ListButton>
    ))

  const allUngrouped = grouped.every((g) => !g.label)

  if (allUngrouped) {
    return (
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'flex-start',
          alignItems: 'flex-start',
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
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'flex-start',
              alignItems: 'flex-start',
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
