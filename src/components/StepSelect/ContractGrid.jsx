import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faFileContract,
  faHandshake,
  faGamepad,
  faTicket,
  faPeopleGroup,
  faDharmachakra
} from '@fortawesome/free-solid-svg-icons'

// Icon mapping: string name to FontAwesome icon object
const iconMap = {
  faFileContract,
  faHandshake,
  faGamepad,
  faTicket,
  faPeopleGroup,
  faDharmachakra
}

/**
 * Get the icon for a contract, falling back to default if not found
 */
const getContractIcon = (iconName) => {
  return iconMap[iconName] || faFileContract
}

/**
 * ContractGrid
 * --------------
 * Displays all available contracts in a grid layout for desktop.
 */
export default function ContractGrid({
  contracts,
  contractId,
  setContractId,
  setFnName,
}) {
  return (
    <div
      className="neon-scroll"
      style={{
        overflowY: 'auto',
        height: '100%',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
          gap: '12px',
          margin: 'auto 0',
        }}
      >
      {contracts.map((c) => {
        const isSelected = contractId === c.vscId
        return (
          <button
            key={c.vscId}
            onClick={() => {
              setContractId(c.vscId)
              setFnName('')
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '20px 16px',
              backgroundColor: isSelected
                ? 'var(--color-primary-darker)'
                : 'rgba(0, 0, 0, 0.7)',
              color: isSelected ? 'black' : 'var(--color-primary-lighter)',
              border: isSelected
                ? '2px solid var(--color-primary)'
                : '1px solid var(--color-primary-darkest)',
              cursor: 'pointer',
              textTransform: 'uppercase',
              fontSize: 'var(--font-size-base)',
              letterSpacing: '0.05em',
              fontWeight: isSelected ? 700 : 400,
              transition: 'all 0.15s ease',
              minHeight: '120px',
              maxHeight: '160px',
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.8)'
                e.currentTarget.style.borderColor = 'var(--color-primary)'
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'
                e.currentTarget.style.borderColor = 'var(--color-primary-darkest)'
              }
            }}
          >
            {c.kanji ? (
              <span
                style={{
                  fontFamily: '"DotGothic16", sans-serif',
                  fontSize: c.kanji.length > 1 ? '1.25rem' : '1.5rem',
                  lineHeight: 1,
                  color: isSelected ? 'black' : 'var(--color-primary)',
                }}
              >
                {c.kanji}
              </span>
            ) : (
              <FontAwesomeIcon
                icon={getContractIcon(c.icon)}
                style={{
                  fontSize: '1.35rem',
                  color: isSelected ? 'black' : 'var(--color-primary)',
                }}
              />
            )}
            <span style={{ textAlign: 'center', lineHeight: 1.3 }}>
              {c.name}
            </span>
          </button>
        )
      })}
      </div>
    </div>
  )
}
