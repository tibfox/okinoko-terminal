import { useContext } from 'preact/hooks'
import { PopupContext } from '../../popup/context.js'

const defaultMessage = [
  '@tibfox does not endorse gambling.',
  'Bets are optional, can cost real money, and gambling can become addictive—only stake what you can lose.',
].join(' ')

export default function GamblingInfoIcon({ message = defaultMessage, size = 18, style }) {
  const popup = useContext(PopupContext)

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        popup?.openPopup?.({
          title: 'Responsible Play',
          body: () => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ lineHeight: 1.4, color: 'var(--color-primary-lighter, #9be8ff)' }}>{message}</p>
            </div>
          ),
        })
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: '6px',
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        ...(style || {}),
      }}
      aria-label="Responsible gambling info"
    >
      <span
        style={{
          width: size,
          height: size,
          minWidth: size,
          minHeight: size,
          borderRadius: '50%',
          border: '1px solid var(--color-primary-lighter, #00f5ff)',
          background: 'transparent',
          color: 'var(--color-primary-lighter, #00f5ff)',
          fontSize: size * 0.7,
          lineHeight: 1,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        i
      </span>
    </button>
  )
}
