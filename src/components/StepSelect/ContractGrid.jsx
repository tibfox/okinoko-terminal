import { useContext } from 'preact/hooks'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faFileContract,
  faHandshake,
  faGamepad,
  faTicket,
  faPeopleGroup,
  faDharmachakra,
  faCoins,
  faRocket
} from '@fortawesome/free-solid-svg-icons'
import { useAioha } from '@aioha/react-ui'
import { PopupContext } from '../../popup/context.js'
import ContractDeployPopup from '../terminal/SubTerminals/ContractDeployPopup.jsx'

const IS_DEV = import.meta.env.DEV

// Icon mapping: string name to FontAwesome icon object
const iconMap = {
  faFileContract,
  faHandshake,
  faGamepad,
  faTicket,
  faPeopleGroup,
  faDharmachakra,
  faCoins
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
  const { aioha, user } = useAioha()
  const { openPopup, closePopup } = useContext(PopupContext)

  const handleDeployClick = () => {
    if (!user) {
      alert('Please connect your wallet first')
      return
    }
    // Capture values in closure to prevent re-render issues
    const capturedAioha = aioha
    const capturedUser = user
    const deployState = { isProcessing: false }
    openPopup({
      title: 'Deploy Contract',
      body: () => (
        <ContractDeployPopup
          onClose={closePopup}
          aioha={capturedAioha}
          user={capturedUser}
          onProcessingChange={(processing) => { deployState.isProcessing = processing }}
        />
      ),
      width: '40vw',
      confirmClose: () => deployState.isProcessing
        ? 'Deployment is in progress. Are you sure you want to close?'
        : false,
    })
  }

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

      {/* Deploy Button - only shown in dev mode */}
      {IS_DEV && (
        <button
          onClick={handleDeployClick}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '20px 16px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'var(--color-primary-lighter)',
            border: '1px solid var(--color-primary-darkest)',
            cursor: 'pointer',
            textTransform: 'uppercase',
            fontSize: 'var(--font-size-base)',
            letterSpacing: '0.05em',
            fontWeight: 400,
            transition: 'all 0.15s ease',
            minHeight: '120px',
            maxHeight: '160px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.8)'
            e.currentTarget.style.borderColor = 'var(--color-primary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'
            e.currentTarget.style.borderColor = 'var(--color-primary-darkest)'
          }}
        >
          <FontAwesomeIcon
            icon={faRocket}
            style={{
              fontSize: '1.35rem',
              color: 'var(--color-primary)',
            }}
          />
          <span style={{ textAlign: 'center', lineHeight: 1.3 }}>
            Deploy
          </span>
        </button>
      )}
      </div>
    </div>
  )
}
